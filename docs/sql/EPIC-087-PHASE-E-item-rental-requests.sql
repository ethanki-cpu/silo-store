-- EPIC-087-PHASE-E: "물품 대여" 신청 — 지금까지 /space-inquiry/item-rental는
-- "준비 중" 정적 placeholder였고 백엔드 테이블이 아예 없었다(공간 대관
-- rental_bookings와 달리). 최소 형태로 신설. 이미 Management API로 즉시
-- 실행 완료(라이브 반영됨, 2026-08-07).

create table if not exists item_rental_requests (
  id uuid primary key default gen_random_uuid(),
  member_id uuid not null references members(id),
  item_description text not null,
  desired_start_date date,
  desired_end_date date,
  contact_note text,
  status text not null default 'pending' check (status in ('pending','confirmed','cancelled')),
  created_at timestamptz not null default now()
);

alter table item_rental_requests enable row level security;

-- orders/reservations와 동일한 own-row + admin-bypass 패턴(CLAUDE.md RLS 절 참고).
create policy "item_rental_requests_own_select" on item_rental_requests for select
  using (member_id in (select id from members where auth_user_id = auth.uid()));

create policy "item_rental_requests_own_insert" on item_rental_requests for insert
  with check (member_id in (select id from members where auth_user_id = auth.uid()));

create policy "item_rental_requests_admin_select" on item_rental_requests for select
  using (exists (select 1 from members where auth_user_id = auth.uid() and is_admin = true));

create policy "item_rental_requests_admin_update" on item_rental_requests for update
  using (exists (select 1 from members where auth_user_id = auth.uid() and is_admin = true))
  with check (exists (select 1 from members where auth_user_id = auth.uid() and is_admin = true));

create index if not exists idx_item_rental_requests_member on item_rental_requests(member_id);
