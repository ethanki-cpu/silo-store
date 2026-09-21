-- EPIC-159: 스텝페이(Steppay) 정기구독 — 회원↔스텝페이 고객 매핑, 구독/결제 상태 저장, 웹훅 이벤트 기록, 그리고
-- 결제·해지 웹훅에 따른 members.membership_rank 자동 승급/강등(Patron=3). service-role 키가 없는 프로젝트라(CLAUDE.md)
-- 웹훅처럼 사용자 신원이 없는 쓰기는 SECURITY DEFINER RPC + 서버 전용 공유 비밀(STEPPAY_DB_RPC_SECRET, DB에는 sha256 해시만)로 보호한다.
-- 롤백: 아래 함수 6개/테이블 4개 drop, app_private_secrets의 'steppay_rpc' 행 삭제.
--
-- 적용 전 필수: 맨 아래 "비밀 등록" 문장의 :steppay_secret 자리에 STEPPAY_DB_RPC_SECRET 원문을 치환해 실행한다(원문은 커밋 금지).

create table if not exists steppay_customers (
  member_id uuid primary key references members(id),
  steppay_customer_id bigint not null unique,
  steppay_customer_code text,
  created_at timestamptz not null default now()
);

create table if not exists steppay_subscriptions (
  subscription_id bigint primary key,
  member_id uuid not null references members(id),
  status text not null,
  product_code text,
  next_payment_date timestamptz,
  end_date timestamptz,
  order_code text,
  last_event_ts bigint not null default 0,
  updated_at timestamptz not null default now()
);
create index if not exists steppay_subscriptions_member_idx on steppay_subscriptions(member_id);

create table if not exists steppay_payments (
  payment_id bigint primary key,
  member_id uuid references members(id),
  status text not null,
  paid_amount numeric,
  paid_at timestamptz,
  order_ref text,
  error_message text,
  last_event_ts bigint not null default 0,
  updated_at timestamptz not null default now()
);

create table if not exists steppay_webhook_events (
  event_hash text primary key,
  event text not null,
  note text,
  received_at timestamptz not null default now()
);

alter table steppay_customers enable row level security;
alter table steppay_subscriptions enable row level security;
alter table steppay_payments enable row level security;
alter table steppay_webhook_events enable row level security;
revoke all on steppay_customers, steppay_subscriptions, steppay_payments, steppay_webhook_events from anon, authenticated;
-- 본인/관리자는 자기 구독·결제 상태만 읽는다(쓰기는 전부 아래 RPC).
grant select on steppay_subscriptions, steppay_payments to authenticated;
drop policy if exists steppay_subscriptions_select_own on steppay_subscriptions;
create policy steppay_subscriptions_select_own on steppay_subscriptions for select
  using (member_id in (select id from members where auth_user_id = auth.uid()) or is_current_user_admin());
drop policy if exists steppay_payments_select_own on steppay_payments;
create policy steppay_payments_select_own on steppay_payments for select
  using (member_id in (select id from members where auth_user_id = auth.uid()) or is_current_user_admin());

create or replace function steppay_check_secret(p_secret text) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from app_private_secrets
    where name = 'steppay_rpc' and value_hash = encode(sha256(convert_to(coalesce(p_secret, ''), 'utf8')), 'hex')
  );
$$;
revoke all on function steppay_check_secret(text) from public, anon, authenticated;

-- 회원 ↔ 스텝페이 고객 연결(체크아웃에서 고객을 만든 직후 호출).
create or replace function steppay_link_customer(p_secret text, p_member_id uuid, p_customer_id bigint, p_code text)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not steppay_check_secret(p_secret) then raise exception 'forbidden' using errcode = '42501'; end if;
  insert into steppay_customers (member_id, steppay_customer_id, steppay_customer_code)
  values (p_member_id, p_customer_id, p_code)
  on conflict (member_id) do update set steppay_customer_id = excluded.steppay_customer_id,
    steppay_customer_code = excluded.steppay_customer_code;
end $$;

create or replace function steppay_get_customer(p_secret text, p_member_id uuid)
returns bigint language plpgsql security definer set search_path = public as $$
declare v bigint;
begin
  if not steppay_check_secret(p_secret) then raise exception 'forbidden' using errcode = '42501'; end if;
  select steppay_customer_id into v from steppay_customers where member_id = p_member_id;
  return v;
end $$;

