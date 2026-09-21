-- EPIC-160: 스텝페이 정기구독을 유료 멤버십 4등급(Alice/Great Gatsby/Patron/Lautrec)으로 확장.
-- 구독마다 등급(tier_rank)을 저장하고, 승급/강등을 "이용 가능한 구독 중 가장 높은 등급" 기준으로 계산한다.
-- steppay_apply_subscription의 시그니처는 그대로(p_rank = 이 구독 상품의 등급)라 웹훅 호출부 호환.

alter table steppay_subscriptions add column if not exists tier_rank integer;
-- 기존 구독은 전부 Patron 상품이었다.
update steppay_subscriptions set tier_rank = 3 where tier_rank is null;

create or replace function steppay_apply_subscription(
  p_secret text, p_customer_id bigint, p_subscription_id bigint, p_status text, p_product_code text,
  p_next timestamptz, p_end timestamptz, p_order_code text, p_event_ts bigint, p_rank integer
) returns text language plpgsql security definer set search_path = public as $$
declare v_member uuid; v_target integer; v_last bigint;
begin
  if not steppay_check_secret(p_secret) then raise exception 'forbidden' using errcode = '42501'; end if;
  select member_id into v_member from steppay_customers where steppay_customer_id = p_customer_id;
  if v_member is null then return 'unknown_customer'; end if;
  select last_event_ts into v_last from steppay_subscriptions where subscription_id = p_subscription_id;
  if v_last is not null and v_last > p_event_ts then return 'stale'; end if;
  insert into steppay_subscriptions (subscription_id, member_id, status, product_code, tier_rank, next_payment_date, end_date, order_code, last_event_ts, updated_at)
  values (p_subscription_id, v_member, p_status, p_product_code, p_rank, p_next, p_end, p_order_code, p_event_ts, now())
  on conflict (subscription_id) do update set status = excluded.status,
    product_code = coalesce(excluded.product_code, steppay_subscriptions.product_code),
    tier_rank = coalesce(excluded.tier_rank, steppay_subscriptions.tier_rank),
    next_payment_date = excluded.next_payment_date, end_date = excluded.end_date,
    order_code = coalesce(excluded.order_code, steppay_subscriptions.order_code),
    last_event_ts = excluded.last_event_ts, updated_at = now();

  -- 이용 가능한 구독 중 가장 높은 등급(없으면 0)
  select coalesce(max(tier_rank), 0) into v_target from steppay_subscriptions
   where member_id = v_member and status in ('ACTIVE', 'PENDING_CANCEL', 'PENDING_PAUSE', 'QUEUEING');

  perform set_config('silo.trusted_write', 'on', true);
  -- 승급: 이용 가능한 구독 중 가장 높은 등급보다 낮으면 올린다(관리자가 수동으로 더 높게 준 등급은 유지).
  update members set membership_rank = v_target where id = v_member and membership_rank < v_target;
  -- 강등: 이 구독의 등급(p_rank)으로 올라가 있던 회원이 그 구독을 잃었다면, 남은 구독 중 최고 등급(없으면 0)으로 내린다.
  if p_rank > v_target then
    update members set membership_rank = v_target where id = v_member and membership_rank = p_rank;
  end if;
  return case when v_target > 0 then 'entitled' else 'downgraded' end;
end $$;

grant execute on function steppay_apply_subscription(text, bigint, bigint, text, text, timestamptz, timestamptz, text, bigint, integer) to anon, authenticated;
