-- HOTFIX-158.6: 정기구독 수명주기(정책 문구와 코드 일치) — 셀프 해지(기간 만료 시 종료), 등급 변경은 다음 결제일부터,
-- 월 자동 청구 + 실패 재시도(1일/3일/5일 뒤 3회), 동의하지 않은 요금 인상 차단(동의 가격 agreed_price).
-- 모든 쓰기는 SECURITY DEFINER + 서버 전용 비밀(toss_check_secret) — 기존 EPIC-158 패턴과 같다.
-- 롤백: 새 함수 5개 drop + 새 컬럼 4개 drop + toss_save_billing/toss_record_charge를
-- docs/sql/EPIC-158-membership-tiers.sql 원본으로 되돌린다.

alter table member_billing add column if not exists cancel_at_period_end boolean not null default false;
alter table member_billing add column if not exists pending_tier_rank integer;
alter table member_billing add column if not exists agreed_price integer;
alter table member_billing add column if not exists pending_agreed_price integer;
alter table member_billing drop constraint if exists member_billing_pending_tier_check;
alter table member_billing add constraint member_billing_pending_tier_check
  check (pending_tier_rank is null or (pending_tier_rank > 0 and pending_tier_rank < 99));
grant select (cancel_at_period_end, pending_tier_rank, agreed_price, pending_agreed_price) on member_billing to authenticated;

-- 카드 (재)등록: 해지 예약/등급 변경 예약 초기화.
create or replace function toss_save_billing(
  p_secret text, p_member_id uuid, p_customer_key text, p_billing_key text,
  p_card_company text, p_card_number text, p_tier_rank integer
) returns void language plpgsql security definer set search_path = public as $$
begin
  if not toss_check_secret(p_secret) then raise exception 'forbidden' using errcode = '42501'; end if;
  insert into member_billing (member_id, customer_key, toss_billing_key, card_company, card_number_masked,
    tier_rank, status, next_billing_date, failed_count, last_failure_reason)
  values (p_member_id, p_customer_key, p_billing_key, p_card_company, p_card_number,
    p_tier_rank, 'active', current_date, 0, null)
  on conflict (member_id) do update set
    customer_key = excluded.customer_key, toss_billing_key = excluded.toss_billing_key,
    card_company = excluded.card_company, card_number_masked = excluded.card_number_masked,
    tier_rank = excluded.tier_rank,
    status = 'active', next_billing_date = current_date, failed_count = 0, last_failure_reason = null,
    cancel_at_period_end = false, pending_tier_rank = null, pending_agreed_price = null,
    updated_at = now();
end $$;

-- 첫 결제 결과 기록: 성공 시 동의 가격 저장. (첫 결제 실패는 재시도 없이 일시 중지 — 기존 동작 유지)
create or replace function toss_record_charge(
  p_secret text, p_member_id uuid, p_ok boolean, p_amount integer, p_order_id text,
  p_payment_key text, p_failure_reason text, p_point_pct numeric
) returns void language plpgsql security definer set search_path = public as $$
declare v_billing_id uuid; v_tier integer; v_points integer;
begin
  if not toss_check_secret(p_secret) then raise exception 'forbidden' using errcode = '42501'; end if;
  select id, tier_rank into v_billing_id, v_tier from member_billing where member_id = p_member_id;
  if v_billing_id is null then raise exception 'billing not found'; end if;
  if p_ok then
    update member_billing set last_billed_at = now(), next_billing_date = current_date + interval '1 month',
      status = 'active', failed_count = 0, last_failure_reason = null, agreed_price = p_amount,
      cancel_at_period_end = false, pending_tier_rank = null, pending_agreed_price = null,
      last_order_id = p_order_id, last_payment_key = p_payment_key, updated_at = now()
    where id = v_billing_id;
    perform set_config('silo.trusted_write', 'on', true);
    update members set membership_rank = v_tier where id = p_member_id and membership_rank < v_tier;
    v_points := floor(p_amount * coalesce(p_point_pct, 0) / 100.0);
    if v_points > 0 then
      insert into points_ledger (member_id, reason, points, related_id)
      values (p_member_id, 'membership_subscription', v_points, v_billing_id);
    end if;
  else
    update member_billing set status = 'suspended', failed_count = failed_count + 1,
      last_failure_reason = left(coalesce(p_failure_reason, 'unknown'), 500), updated_at = now()
    where id = v_billing_id;
  end if;
end $$;

-- 해지 예약/철회: 구독 중(active)일 때만. 해지 예약 시 등급 변경 예약은 지운다. 반환 = 바뀐 행 수.
create or replace function toss_request_cancel(p_secret text, p_member_id uuid, p_cancel boolean)
returns integer language plpgsql security definer set search_path = public as $$
declare v_n integer;
begin
  if not toss_check_secret(p_secret) then raise exception 'forbidden' using errcode = '42501'; end if;
  update member_billing set cancel_at_period_end = p_cancel,
    pending_tier_rank = case when p_cancel then null else pending_tier_rank end,
    pending_agreed_price = case when p_cancel then null else pending_agreed_price end,
    updated_at = now()
  where member_id = p_member_id and status = 'active';
  get diagnostics v_n = row_count;
  return v_n;
end $$;

