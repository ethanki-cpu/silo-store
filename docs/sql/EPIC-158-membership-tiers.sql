-- EPIC-158 후속: 유료 멤버십 전 등급(Alice/Great Gatsby/Patron/Lautrec)을 토스페이먼츠 정기결제로.
-- member_billing에 구독 등급(tier_rank)을 추가하고, 빌링 저장/결제 기록 RPC가 그 등급으로 승급하게 일반화한다.
-- (Patron 전용 3 고정이던 함수를 교체 — 기존 시그니처는 drop)

alter table member_billing add column if not exists tier_rank integer not null default 3;
alter table member_billing drop constraint if exists member_billing_tier_rank_check;
alter table member_billing add constraint member_billing_tier_rank_check check (tier_rank > 0 and tier_rank < 99);
grant select (tier_rank) on member_billing to authenticated;

drop function if exists toss_save_billing(text, uuid, text, text, text, text);
drop function if exists toss_record_charge(text, uuid, boolean, integer, text, text, text, numeric);

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
    updated_at = now();
end $$;

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
      status = 'active', failed_count = 0, last_failure_reason = null,
      last_order_id = p_order_id, last_payment_key = p_payment_key, updated_at = now()
    where id = v_billing_id;
    perform set_config('silo.trusted_write', 'on', true);
    -- 구독한 등급으로 승급(이미 그 이상이면 유지 — Artist 99 등도 그대로).
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

grant execute on function toss_save_billing(text, uuid, text, text, text, text, integer) to anon, authenticated;
grant execute on function toss_record_charge(text, uuid, boolean, integer, text, text, text, numeric) to anon, authenticated;
