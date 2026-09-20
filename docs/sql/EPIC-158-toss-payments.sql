-- EPIC-158: 결제 시스템 이원화 — 토스페이먼츠(정기구독 + 도슨트 단건) / 상점은 계좌이체 유지.
-- 서버(Route Handler)는 service-role 키가 없으므로(CLAUDE.md), 사용자 신원이 없는 토스 리다이렉트
-- 처리와 "결제 성공 → 권한 승급" 같은 신뢰 쓰기는 SECURITY DEFINER 함수 + 서버 전용 공유 비밀
-- (env TOSS_DB_RPC_SECRET, DB에는 sha256 해시만)로 보호한다.

-- ── 공유 비밀 저장소(정책 없음 = 클라이언트 접근 불가) ─────────────────────────
create table if not exists app_private_secrets (
  name text primary key,
  value_hash text not null
);
alter table app_private_secrets enable row level security;
revoke all on app_private_secrets from anon, authenticated;

create or replace function toss_check_secret(p_secret text) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from app_private_secrets
    where name = 'toss_rpc' and value_hash = encode(sha256(convert_to(coalesce(p_secret, ''), 'utf8')), 'hex')
  );
$$;
revoke all on function toss_check_secret(text) from public, anon, authenticated;

-- ── member_billing (정기구독) ─────────────────────────────────────────────
create table if not exists member_billing (
  id uuid primary key default gen_random_uuid(),
  member_id uuid not null unique references members(id),
  customer_key text not null unique,
  toss_billing_key text not null,
  card_company text,
  card_number_masked text,
  status text not null default 'active' check (status in ('active', 'canceled', 'suspended')),
  next_billing_date date,
  last_billed_at timestamptz,
  last_order_id text,
  last_payment_key text,
  failed_count integer not null default 0,
  last_failure_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table member_billing enable row level security;
-- 빌링키(toss_billing_key)는 어떤 클라이언트 역할도 읽지 못하게 컬럼 단위로 막는다.
revoke all on member_billing from anon, authenticated;
grant select (id, member_id, customer_key, status, card_company, card_number_masked, next_billing_date,
  last_billed_at, failed_count, last_failure_reason, created_at, updated_at) on member_billing to authenticated;
drop policy if exists member_billing_select_own on member_billing;
create policy member_billing_select_own on member_billing for select
  using (member_id in (select id from members where auth_user_id = auth.uid()));
drop policy if exists member_billing_select_admin on member_billing;
create policy member_billing_select_admin on member_billing for select using (is_current_user_admin());

-- ── docent_purchases 확장(토스 단건 결제) ──────────────────────────────────
alter table docent_purchases add column if not exists toss_payment_key text;
alter table docent_purchases add column if not exists toss_order_id text;
alter table docent_purchases add column if not exists paid_at timestamptz;
create unique index if not exists docent_purchases_toss_order_id_key on docent_purchases(toss_order_id) where toss_order_id is not null;
alter table docent_purchases drop constraint if exists docent_purchases_payment_status_check;
alter table docent_purchases add constraint docent_purchases_payment_status_check
  check (payment_status in ('pending_transfer', 'pending_payment', 'confirmed', 'cancelled'));

-- points_ledger 사유 확장
alter table points_ledger drop constraint if exists points_ledger_reason_check;
alter table points_ledger add constraint points_ledger_reason_check
  check (reason in ('post','comment','like_received','best_post','shop_purchase','shop_rental','venue_rental','club_participation','attendance','membership_subscription'));

-- ── 특권 컬럼 보호 트리거 ─────────────────────────────────────────────────
-- 사전 발견: authenticated가 members.membership_rank/is_admin에 UPDATE 권한 + "본인 행 수정" 정책을
-- 가져 누구나 REST로 자기 등급을 올릴 수 있었고, docent_purchases는 payment_status='confirmed'로
-- 직접 INSERT할 수 있었다 — 유료 결제의 의미가 없어지므로 트리거로 막는다(관리자/신뢰된 서버 함수는 통과).
create or replace function members_protect_privileged_columns() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if (new.membership_rank is distinct from old.membership_rank or new.is_admin is distinct from old.is_admin)
     and auth.uid() is not null
     and not is_current_user_admin()
     and coalesce(current_setting('silo.trusted_write', true), '') <> 'on' then
    raise exception '등급/관리자 권한은 직접 변경할 수 없어요.' using errcode = '42501';
  end if;
  return new;
end $$;
drop trigger if exists trg_members_protect_privileged on members;
create trigger trg_members_protect_privileged before update on members
  for each row execute function members_protect_privileged_columns();

create or replace function docent_purchases_protect_status() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.payment_status = 'confirmed'
     and (tg_op = 'INSERT' or old.payment_status is distinct from 'confirmed')
     and auth.uid() is not null
     and not is_current_user_admin()
     and coalesce(current_setting('silo.trusted_write', true), '') <> 'on'
     and not (coalesce(new.is_monthly_free, false) and new.price_charged = 0) then
    raise exception '결제 확인은 서버/관리자만 처리할 수 있어요.' using errcode = '42501';
  end if;
  return new;
end $$;
drop trigger if exists trg_docent_purchases_protect on docent_purchases;
create trigger trg_docent_purchases_protect before insert or update on docent_purchases
  for each row execute function docent_purchases_protect_status();

-- ── RPC: 빌링키 저장 ───────────────────────────────────────────────────────
create or replace function toss_save_billing(
  p_secret text, p_member_id uuid, p_customer_key text, p_billing_key text,
  p_card_company text, p_card_number text
) returns void language plpgsql security definer set search_path = public as $$
begin
  if not toss_check_secret(p_secret) then raise exception 'forbidden' using errcode = '42501'; end if;
  insert into member_billing (member_id, customer_key, toss_billing_key, card_company, card_number_masked,
    status, next_billing_date, failed_count, last_failure_reason)
  values (p_member_id, p_customer_key, p_billing_key, p_card_company, p_card_number, 'active', current_date, 0, null)
  on conflict (member_id) do update set
    customer_key = excluded.customer_key, toss_billing_key = excluded.toss_billing_key,
    card_company = excluded.card_company, card_number_masked = excluded.card_number_masked,
    status = 'active', next_billing_date = current_date, failed_count = 0, last_failure_reason = null,
    updated_at = now();
end $$;

-- ── RPC: 정기결제 결과 기록(성공 → 승급+포인트 / 실패 → suspended) ───────────
create or replace function toss_record_charge(
  p_secret text, p_member_id uuid, p_ok boolean, p_amount integer, p_order_id text,
  p_payment_key text, p_failure_reason text, p_point_pct numeric
) returns void language plpgsql security definer set search_path = public as $$
declare v_billing_id uuid; v_points integer;
begin
  if not toss_check_secret(p_secret) then raise exception 'forbidden' using errcode = '42501'; end if;
  select id into v_billing_id from member_billing where member_id = p_member_id;
  if v_billing_id is null then raise exception 'billing not found'; end if;
  if p_ok then
    update member_billing set last_billed_at = now(), next_billing_date = current_date + interval '1 month',
      status = 'active', failed_count = 0, last_failure_reason = null,
      last_order_id = p_order_id, last_payment_key = p_payment_key, updated_at = now()
    where id = v_billing_id;
    perform set_config('silo.trusted_write', 'on', true);
    -- 이미 Patron 이상(3/4/99)이면 등급은 그대로 둔다.
    update members set membership_rank = 3 where id = p_member_id and membership_rank < 3;
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

-- ── RPC: 도슨트 단건 결제 조회/확정 ────────────────────────────────────────
create or replace function toss_get_docent_purchase(p_secret text, p_purchase_id uuid)
returns table (id uuid, member_id uuid, content_id uuid, price_charged integer, payment_status text)
language plpgsql security definer set search_path = public as $$
begin
  if not toss_check_secret(p_secret) then raise exception 'forbidden' using errcode = '42501'; end if;
  return query select d.id, d.member_id, d.content_id, d.price_charged, d.payment_status
    from docent_purchases d where d.id = p_purchase_id;
end $$;

create or replace function toss_confirm_docent_purchase(
  p_secret text, p_purchase_id uuid, p_payment_key text, p_order_id text
) returns void language plpgsql security definer set search_path = public as $$
begin
  if not toss_check_secret(p_secret) then raise exception 'forbidden' using errcode = '42501'; end if;
  perform set_config('silo.trusted_write', 'on', true);
  update docent_purchases set payment_status = 'confirmed', toss_payment_key = p_payment_key,
    toss_order_id = p_order_id, paid_at = now()
  where id = p_purchase_id and payment_status in ('pending_payment', 'pending_transfer');
end $$;

grant execute on function toss_save_billing(text, uuid, text, text, text, text) to anon, authenticated;
grant execute on function toss_record_charge(text, uuid, boolean, integer, text, text, text, numeric) to anon, authenticated;
grant execute on function toss_get_docent_purchase(text, uuid) to anon, authenticated;
grant execute on function toss_confirm_docent_purchase(text, uuid, text, text) to anon, authenticated;