-- 구독 웹훅 적용. 이벤트 순서는 보장되지 않으므로(스텝페이 안내) 더 오래된 이벤트(last_event_ts)는 무시한다.
-- 승급/강등: 이용 가능한 구독 상태(ACTIVE/PENDING_CANCEL/PENDING_PAUSE/QUEUEING)가 하나라도 있으면 p_rank(Patron)로 승급,
-- 없으면(INCOMPLETE/UNPAID/PAUSE/EXPIRED/CANCELED) 기본 등급(0)으로 강등 — 단, 현재 등급이 정확히 p_rank일 때만(더 높은 등급/수동 부여는 건드리지 않음).
create or replace function steppay_apply_subscription(
  p_secret text, p_customer_id bigint, p_subscription_id bigint, p_status text, p_product_code text,
  p_next timestamptz, p_end timestamptz, p_order_code text, p_event_ts bigint, p_rank integer
) returns text language plpgsql security definer set search_path = public as $$
declare v_member uuid; v_entitled boolean; v_last bigint;
begin
  if not steppay_check_secret(p_secret) then raise exception 'forbidden' using errcode = '42501'; end if;
  select member_id into v_member from steppay_customers where steppay_customer_id = p_customer_id;
  if v_member is null then return 'unknown_customer'; end if;
  select last_event_ts into v_last from steppay_subscriptions where subscription_id = p_subscription_id;
  if v_last is not null and v_last > p_event_ts then return 'stale'; end if;
  insert into steppay_subscriptions (subscription_id, member_id, status, product_code, next_payment_date, end_date, order_code, last_event_ts, updated_at)
  values (p_subscription_id, v_member, p_status, p_product_code, p_next, p_end, p_order_code, p_event_ts, now())
  on conflict (subscription_id) do update set status = excluded.status, product_code = coalesce(excluded.product_code, steppay_subscriptions.product_code),
    next_payment_date = excluded.next_payment_date, end_date = excluded.end_date,
    order_code = coalesce(excluded.order_code, steppay_subscriptions.order_code),
    last_event_ts = excluded.last_event_ts, updated_at = now();
  select exists (select 1 from steppay_subscriptions where member_id = v_member
    and status in ('ACTIVE', 'PENDING_CANCEL', 'PENDING_PAUSE', 'QUEUEING')) into v_entitled;
  perform set_config('silo.trusted_write', 'on', true);
  if v_entitled then
    update members set membership_rank = p_rank where id = v_member and membership_rank < p_rank;
    return 'upgraded';
  else
    update members set membership_rank = 0 where id = v_member and membership_rank = p_rank;
    return 'downgraded';
  end if;
end $$;

-- 결제 웹훅 기록(감사용). 등급 변경은 구독 상태 웹훅이 결정한다.
create or replace function steppay_record_payment(
  p_secret text, p_customer_id bigint, p_payment_id bigint, p_status text, p_amount numeric,
  p_paid_at timestamptz, p_order_ref text, p_error text, p_event_ts bigint
) returns text language plpgsql security definer set search_path = public as $$
declare v_member uuid; v_last bigint;
begin
  if not steppay_check_secret(p_secret) then raise exception 'forbidden' using errcode = '42501'; end if;
  select member_id into v_member from steppay_customers where steppay_customer_id = p_customer_id;
  select last_event_ts into v_last from steppay_payments where payment_id = p_payment_id;
  if v_last is not null and v_last > p_event_ts then return 'stale'; end if;
  insert into steppay_payments (payment_id, member_id, status, paid_amount, paid_at, order_ref, error_message, last_event_ts, updated_at)
  values (p_payment_id, v_member, p_status, p_amount, p_paid_at, p_order_ref, left(p_error, 500), p_event_ts, now())
  on conflict (payment_id) do update set status = excluded.status, paid_amount = excluded.paid_amount, paid_at = excluded.paid_at,
    order_ref = excluded.order_ref, error_message = excluded.error_message, last_event_ts = excluded.last_event_ts, updated_at = now();
  return case when v_member is null then 'unknown_customer' else 'recorded' end;
end $$;

create or replace function steppay_log_event(p_secret text, p_hash text, p_event text, p_note text)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not steppay_check_secret(p_secret) then raise exception 'forbidden' using errcode = '42501'; end if;
  insert into steppay_webhook_events (event_hash, event, note) values (p_hash, p_event, left(p_note, 500))
  on conflict (event_hash) do nothing;
end $$;

grant execute on function steppay_link_customer(text, uuid, bigint, text) to anon, authenticated;
grant execute on function steppay_get_customer(text, uuid) to anon, authenticated;
grant execute on function steppay_apply_subscription(text, bigint, bigint, text, text, timestamptz, timestamptz, text, bigint, integer) to anon, authenticated;
grant execute on function steppay_record_payment(text, bigint, bigint, text, numeric, timestamptz, text, text, bigint) to anon, authenticated;
grant execute on function steppay_log_event(text, text, text, text) to anon, authenticated;

-- 비밀 등록(별도 실행 — :steppay_secret 을 실제 값으로 치환, 커밋 금지):
-- insert into app_private_secrets (name, value_hash)
-- values ('steppay_rpc', encode(sha256(convert_to(':steppay_secret', 'utf8')), 'hex'))
-- on conflict (name) do update set value_hash = excluded.value_hash;