-- 등급 변경 예약(다음 결제일부터 적용). 현재 구독 등급과 같으면 예약 해제. 반환 = 바뀐 행 수.
create or replace function toss_set_pending_tier(p_secret text, p_member_id uuid, p_tier integer, p_price integer)
returns integer language plpgsql security definer set search_path = public as $$
declare v_n integer;
begin
  if not toss_check_secret(p_secret) then raise exception 'forbidden' using errcode = '42501'; end if;
  update member_billing set
    pending_tier_rank = case when p_tier = tier_rank then null else p_tier end,
    pending_agreed_price = case when p_tier = tier_rank then null else p_price end,
    updated_at = now()
  where member_id = p_member_id and status = 'active' and cancel_at_period_end = false;
  get diagnostics v_n = row_count;
  return v_n;
end $$;

-- 크론: 오늘 청구해야 하는 구독(빌링키 포함 — 서버 전용).
create or replace function toss_due_billings(p_secret text)
returns table (member_id uuid, customer_key text, toss_billing_key text, tier_rank integer, pending_tier_rank integer,
  agreed_price integer, pending_agreed_price integer, failed_count integer, member_name text)
language plpgsql security definer set search_path = public as $$
begin
  if not toss_check_secret(p_secret) then raise exception 'forbidden' using errcode = '42501'; end if;
  return query
    select b.member_id, b.customer_key, b.toss_billing_key, b.tier_rank, b.pending_tier_rank,
           b.agreed_price, b.pending_agreed_price, b.failed_count, m.name
    from member_billing b join members m on m.id = b.member_id
    where b.status = 'active' and b.cancel_at_period_end = false and b.next_billing_date <= current_date;
end $$;

-- 크론: 기간이 끝난 해지 예약을 확정(구독 종료 + 기본 등급 전환 — 구독 등급을 그대로 쓰던 회원만). 반환 = 처리 수.
create or replace function toss_finalize_cancellations(p_secret text)
returns integer language plpgsql security definer set search_path = public as $$
declare v_n integer := 0; r record;
begin
  if not toss_check_secret(p_secret) then raise exception 'forbidden' using errcode = '42501'; end if;
  perform set_config('silo.trusted_write', 'on', true);
  for r in select id, member_id, tier_rank from member_billing
           where status = 'active' and cancel_at_period_end = true and next_billing_date <= current_date loop
    update member_billing set status = 'canceled', updated_at = now() where id = r.id;
    update members set membership_rank = 0 where id = r.member_id and membership_rank = r.tier_rank;
    v_n := v_n + 1;
  end loop;
  return v_n;
end $$;

-- 크론: 월 자동 청구 결과 기록. 성공 = 등급/동의 가격 갱신 + 다음 달. 실패 = 재시도(1일/3일/5일 뒤 총 3회), 4번째 실패에서 일시 중지.
create or replace function toss_record_recurring(
  p_secret text, p_member_id uuid, p_ok boolean, p_amount integer, p_tier_rank integer,
  p_order_id text, p_payment_key text, p_failure_reason text, p_point_pct numeric
) returns void language plpgsql security definer set search_path = public as $$
declare v_id uuid; v_old_tier integer; v_failed integer; v_points integer;
begin
  if not toss_check_secret(p_secret) then raise exception 'forbidden' using errcode = '42501'; end if;
  select id, tier_rank, failed_count into v_id, v_old_tier, v_failed from member_billing where member_id = p_member_id;
  if v_id is null then raise exception 'billing not found'; end if;
  perform set_config('silo.trusted_write', 'on', true);
  if p_ok then
    update member_billing set tier_rank = p_tier_rank, pending_tier_rank = null, pending_agreed_price = null,
      agreed_price = p_amount, last_billed_at = now(), next_billing_date = current_date + interval '1 month',
      status = 'active', failed_count = 0, last_failure_reason = null,
      last_order_id = p_order_id, last_payment_key = p_payment_key, updated_at = now()
    where id = v_id;
    -- 등급 변경(업/다운) 반영. Artist(99)는 건드리지 않는다.
    update members set membership_rank = p_tier_rank where id = p_member_id and membership_rank < 99;
    v_points := floor(p_amount * coalesce(p_point_pct, 0) / 100.0);
    if v_points > 0 then
      insert into points_ledger (member_id, reason, points, related_id)
      values (p_member_id, 'membership_subscription', v_points, v_id);
    end if;
  else
    v_failed := v_failed + 1;
    if v_failed >= 4 then
      update member_billing set status = 'suspended', failed_count = v_failed,
        last_failure_reason = left(coalesce(p_failure_reason, 'unknown'), 500), updated_at = now()
      where id = v_id;
      update members set membership_rank = 0 where id = p_member_id and membership_rank = v_old_tier;
    else
      update member_billing set failed_count = v_failed,
        next_billing_date = current_date + (case v_failed when 1 then 1 else 2 end),
        last_failure_reason = left(coalesce(p_failure_reason, 'unknown'), 500), updated_at = now()
      where id = v_id;
    end if;
  end if;
end $$;

grant execute on function toss_save_billing(text, uuid, text, text, text, text, integer) to anon, authenticated;
grant execute on function toss_record_charge(text, uuid, boolean, integer, text, text, text, numeric) to anon, authenticated;
grant execute on function toss_request_cancel(text, uuid, boolean) to anon, authenticated;
grant execute on function toss_set_pending_tier(text, uuid, integer, integer) to anon, authenticated;
grant execute on function toss_due_billings(text) to anon, authenticated;
grant execute on function toss_finalize_cancellations(text) to anon, authenticated;
grant execute on function toss_record_recurring(text, uuid, boolean, integer, integer, text, text, text, numeric) to anon, authenticated;
