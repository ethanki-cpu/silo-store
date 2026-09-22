-- EPIC-161 Phase 2: 실로플래닛 — 회원마다 자기 행성을 가지는 데이터 모델 신설.
-- 지금까지 AboutSiloUniverse.tsx는 SILO_CENTER/USER_CENTER 딱 2개의 고정 좌표만
-- 있었고 member_id 참조가 전혀 없어(회원별로 별도 행성이 존재한다는 개념 자체가
-- 없음), Alice=다른 행성 열람/Gatsby=행성 좋아요/Patron=자기 행성에 glb 업로드
-- 상호작용을 붙일 대상이 없었다. 이 테이블이 그 대상을 만든다 — 3D 씬에 실제로
-- N개 행성을 배치/렌더링하는 것은 별도(AboutSiloUniverse.tsx, 3081줄 — 육안 확인
-- 없이 손대기엔 위험이 커 이번엔 데이터 계층만).

create table if not exists member_planets (
  id uuid primary key default gen_random_uuid(),
  member_id uuid not null unique references members(id) on delete cascade,
  glb_url text,
  glb_path text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table member_planets enable row level security;

create policy "member_planets_public_read" on member_planets for select using (true);

create policy "member_planets_own_write" on member_planets for all
  using (exists (select 1 from members where members.id = member_planets.member_id and members.auth_user_id = auth.uid()))
  with check (exists (select 1 from members where members.id = member_planets.member_id and members.auth_user_id = auth.uid()));

create table if not exists planet_likes (
  id uuid primary key default gen_random_uuid(),
  member_id uuid not null references members(id) on delete cascade,
  planet_member_id uuid not null references members(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (member_id, planet_member_id)
);

alter table planet_likes enable row level security;

create policy "planet_likes_public_read" on planet_likes for select using (true);

create policy "planet_likes_own_insert" on planet_likes for insert
  with check (exists (select 1 from members where members.id = planet_likes.member_id and members.auth_user_id = auth.uid()));

create policy "planet_likes_own_delete" on planet_likes for delete
  using (exists (select 1 from members where members.id = planet_likes.member_id and members.auth_user_id = auth.uid()));
