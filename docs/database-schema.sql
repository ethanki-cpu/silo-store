-- =====================================================================
-- 사일로 스토어 (Silo Store) 플랫폼 — Supabase(PostgreSQL) 스키마
-- 구성: 멤버십 / 사일로상점(1층) / 살롱데상(2층) / 커뮤니티(게시판·포인트)
--       / 출석체크 / 설문조사 / 자료 다운로드
--
-- ⚠️ 마지막 동기화: 2026-08-12 (EPIC-095: site_navigations 시드 블록을 가상의
--    초기 CTE 데이터에서 라이브 DB의 실제 상태(Management API 재조회, id 포함
--    125행) 그대로의 덤프로 교체 — 아래 site_navigations 시드 섹션 참고).
--    그 전 동기화는 2026-07-26 (EPIC-023: site_navigations/site_categories 2개
--    테이블 신규 설계 + navConfig.ts/카테고리 하드코딩 데이터를 옮기는 Seed 포함
--    — 아직 라이브 DB에는 적용 전. 그 직전 동기화도 같은 날: EPIC-022의
--    member_collections/member_follows/member_badges/member_visitors 4개 테이블
--    (역시 아직 라이브 미적용 — 이 파일의 정의가 실행할 DDL의 원본임). 그 전 동기화는 2026-07-24
--    (wishlists 테이블 추가); 그 전에 docent_contents.era + docent_content_popularity 뷰,
--    그 전에 styling_projects 계열 3개 테이블도 같은 날 추가됨).
--    최초 전면 동기화는 2026-07-23 — Supabase Management API로 실제 운영 DB의
--    information_schema.columns / pg_constraint를 직접 조회하여 재작성함.
--
-- 이 파일은 이 프로젝트의 유일한 공식 DB 스키마 문서(Single Source of Truth)임.
-- 프로젝트 밖에 있던 silostore_schema.sql 사본은 더 이상 관리하지 않음 —
-- 스키마를 바꿀 때는 이 파일만 갱신하면 됨 (PROJECT_BLUEPRINT.md 참고).
--
-- 이 파일에 담지 않은 것 (추측 방지 — PROJECT_BLUEPRINT.md TODO 섹션 참고):
--   - 정확한 RLS 정책 조건 (테이블에 RLS가 걸려 있다는 사실만 표시)
--   - 뷰(poll_option_counts, public_profiles)를 제외한 모든 오브젝트는 실제 테이블
-- =====================================================================

create extension if not exists pgcrypto;

-- =====================================================================
-- 1. 멤버십
-- =====================================================================

create table membership_tiers (
  rank                        int primary key,               -- 0=Silo Angel, 1=Alice, 2=Great Gatsby, 3=Patron, 4=Lautrec, 99=Artist
  name                        text not null,
  price                       int not null default 0,

  shop_purchase_point_pct     numeric(4,2) not null default 0,
  shop_purchase_discount_pct  numeric(4,2) not null default 0,
  shop_rental_point_pct       numeric(4,2) not null default 0,
  shop_rental_discount_pct    numeric(4,2) not null default 0,

  curation_level              int not null default 0,        -- 사일로상점 큐레이션 공개 단계 (0~3)
  venue_rental_point_pct      numeric(4,2) not null default 0,

  club_all_free               boolean not null default false,
  club_monthly_free_sessions  int not null default 0,
  club_participation_discount_pct numeric(4,2) not null default 0,
  club_point_pct              numeric(4,2) not null default 0,
  club_priority_booking        boolean not null default false,

  monthly_salon_meeting_invite boolean not null default false,
  secret_room_access          text not null default 'none' check (secret_room_access in ('none','exam_required')),

  docent_free_only            boolean not null default false,
  docent_per_item_discount_pct numeric(4,2) not null default 0,
  docent_monthly_free_count   int not null default 0,
  docent_needs_agreement      boolean not null default false,

  drink_free                  boolean not null default false,
  tour_docent_free            boolean not null default false,

  salon_entry_free            boolean not null default false,
  salon_entry_hourly_fee      int not null default 3000,

  board_write_scope           text not null default 'limited' check (board_write_scope in ('limited','all')),
  board_can_write_docent      boolean not null default false,
  board_can_create            boolean not null default false,
  board_has_patron_board      boolean not null default false,
  board_has_promo_board       boolean not null default false,

  is_lifetime                 boolean not null default false,
  created_at                  timestamptz not null default now()
);

-- 실제 시드 데이터 (rank, name, price만 라이브 DB에서 재확인함; 나머지 혜택 컬럼값은
-- 최초 설계 시드 그대로 유지되고 있다고 가정 — 정확한 전체 값은 TODO)
insert into membership_tiers (rank, name, price) values
  (0, 'Silo Angel',    0),
  (1, 'Alice',     10000),
  (2, 'Great Gatsby',25000),
  (3, 'Patron',     40000),
  (4, 'Lautrec',   100000),
  (99,'Artist',         0);
-- ⚠️ TODO: 위 INSERT는 rank/name/price 3개 컬럼만 라이브로 재검증됨.
--    나머지 20여 개 혜택 플래그 컬럼의 정확한 값은 Supabase에서 직접 확인 필요.

-- 회원
create table members (
  id                uuid primary key default gen_random_uuid(),
  name              text not null,
  email             text unique,
  kakao_id          text,
  membership_rank   int not null default 0 references membership_tiers(rank),
  membership_started_at timestamptz default now(),
  joined_at         timestamptz not null default now(),
  auth_user_id      uuid unique references auth.users(id),   -- Supabase Auth 사용자와 연결
  is_admin          boolean not null default false            -- /admin/payments 접근 권한
);

create table member_profiles (
  member_id   uuid primary key references members(id) on delete cascade,
  bio         text,
  cover_image text
);

-- members(id, name)만 노출하는 공개 뷰. 다른 회원의 이름을 표시해야 하는 곳
-- (게시글 작성자, 관리자 결제 목록, /u/[memberId] 등)에서 members 테이블 대신 사용.
create view public_profiles as
  select id, name from members;

-- =====================================================================
-- 2. 사일로상점 (1층) — 물품 소매·대여, 큐레이션, 이전 주인 캐릭터
-- =====================================================================

-- 물품에 "이전 주인" 캐릭터를 붙이기 위한 캐릭터 은행 (68명 시드: grandma 51 / grandpa 17)
create table item_personas (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  type        text not null check (type in ('grandma','grandpa')),
  bio         text,        -- 캐릭터별 짧은 설명 (현재 전부 null, 추후 채울 예정)
  photo_url   text,        -- 캐릭터 사진 (현재 전부 null)
  created_at  timestamptz not null default now()
);

create table items (
  id                    uuid primary key default gen_random_uuid(),
  name                  text not null,
  photo_url             text,
  price                 int not null,
  rental_price_per_day  int generated always as (round(price * 0.3)) stored,

  -- Time Slip: 8개 시대 중 하나로 고정
  category              text check (category in (
                          'renaissance','baroque','rococo','neoclassic',
                          'empire','victorian','art_nouveau','art_deco'
                        )),

  -- 큐레이션 4단계 (등급에 따라 API가 선택적으로 노출 — /api/items/[id])
  era_info              text,  -- level 0: 제작 시기
  era_context           text,  -- level 1: 시대 배경
  maker_info            text,  -- level 2: 제작자·기법
  previous_owner_story  text,  -- level 3: 이전 주인 사연 (persona_id 연결 시 캐릭터 이름/사진 함께 노출)

  persona_id            uuid references item_personas(id),

  status                text not null default 'available' check (status in ('available','rented','sold','archived')),
  created_at            timestamptz not null default now()
);

create table orders (
  id                    uuid primary key default gen_random_uuid(),
  member_id             uuid not null references members(id),
  item_id               uuid not null references items(id),
  order_type            text not null check (order_type in ('purchase','rental')),
  rental_days           int,
  price_charged         int not null,
  discount_applied_pct  numeric(4,2) not null default 0,
  point_earned          int not null default 0,
  payment_status        text not null default 'pending_transfer' check (payment_status in ('pending_transfer','confirmed','cancelled')),
  created_at            timestamptz not null default now()
);

-- 찜(Wishlist). likes 테이블과 동일한 패턴(select 공개, insert/delete 본인 전용)을 따름.
create table wishlists (
  id          uuid primary key default gen_random_uuid(),
  member_id   uuid not null references members(id),
  item_id     uuid not null references items(id),
  created_at  timestamptz not null default now(),
  unique (member_id, item_id)
);

-- =====================================================================
-- 3. 살롱데상 (2층) — 클럽모임, 월별모임, 비밀의 방, 도슨트 투어
--    ⚠️ salon_events / salon_rooms / drink_menu / docent_tours 는 테이블은
--    존재하지만, 대응하는 화면(/salon/monthly-events, /secret-room, /drinks,
--    /docent-tour)은 전부 ComingSoon placeholder임 (코드 기준 확인됨).
-- =====================================================================

create table clubs (
  id          uuid primary key default gen_random_uuid(),
  weekday     text not null check (weekday in ('mon','tue','wed','thu','fri','sat','sun')),
  name        text not null,
  description text,
  base_price  int not null
);

insert into clubs (weekday, name, base_price) values
  ('mon', 'Monday Rebellion Club (월요반란 클럽)', 10000),
  ('tue', 'Book Read-along Club (책 낭송 클럽)', 20000),
  ('wed', 'Text Sculptor (행간의 조각가)', 20000),
  ('thu', 'Have Fun English Club (놀아보자 영어클럽)', 20000),
  ('fri', 'Before Sunrise Social Club (비포 선라이즈 소셜클럽)', 20000),
  ('sat', 'Whatever can happen club (무슨일이든 일어날수있어 클럽)', 10000),
  ('sun', 'After Theater club (연극이 끝나고 난 뒤 클럽)', 10000);
-- ✅ 위 7개 행은 라이브 DB에서 그대로 재확인됨 (weekday/name/base_price 일치).

create table club_sessions (
  id            uuid primary key default gen_random_uuid(),
  club_id       uuid not null references clubs(id),
  session_date  date not null,
  capacity      int,
  status        text not null default 'open' check (status in ('open','closed','cancelled'))
);

create table reservations (
  id                    uuid primary key default gen_random_uuid(),
  member_id             uuid not null references members(id),
  session_id            uuid not null references club_sessions(id),
  price_charged         int not null,
  discount_applied_pct  numeric(4,2) not null default 0,
  point_earned          int not null default 0,
  is_monthly_free_pick  boolean not null default false,
  payment_status        text not null default 'pending_transfer' check (payment_status in ('pending_transfer','confirmed','cancelled')),
  created_at            timestamptz not null default now()
);

create table salon_events (
  id                 uuid primary key default gen_random_uuid(),
  title              text not null,
  event_date         date not null,
  min_rank_required  int references membership_tiers(rank) default 3
);

create table salon_event_rsvps (
  id          uuid primary key default gen_random_uuid(),
  event_id    uuid not null references salon_events(id),
  member_id   uuid not null references members(id),
  created_at  timestamptz not null default now(),
  unique (event_id, member_id)
);

create table salon_rooms (
  id             uuid primary key default gen_random_uuid(),
  name           text not null,
  description    text,
  requires_exam  boolean not null default true
);

create table salon_room_access (
  id               uuid primary key default gen_random_uuid(),
  room_id          uuid not null references salon_rooms(id),
  member_id        uuid not null references members(id),
  exam_passed_at   timestamptz,
  granted_at       timestamptz default now(),
  unique (room_id, member_id)
);

create table docent_tours (
  id          uuid primary key default gen_random_uuid(),
  tour_date   date not null,
  capacity    int,
  base_price  int not null default 10000
);

create table docent_tour_bookings (
  id               uuid primary key default gen_random_uuid(),
  tour_id          uuid not null references docent_tours(id),
  member_id        uuid not null references members(id),
  price_charged    int not null,
  payment_status   text not null default 'pending_transfer' check (payment_status in ('pending_transfer','confirmed','cancelled')),
  created_at       timestamptz not null default now()
);

create table drink_menu (
  id     uuid primary key default gen_random_uuid(),
  name   text not null,
  price  int not null
);

insert into drink_menu (name, price) values
  ('주스', 3000),
  ('샹그리아', 4000),
  ('커피', 4000),
  ('티', 4000),
  ('위스키', 5000);
-- ⚠️ TODO: 행 개수(5개)만 라이브로 재확인함. 이름/가격 값 자체는 재검증하지 않음.

create table drink_orders (
  id              uuid primary key default gen_random_uuid(),
  member_id       uuid not null references members(id),
  drink_id        uuid not null references drink_menu(id),
  price_charged   int not null default 0,
  created_at      timestamptz not null default now()
);

create table salon_checkins (
  id            uuid primary key default gen_random_uuid(),
  member_id     uuid not null references members(id),
  checkin_at    timestamptz not null default now(),
  hours         numeric(4,1) not null default 1,
  fee_charged   int not null default 0,
  guest_count   int not null default 0
);

-- =====================================================================
-- 4. 공간 대관 (1층 사일로상점 / 2층 살롱데상 공통 구조)
-- =====================================================================

create table rental_types (
  id                     uuid primary key default gen_random_uuid(),
  floor                  text not null check (floor in ('1f_silostore','2f_salon')),
  shoot_type             text not null check (shoot_type in ('photo','video')),
  weekday_price          int not null,
  weekend_price          int not null,
  base_headcount         int not null,
  extra_person_hourly_fee int not null default 6000
);

insert into rental_types (floor, shoot_type, weekday_price, weekend_price, base_headcount) values
  ('1f_silostore', 'photo', 60000,  80000,  2),
  ('1f_silostore', 'video', 90000,  110000, 3),
  ('2f_salon',      'photo', 100000, 120000, 2),
  ('2f_salon',      'video', 150000, 170000, 3);
-- ⚠️ TODO: 행 개수(4개)만 라이브로 재확인함. 가격 값 자체는 재검증하지 않음.

create table rental_bookings (
  id                   uuid primary key default gen_random_uuid(),
  member_id            uuid not null references members(id),
  rental_type_id       uuid not null references rental_types(id),
  booking_date         date not null,
  is_weekend           boolean not null default false,
  hours                int not null default 1,
  headcount            int not null,
  price_charged        int not null,
  point_earned_pct     numeric(4,2) not null default 0,
  point_earned         int not null default 0,
  payment_status       text not null default 'pending_transfer' check (payment_status in ('pending_transfer','confirmed','cancelled')),
  created_at           timestamptz not null default now()
);

-- =====================================================================
-- 5. 온라인 도슨트 콘텐츠 (건별 판매형)
-- =====================================================================

create table docent_contents (
  id          uuid primary key default gen_random_uuid(),
  title       text not null,
  keywords    text,
  is_free     boolean not null default false,
  price       int not null default 3300,
  body_url    text,
  cover_image text,
  category    text not null check (category in ('silostore','salon')),
  figure_name text,   -- 특정 인물을 다루는 콘텐츠일 때만 값 존재. 예: "비발디 (1678-1741)"
                      -- /docent 페이지의 "인물로 보기" 보조 필터가 이 값으로 그룹핑함.
  era         text check (era in (
                'renaissance','baroque','rococo','neoclassic','empire','victorian',
                'art_nouveau','art_deco','beat_generation','counter_culture','digital'
              )),  -- EPIC-017: 살롱+사일로상점 공유 "온라인 도슨트 라이브러리"(/docent/collections)의
                    -- 하위 게시판(era) 분류. category(silostore/salon)와는 별개 축이며 기존 /docent
                    -- 페이지 동작에는 영향 없음. 앞의 8개 값은 items.category(Time Slip)와 동일한 슬러그.
                    -- 기존 콘텐츠는 전부 era=null(미분류) — 관리 화면이 없어 수동 태깅 필요.
  created_at  timestamptz not null default now()
);

create table docent_purchases (
  id                    uuid primary key default gen_random_uuid(),
  member_id             uuid not null references members(id),
  content_id            uuid not null references docent_contents(id),
  price_charged         int not null,
  discount_applied_pct  numeric(4,2) not null default 0,
  is_monthly_free        boolean not null default false,
  payment_status        text not null default 'pending_transfer' check (payment_status in ('pending_transfer','confirmed','cancelled')),
  purchased_at           timestamptz not null default now()
);

-- 콘텐츠별 구매 건수 집계 뷰. "인기글" 판단 기준(구매 수 많은 순)으로 사용.
-- poll_option_counts와 같은 패턴: docent_purchases의 본인 전용 RLS와 무관하게
-- 누구나(비회원 포함) 집계 수치만 조회 가능.
create view docent_content_popularity as
  select content_id, count(*)::int as purchase_count
  from docent_purchases
  group by content_id;

-- =====================================================================
-- 6. 커뮤니티 — 게시판 · 개인 페이지 · 포인트
-- =====================================================================

create table boards (
  id                  uuid primary key default gen_random_uuid(),
  name                text not null,
  category            text,  -- 계속 slug 역할(resolveBoardDefinition이 이 값으로 매칭) — EPIC-066에서도 의미 안 바뀜
  board_type          text not null check (board_type in (
                        'topic','group','patron','artist_promo',
                        'adoption_story','archive','qna'
                      )),  -- 권한 판정용(serverAuth.ts) — EPIC-066의 "Board Type"(렌더러 선택)과는 별개 축, 아래 render_type 참고
  min_rank_to_write   int references membership_tiers(rank) default 0,
  -- EPIC-066: 관리자 게시판 관리 화면에서 편집 가능한 설정 — 라이브 DB에는
  -- 아직 미적용, 아래 ALTER TABLE을 Supabase SQL Editor에서 직접 실행 필요.
  -- 전부 nullable/기본값 있음 → 기존 boardLayout.ts 하드코딩 값 위에 오버라이드로만
  -- 얹히므로(src/lib/boardLayout.ts의 applyAdminOverrides), 값이 없는 기존
  -- 게시판은 지금과 동일하게 렌더링된다(회귀 없음).
  is_public           boolean not null default true,
  group_key           text check (group_key in (
                        'community','gallery','membership','archive','studio',
                        'heritage','docent','mypage','silo_store'
                      )),
  render_type         text check (render_type in (
                        'story','community','gallery','timeline','survey',
                        'slide','calendar','application','collection','forum'
                      )),
  default_card_type   text check (default_card_type in ('list','thumbnail','gallery','carousel')),
  use_search          boolean not null default true,
  use_like            boolean not null default true,
  use_comment         boolean not null default true,
  use_view_count      boolean not null default true,
  default_page_size   int not null default 24 check (default_page_size in (12,24,48,100)),
  default_sort        text not null default 'latest' check (default_sort in (
                        'latest','views','popular','comments','oldest'
                      )),  -- SortOption(src/lib/boardLayout.ts)과 동일한 값 — "좋아요순"은 기존 코드 관례상 popular
  description         text,
  widget_settings     jsonb not null default '{}'::jsonb,
  -- EPIC-075: 관리자 트리 화면 드래그앤드롭 순서(docs/sql/EPIC-075-tree-sort-order.sql)
  sort_order          int not null default 0,
  -- EPIC-077: "사이트 구성 관리" 통합 트리의 게시판 관리 모달용 주제/대표
  -- 이미지 — site_navigations.topic/thumbnail_url과 별개 독립 컬럼
  -- (docs/sql/EPIC-077-board-topic-thumbnail.sql)
  topic               varchar,
  thumbnail_url       text
);

-- EPIC-066 ALTER TABLE — 라이브 DB(boards 이미 존재)에 위 신규 컬럼을 추가할 때
-- Supabase SQL Editor에서 그대로 실행:
--
-- alter table boards
--   add column if not exists is_public boolean not null default true,
--   add column if not exists group_key text check (group_key in (
--     'community','gallery','membership','archive','studio','heritage','docent','mypage','silo_store'
--   )),
--   add column if not exists render_type text check (render_type in (
--     'story','community','gallery','timeline','survey','slide','calendar','application','collection','forum'
--   )),
--   add column if not exists default_card_type text check (default_card_type in ('list','thumbnail','gallery','carousel')),
--   add column if not exists use_search boolean not null default true,
--   add column if not exists use_like boolean not null default true,
--   add column if not exists use_comment boolean not null default true,
--   add column if not exists use_view_count boolean not null default true,
--   add column if not exists default_page_size int not null default 24 check (default_page_size in (12,24,48,100)),
--   add column if not exists default_sort text not null default 'latest' check (default_sort in ('latest','views','popular','comments','oldest')),
--   add column if not exists description text,
--   add column if not exists widget_settings jsonb not null default '{}'::jsonb;
--
-- -- boards는 지금까지 select만 공개 정책이 있고 insert/update/delete 정책이
-- -- 없었음(관리자 CRUD 자체가 없었으므로) — EPIC-066 admin API가 쓰는
-- -- scopedClient(호출자 본인 토큰)가 통과하려면 admin bypass 정책이 필요:
-- create policy "boards_admin_write" on boards for all
--   using (exists (select 1 from members where auth_user_id = auth.uid() and is_admin = true))
--   with check (exists (select 1 from members where auth_user_id = auth.uid() and is_admin = true));

-- EPIC-077 ALTER TABLE — 라이브 DB에 topic/thumbnail_url 컬럼을 추가할 때
-- Supabase SQL Editor에서 그대로 실행(docs/sql/EPIC-077-board-topic-thumbnail.sql과 동일):
--
-- alter table boards
--   add column if not exists topic varchar,
--   add column if not exists thumbnail_url text;

-- 실제 라이브 DB의 boards 26행 전체 (2026-07-23 기준, 그대로 재확인됨)
insert into boards (name, category, board_type) values
  ('자유게시판', 'general', 'topic'),
  ('경제 클럽', 'economy', 'topic'),
  ('예술 클럽', 'art', 'topic'),
  ('세계역사 클럽', 'history', 'topic'),
  ('과학 클럽', 'science', 'topic'),
  ('코메디 클럽', 'comedy', 'topic'),
  ('문학 클럽', 'literature', 'topic'),
  ('건강 클럽', 'health', 'topic'),
  ('정치 클럽', 'politics', 'topic'),
  ('영화 클럽', 'movie', 'topic'),
  ('심리 클럽', 'psychology', 'topic'),
  ('스포츠 클럽', 'sports', 'topic'),
  ('인간 집사들 클럽', 'pets', 'topic'),
  ('따듯한 세상 클럽', 'warmth', 'topic'),
  ('월요반란 클럽 모임방', 'mon', 'group'),
  ('책 낭송 클럽 모임방', 'tue', 'group'),
  ('행간의 조각가 모임방', 'wed', 'group'),
  ('놀아보자 영어클럽 모임방', 'thu', 'group'),
  ('비포 선라이즈 소셜클럽 모임방', 'fri', 'group'),
  ('무슨일이든 일어날수있어 클럽 모임방', 'sat', 'group'),
  ('연극이 끝나고 난 뒤 클럽 모임방', 'sun', 'group'),
  ('패트론 라운지', 'patron', 'patron'),
  ('아티스트 홍보', 'promo', 'artist_promo'),
  ('After Adoption 분양 후 이야기', null, 'adoption_story'),
  ('자료게시판', null, 'archive'),
  ('질문과 답변', null, 'qna');
-- EPIC-048: Board Definition System(EPIC-047)으로 실제 게시판 20개(hub 3개
-- + story 17개) 생성. board_type CHECK 제약을 넓히는 대신(스키마 변경
-- 최소화) 기존 'topic'을 그대로 재사용하고, category 컬럼에 각 게시판의
-- slug를 담아 src/lib/boardLayout.ts의 resolveBoardDefinition()이 이
-- slug로 BoardDefinition을 찾게 한다 — 라이브 DB에는 아직 미적용,
-- Supabase SQL Editor에서 직접 실행 필요.
insert into boards (name, category, board_type) values
  ('Silo Store', 'silo-store', 'topic'),
  ('사일로 보물들', 'treasures', 'topic'),
  ('보물 목록', 'items', 'topic'),
  ('입양신청서 라이브러리', 'adoption-library', 'topic'),
  ('분양 후기', 'adoption-review', 'topic'),
  ('Online Docent', 'online-docent', 'topic'),
  ('르네상스', 'renaissance', 'topic'),
  ('바로크', 'baroque', 'topic'),
  ('로코코', 'rococo', 'topic'),
  ('신고전주의', 'neoclassicism', 'topic'),
  ('리젠시', 'regency', 'topic'),
  ('빅토리아', 'victoria', 'topic'),
  ('아르누보', 'art-nouveau', 'topic'),
  ('아르데코', 'art-deco', 'topic'),
  ('비트 세대', 'beat-generation', 'topic'),
  ('카운터 컬처', 'counter-culture', 'topic'),
  ('디지털', 'digital', 'topic'),
  ('Heritage', 'heritage', 'topic'),
  ('Grandmas', 'grandmas', 'topic'),
  ('Grandpas', 'grandpas', 'topic');
-- 참고: 'silo-store'/'online-docent'/'heritage' 3개는 boardType=hub라
--       실제로 글을 쓰지 않는 집계 전용 게시판이지만, `/boards/[id]`
--       라우트로 주소를 갖기 위해(새 페이지를 만들지 않고 기존 라우트를
--       재사용하기 위해) boards 행 자체는 다른 게시판과 동일하게 만든다.

-- EPIC-049: Salon des Cent(살롱데상) Community 영역 — 신규 게시판 10개만
-- 새로 INSERT한다. "주제별 소통 게시판"(13개 클럽: economy/art/history/...)과
-- "요일별 클럽"(7개: mon/tue/.../sun)은 위 26행 원본 시드에 이미 존재하는
-- board_type='topic'/'group' 행을 그대로 재사용하므로 여기서 다시 만들지
-- 않는다 — src/lib/boardLayout.ts의 INDIVIDUAL_BOARD_DEFINITIONS가 그
-- 기존 category 값(economy/art/.../mon/tue/...)을 slug로 그대로 참조해
-- salon-topics/salon-weekday hub의 자식으로 재분류할 뿐이다. 라이브
-- DB에는 아직 미적용, Supabase SQL Editor에서 직접 실행 필요.
insert into boards (name, category, board_type) values
  ('Community', 'community', 'topic'),
  ('출석체크 / 예술가의 달력', 'attendance', 'topic'),
  ('자유게시판', 'free', 'topic'),
  ('주제별 소통 게시판', 'salon-topics', 'topic'),
  ('요일별 클럽', 'salon-weekday', 'topic'),
  ('월별 모임', 'monthly-salon', 'topic'),
  ('설문 [우리들 맴]', 'survey', 'topic'),
  ('공연 / 전시회 소개', 'events', 'topic'),
  ('이벤트 공지', 'notice', 'topic'),
  ('Q&A 고민 게시판', 'qna', 'topic');
-- 참고: 'community'/'salon-topics'/'salon-weekday'/'survey' 4개는
--       boardType=hub — 위 'silo-store' 등과 동일한 이유로 실제 글쓰기
--       없이 자식 게시판 집계 전용이다.
-- 참고: 이 category='qna' 행은 board_type='qna'(질문과 답변, category=null)
--       원본 게시판과는 다른 별개 게시판이다 — 지시문이 "Q&A 고민 게시판"을
--       Community 하위에 새로 요구해 slug만 우연히 같은 문자열("qna")을
--       썼을 뿐, resolveBoardDefinition()은 category가 null인 원본 행과
--       category='qna'인 이 행을 서로 다른 정의로 정확히 구분한다.

-- EPIC-050: Salon des Cent의 Membership/Gallery/Archive 영역 — 신규
-- 게시판 17개 전부 새 DB 행(이번엔 재사용할 기존 행이 없음). 라이브
-- DB에는 아직 미적용, Supabase SQL Editor에서 직접 실행 필요.
insert into boards (name, category, board_type) values
  ('Membership', 'membership', 'topic'),
  ('나의 보물 이야기', 'my-treasures', 'topic'),
  ('나의 아티스트 소개', 'artist-intro', 'topic'),
  ('마음일기', 'mind-diary', 'topic'),
  ('패트론 게시판', 'patron-board', 'topic'),
  ('한문장 소설 프로젝트', 'one-line-novel', 'topic'),
  ('비밀의 방 도슨트', 'secret-room-docent', 'topic'),
  ('Gallery', 'gallery', 'topic'),
  ('시상식', 'awards', 'topic'),
  ('공연들', 'performances', 'topic'),
  ('파티', 'parties', 'topic'),
  ('운명의 방문자들', 'gallery-visitors', 'topic'),
  ('패트론들', 'patrons', 'topic'),
  ('Archive', 'archive', 'topic'),
  ('소개지', 'brochure', 'topic'),
  ('포스터', 'poster', 'topic'),
  ('타임라인', 'timeline', 'topic');
-- 참고: 'membership'/'gallery'/'archive' 3개는 boardType=hub — 위
--       'silo-store' 등과 동일한 이유로 실제 글쓰기 없이 자식 게시판
--       집계 전용이다.
-- 참고: 'patron-board'는 src/lib/boardLayout.ts에서 accessLevel:"patron"이
--       지정돼 있어, src/lib/serverAuth.ts의 canReadBoard/canWriteToBoard가
--       board_type='topic'과 무관하게 실제로 패트론 등급 미만의 읽기/쓰기를
--       막는다(이 EPIC에서 유일하게 실제 인가 로직이 연결된 게시판).
-- 참고: 'secret-room-docent'는 accessLevel:"secret_room"만 지정돼 있고
--       아직 실제 인가 로직은 연결하지 않았다(구조만 유지, NEXT_TASK.md 참고).
-- 참고: 'awards'/'performances'/'parties'/'gallery-visitors'/'patrons'는
--       기존 /salon/gallery/{awards,performances,parties,visitors,patrons}
--       ComingSoon 페이지와 같은 주제를 다루는 실제 게시판이다 — 그
--       ComingSoon 페이지 자체는 이번 EPIC에서 건드리지 않음(NEXT_TASK.md 참고).

-- EPIC-051: Studio(공간 문의) 영역 — 신규 게시판 5개. 라이브 DB에는 아직
-- 미적용, Supabase SQL Editor에서 직접 실행 필요.
insert into boards (name, category, board_type) values
  ('Studio', 'studio', 'topic'),
  ('공간 촬영 대관 (1층 사일로상점)', 'studio-1f', 'topic'),
  ('공간 촬영 대관 (2층 살롱데상)', 'studio-2f', 'topic'),
  ('물품 대여', 'rental', 'topic'),
  ('공간 스타일링', 'styling', 'topic');
-- 참고: 'studio'는 boardType=hub — 위 'silo-store' 등과 동일한 이유로
--       실제 글쓰기 없이 자식 게시판(1F/2F 대관, 물품 대여, 스타일링)
--       집계 전용이다.
-- 참고: 이 4개 게시판(studio-1f/studio-2f/rental/styling)은 새 예약
--       시스템을 만들지 않고 src/lib/boardLayout.ts의 BoardDefinition.ctas
--       필드로 "문의하기"/"예약하기" 버튼이 기존 실제 페이지(/rental,
--       /space-inquiry/item-rental, /space-inquiry/styling)로 그대로
--       연결된다 — 이 boards 행 자체(게시판 콘텐츠: 공간 소개/이용
--       안내/촬영 사례/FAQ 등)와 실제 예약/신청 처리(기존 rental_bookings,
--       styling_projects 등)는 서로 다른 시스템이며 이 EPIC은 후자를
--       전혀 건드리지 않는다.
-- 참고: 'styling' 게시판의 "대표 프로젝트"는 별도 DB 없이 기존
--       styling_projects를 이미 보여주는 /shop/projects 페이지를 그대로
--       링크(ctas)로 재사용한다 — styling_projects 테이블/API는 변경 없음.

-- 참고: 'patron'/'artist_promo' 보드는 min_rank_to_write가 각각 3/99로
--       DB에 설정돼 있음 (기본값 0이 아님) — 실제 글쓰기 가능 여부는
--       min_rank_to_write가 아니라 src/lib/serverAuth.ts의
--       canWriteToBoard()가 board_type별로 판정함.

create table posts (
  id              uuid primary key default gen_random_uuid(),
  board_id        uuid references boards(id),
  author_id       uuid not null references members(id),
  title           text,
  body            text,  -- EPIC-052부터 Board Definition 게시판 글쓰기(Tiptap Block Editor)는 여기에 HTML 문자열을 저장(컬럼 타입/이름 변경 없음). 그 전에 작성된 글은 여전히 plain text — 렌더링 쪽(PostBody.tsx)이 태그 포함 여부로 자동 분기.
  is_docent_post  boolean not null default false,
  visibility      text not null default 'public' check (visibility in ('public','private','friends')),
  like_count      int not null default 0,
  is_best         boolean not null default false,
  photo_url       text,               -- 개인 페이지(마이피드) 글의 첨부 사진
  order_id        uuid references orders(id),  -- After Adoption 후기가 어떤 구매 건에 대한 글인지 연결
  is_hidden       boolean not null default false,  -- 관리자 전용 숨김 플래그(EPIC-031). 작성자 본인의 visibility='private' 설정과는 별개 — 라이브 DB에는 아직 미적용, Supabase SQL Editor에서 ALTER TABLE 직접 실행 필요.
  view_count      int not null default 0,  -- 조회수(Board Engine, EPIC-047). 상세 조회 시마다 증가 — 라이브 DB에는 아직 미적용.
  tags            text[] not null default '{}'::text[],  -- 태그(Board Engine, EPIC-047). 글쓰기 폼에서 쉼표로 구분 입력 — 라이브 DB에는 아직 미적용.
  updated_at      timestamptz not null default now(),  -- 수정일(Board Engine, EPIC-047). 게시글 수정 기능 자체가 아직 없어 현재는 항상 created_at과 동일값 — 라이브 DB에는 아직 미적용.
  created_at      timestamptz not null default now()
);

create table comments (
  id          uuid primary key default gen_random_uuid(),
  post_id     uuid not null references posts(id) on delete cascade,
  author_id   uuid not null references members(id),
  body        text not null,
  created_at  timestamptz not null default now()
);

create table likes (
  id          uuid primary key default gen_random_uuid(),
  post_id     uuid not null references posts(id) on delete cascade,
  member_id   uuid not null references members(id),
  created_at  timestamptz not null default now(),
  unique (post_id, member_id)
);

create table points_ledger (
  id          uuid primary key default gen_random_uuid(),
  member_id   uuid not null references members(id),
  reason      text not null check (reason in (
                'post','comment','like_received','best_post',
                'shop_purchase','shop_rental','venue_rental',
                'club_participation','attendance'
              )),
  points      int not null,
  related_id  uuid,
  created_at  timestamptz not null default now()
);

-- =====================================================================
-- 7. 출석체크
-- =====================================================================

create table daily_checkins (
  id            uuid primary key default gen_random_uuid(),
  member_id     uuid not null references members(id),
  checkin_date  date not null,
  created_at    timestamptz not null default now(),
  unique (member_id, checkin_date)
);

-- =====================================================================
-- 8. 설문조사
-- =====================================================================

create table polls (
  id          uuid primary key default gen_random_uuid(),
  question    text not null,
  created_by  uuid not null references members(id),
  is_active   boolean not null default true,
  created_at  timestamptz not null default now()
);

create table poll_options (
  id          uuid primary key default gen_random_uuid(),
  poll_id     uuid not null references polls(id) on delete cascade,
  label       text not null,
  sort_order  int not null default 0
);

create table poll_votes (
  id          uuid primary key default gen_random_uuid(),
  poll_id     uuid not null references polls(id) on delete cascade,
  option_id   uuid not null references poll_options(id) on delete cascade,
  member_id   uuid not null references members(id),
  created_at  timestamptz not null default now(),
  unique (poll_id, member_id)
);

-- 개별 투표(누가 무엇을 찍었는지)는 비공개, 집계 결과만 공개하기 위한 뷰.
-- anon/authenticated에 select 권한을 grant하여, poll_votes 테이블 자체의
-- RLS(본인+관리자만 조회)와 별개로 이 뷰를 통해서는 누구나 득표수를 볼 수 있음.
create view poll_option_counts as
  select poll_id, option_id, count(*)::int as vote_count
  from poll_votes
  group by poll_id, option_id;

-- =====================================================================
-- 9. 자료 다운로드
-- =====================================================================

create table downloads (
  id            uuid primary key default gen_random_uuid(),
  title         text not null,
  description   text,
  file_url      text not null,
  uploaded_by   uuid not null references members(id),
  created_at    timestamptz not null default now()
);

-- =====================================================================
-- 10. 공간 스타일링 포트폴리오 (사일로상점, EPIC-016)
--    기존 게시판(boards/posts)과 무관한 전용 테이블. 공개 콘텐츠 —
--    비회원도 열람 가능(공개 read RLS). 등록/수정/삭제는 관리자(is_admin)
--    전용 — /api/styling-projects Route Handler가 사용 (TASK-016-2).
--    styling_project_media/items는 select 공개, insert/delete는 관리자 전용
--    (/admin/projects/new 등록 화면 · TASK-016-5). update 정책은 아직 없음
--    (수정 화면은 아직 없어서 — 필요해지면 추가할 것).
-- =====================================================================

create table styling_projects (
  id                     uuid primary key default gen_random_uuid(),
  client_name            text not null,
  industry               text not null check (industry in (
                           'photo_studio','perfume_shop','doll_shop','pizza_shop','other'
                         )),
  industry_other_label   text,   -- industry = 'other'일 때만 값 존재
  concept                text not null,
  location               text,
  cover_image            text,
  project_date           date,
  created_at             timestamptz not null default now()
);

create table styling_project_media (
  id            uuid primary key default gen_random_uuid(),
  project_id    uuid not null references styling_projects(id),
  media_type    text not null check (media_type in ('photo','video')),
  media_url     text not null,
  caption       text,
  sort_order    int not null default 0
);

create table styling_project_items (
  id            uuid primary key default gen_random_uuid(),
  project_id    uuid not null references styling_projects(id),
  item_id       uuid references items(id) on delete set null  -- 물품 삭제 시 링크만 끊김(SET NULL), 프로젝트/미디어는 그대로 유지
);

-- =====================================================================
-- 11. 마이페이지 확장 — 컬렉션 / 팔로우 / 배지 / 방문자 기록 (EPIC-022)
--    /mypage 11개 탭 재구성을 위해 신설. "나의 살롱"/"나의 도슨트 수료증"/
--    "나의 공간"/"나의 전시회"/"타임라인" 5개 탭은 이번 EPIC에서 데이터
--    소스가 지정되지 않아 테이블을 만들지 않았음 — UI에서는 Empty State만
--    표시함(추측성 테이블 생성 방지, PROJECT_BLUEPRINT.md TODO 참고).
-- =====================================================================

-- "나의 컬렉션" 9개 서브메뉴 중 "나의 보물"을 제외한 8개(책/영화/음악/예술가/
-- 장소/향기/브랜드/시대)의 회원 작성 콘텐츠. "나의 보물"은 기존 orders를
-- 그대로 재사용하므로 별도 테이블 없음.
create table member_collections (
  id          uuid primary key default gen_random_uuid(),
  member_id   uuid not null references members(id) on delete cascade,
  category    text not null check (category in (
                'book','movie','music','artist','place','scent','brand','era'
              )),
  title       text not null,
  description text,
  image_url   text,
  created_at  timestamptz not null default now()
);

-- 팔로우 관계. 복합 PK로 중복 팔로우 자체를 DB 레벨에서 방지.
-- ⚠️ 이번 EPIC 범위(마이페이지 조회 전용)에는 팔로우 버튼 UI가 포함되지
-- 않아, 실제로 이 테이블에 행을 적재하는 쓰기 경로는 아직 없음(추후 별도
-- 작업에서 /u/[memberId] 등에 팔로우 버튼을 추가할 때 사용 예정).
create table member_follows (
  follower_id   uuid not null references members(id) on delete cascade,
  following_id  uuid not null references members(id) on delete cascade,
  created_at    timestamptz not null default now(),
  primary key (follower_id, following_id),
  check (follower_id <> following_id)
);

-- 배지. 부여(insert)는 관리자만 가능하도록 설계(포인트 적립과 달리 자기
-- 자신에게 자가 귀속시킬 수 있는 액션이 아니므로) — 배지 자동 지급 로직은
-- 이번 EPIC 범위 밖(조회 UI만 구현).
create table member_badges (
  id          uuid primary key default gen_random_uuid(),
  member_id   uuid not null references members(id) on delete cascade,
  badge_name  text not null,
  granted_at  timestamptz not null default now()
);

-- 방문자 기록. owner_id(방문받은 사람)/visitor_id(방문한 사람) 둘 다 members
-- 참조. ⚠️ member_follows와 마찬가지로 실제 방문 시 이 테이블에 행을 쓰는
-- 로직(예: /u/[memberId] 방문 시 insert)은 이번 EPIC 범위 밖 — 조회 UI만
-- 구현되어 있어 당장은 항상 빈 목록으로 보임.
create table member_visitors (
  id          uuid primary key default gen_random_uuid(),
  owner_id    uuid not null references members(id) on delete cascade,
  visitor_id  uuid not null references members(id) on delete cascade,
  visited_at  timestamptz not null default now()
);

-- 버킷리스트(EPIC-052). member_collections와 동일한 own-row 전용 패턴 —
-- 라이브 DB에는 아직 미적용, Supabase SQL Editor에서 직접 실행 필요.
create table member_bucket_list (
  id          uuid primary key default gen_random_uuid(),
  member_id   uuid not null references members(id) on delete cascade,
  year        int not null,
  title       text not null,
  is_done     boolean not null default false,
  created_at  timestamptz not null default now()
);

-- =====================================================================
-- 12. 동적 네비게이션 / 카테고리 CMS (EPIC-023)
--    src/lib/navConfig.ts에 하드코딩되어 있던 상단 탭/사이드바/드롭다운
--    구조와, 여러 화면에 흩어져 있던 카테고리 목록(Time Slip 8종, 도슨트
--    era 11종, 마이페이지 컬렉션 8종, 살롱 게시판 13종)을 DB로 옮기고
--    /admin/navigation에서 관리자가 직접 편집할 수 있게 함. 라이브 DB에는
--    아직 미적용 — Supabase SQL Editor에서 직접 실행 필요.
-- =====================================================================

-- 상단 탭/사이드바 그룹/링크 항목을 하나의 자기참조 트리로 표현.
-- parent_id가 null이면 최상위 탭. key는 최상위 탭에만 부여(getActiveNavTabKey
-- 판정용 문자열, src/lib/navConfig.ts와 1:1 대응) — 하위 그룹/항목은 null.
create table site_navigations (
  id            uuid primary key default gen_random_uuid(),
  key           text unique,
  title         text not null,
  href          text,
  parent_id     uuid references site_navigations(id) on delete cascade,
  target_type   text not null check (target_type in ('tab','sidebar_left','sidebar_right','dropdown')),
  sort_order    int not null default 0,
  is_active     boolean not null default true,
  topic         varchar,          -- EPIC-035: 주제/태그. 라이브 DB에는 아직 미적용(아래 ALTER TABLE 참고)
  thumbnail_url text,             -- EPIC-035: 관리자 CMS "관리" 모달에서 Supabase Storage(public-assets)로 업로드한 대표 이미지
  description   text,            -- EPIC-035: 카테고리 소개
  is_public     boolean not null default true,  -- EPIC-035: "공개 설정" — is_active(내비 자체 노출)와는 별개 필드
  created_at    timestamptz not null default now()
);

-- 상점/살롱/컬렉션/도슨트 카테고리. 현재 시드 데이터는 전부 parent_id=null
-- (기존 하드코딩 데이터가 원래 평평한 목록이었기 때문) — 상하위 구조 자체는
-- 스키마/관리자 UI가 지원하므로 추후 하위 카테고리를 추가할 수 있음.
create table site_categories (
  id          uuid primary key default gen_random_uuid(),
  domain      text not null check (domain in ('shop','salon','collection','docent')),
  parent_id   uuid references site_categories(id) on delete cascade,
  name        text not null,
  slug        text not null,
  sort_order  int not null default 0,
  is_active   boolean not null default true,
  created_at  timestamptz not null default now()
);

-- site_navigations 시드: EPIC-095(요구사항 1.1) — Management API로 라이브 DB를
-- 직접 재조회해(2026-08-12) 생성한 실제 상태 그대로의 덤프(id 포함, 총 125행 —
-- 활성 119행 + 비활성 6행). 이전엔 EPIC-019 초기 하드코딩을 그대로 옮긴 가상의
-- CTE 시드였고(라이브에 한 번도 적용된 적 없음, EPIC-080에서 이미 이 사실을
-- 확인해 문서화), 그 사이 라이브는 관리자 CMS로 완전히 다른 트리로 진화했다
-- (About Silo 최상위 탭 신설, 사일로상점/살롱데상 href 변경, 온라인 도슨트가
-- 최상위 탭으로 독립 + 하위 트리가 /docent/<era> 평면 구조에서 /online-docent/
-- <시대구간>/<era> 2단 구조로 재편 등). 아래 값은 id를 그대로 보존한 진짜 라이브
-- 데이터라 부모->자식 순서로 실행하면 그대로 유효한 INSERT이기도 하지만, 이
-- 파일의 목적은 재실행이 아니라 정확한 스냅샷 문서화다 -- 다시 드리프트될 수
-- 있으니 실제 최신 상태가 필요하면 Management API로 재조회할 것.

insert into site_navigations (id, key, title, href, parent_id, target_type, sort_order, is_active, topic, thumbnail_url, description, is_public, created_at) values
('877a1576-9612-420d-9a99-fb7d48320e3f', null, 'About Silo', '/about-silo', null, 'dropdown', 0, true, null, null, null, true, '2026-07-31 15:03:10.409021+00'),
('5b468396-a4ce-485c-a534-4be2c9675191', null, 'Silo Timeline 사일로 타임라인', '/about-silo/silo-timeline', '877a1576-9612-420d-9a99-fb7d48320e3f', 'dropdown', 0, true, null, null, null, true, '2026-08-10 02:36:02.659877+00'),
('a4575b33-a416-471f-942b-e27e29bef906', null, 'Silo daily 사일로의 하루들', '/about-silo/silo-daily', '877a1576-9612-420d-9a99-fb7d48320e3f', 'tab', 1, true, null, null, null, true, '2026-07-31 15:11:10.420932+00'),
('3afedab2-69cc-4886-b00b-7be4de8d3850', null, '수미의 good n book n ', '/about-silo/sumi-good-n-book-n', '877a1576-9612-420d-9a99-fb7d48320e3f', 'tab', 2, true, null, null, null, true, '2026-07-31 15:11:28.847143+00'),
('8c8af744-3f00-444f-b0c1-03f2a56dd05c', null, '에단의 블루노트 bluenotes', '/about-silo/ethan-bluenotes', '877a1576-9612-420d-9a99-fb7d48320e3f', 'tab', 3, true, null, null, null, true, '2026-07-31 15:13:09.697807+00'),
('384d6196-f3fb-433a-816e-a90c0296a784', null, '사일로의 취향 Silo''s Favorites', '/about-silo/silo-favorites', '877a1576-9612-420d-9a99-fb7d48320e3f', 'sidebar_left', 4, true, null, null, null, true, '2026-07-31 14:49:49.094019+00'),
('a129ce5f-e011-4282-b56a-dda68968b0a0', null, '사일로의 플레이리스트 Playlists', '/about-silo/silo-favorites/silo-playlists', '384d6196-f3fb-433a-816e-a90c0296a784', 'sidebar_left', 0, true, null, null, null, true, '2026-07-31 14:52:11.384075+00'),
('287c9244-ae9c-4f79-8755-66fd0429bfe6', null, '사일로의 맛집 Restaurants', '/about-silo/silo-favorites/silo-restaurants', '384d6196-f3fb-433a-816e-a90c0296a784', 'sidebar_left', 1, true, null, null, null, true, '2026-07-31 14:52:13.278591+00'),
('2f0f56d0-c953-4d84-9ae6-28416ff8b23b', null, '사일로의 전시 Exhibitions', '/about-silo/silo-favorites/silo-exhibitions', '384d6196-f3fb-433a-816e-a90c0296a784', 'sidebar_left', 2, true, null, null, null, true, '2026-07-31 14:52:14.460183+00'),
('007a1b0c-87ba-4882-ba68-99dbc7577bb9', null, '사일로의 책 Book Reviews', '/about-silo/silo-favorites/silo-book-reviews', '384d6196-f3fb-433a-816e-a90c0296a784', 'sidebar_left', 3, true, null, null, null, true, '2026-07-31 14:54:41.546733+00'),
('856d5b2c-790d-40a4-8091-13b0482fad97', null, '사일로의 장소 Places', '/about-silo/silo-favorites/silo-places', '384d6196-f3fb-433a-816e-a90c0296a784', 'sidebar_left', 4, true, null, null, null, true, '2026-07-31 14:55:58.65531+00'),
('ffd2838c-3957-497f-ac21-0a2939a16e2e', null, '사일로의 아이템들 items', '/about-silo/silo-favorites/silo-items', '384d6196-f3fb-433a-816e-a90c0296a784', 'sidebar_left', 5, true, null, null, null, true, '2026-07-31 14:56:57.40687+00'),
('d30d149d-9d53-4342-924d-90e09b756e72', 'silostore', '사일로 상점 Silo Store', '/silo-store', null, 'sidebar_left', 1, true, null, null, null, true, '2026-07-25 23:38:27.460307+00'),
('b7e7e0a7-e8fa-48cb-91c8-49f4f92a99d6', null, '사일로 보물들', '/silo-store/treasures', 'd30d149d-9d53-4342-924d-90e09b756e72', 'sidebar_left', 0, true, null, null, null, true, '2026-07-25 23:38:27.460307+00'),
('2febc40e-0626-4e7f-8bfe-4e7da9c5a574', null, '사일로의 뮤즈 silo''s muses', '/silo-store/treasures/silo-muse', 'd30d149d-9d53-4342-924d-90e09b756e72', 'sidebar_left', 1, true, null, null, null, true, '2026-07-25 23:38:27.460307+00'),
('03a2fb72-9fce-4d27-89cd-ff6571ae4771', null, '사일로의 천사들 Silo Angels', '/silo-store/treasures/silo-angels', 'd30d149d-9d53-4342-924d-90e09b756e72', 'sidebar_left', 2, true, null, null, null, true, '2026-07-25 23:38:27.460307+00'),
('0b7995bc-07cc-4433-97c3-1216ad89827f', null, '보내기 전 마지막 사진 last photos', '/silo-store/treasures/last-photos', 'd30d149d-9d53-4342-924d-90e09b756e72', 'sidebar_left', 3, true, null, null, null, true, '2026-08-08 13:23:50.775966+00'),
('33ac27f9-8f29-464c-a9ba-aef7d770b3c8', null, '입양신청서 라이브러리', '/silo-store/treasures/shop-adoption-library', 'd30d149d-9d53-4342-924d-90e09b756e72', 'sidebar_left', 4, true, null, null, null, true, '2026-07-27 06:12:54.048041+00'),
('ef68cab2-9bff-4426-b99b-060cba2ed278', null, '입양 이후 After Adoption', '/silo-store/treasures/after-adoption', 'd30d149d-9d53-4342-924d-90e09b756e72', 'sidebar_left', 5, true, null, null, null, true, '2026-07-29 12:23:54.00107+00'),
('7ddd52d4-53d4-4b6a-bc6a-116ba78526a2', null, 'Silo''s Original Owners 사일로의 원래 주인들', '/silo-original-owners', 'd30d149d-9d53-4342-924d-90e09b756e72', 'dropdown', 6, true, null, null, null, true, '2026-08-10 13:39:33.600492+00'),
('88ecbd7b-e700-4a24-941d-53a3b6e72038', null, '할머니 Grandmas', '/silo-store/heritage/grandmas', '7ddd52d4-53d4-4b6a-bc6a-116ba78526a2', 'sidebar_left', 0, true, null, null, null, true, '2026-07-25 23:38:27.460307+00'),
('37f2b93e-15ed-43ce-a3c8-66dc1801f9d8', null, '할아버지 Grandpas', '/silo-store/heritage/grandpas', '7ddd52d4-53d4-4b6a-bc6a-116ba78526a2', 'sidebar_left', 1, true, null, null, null, true, '2026-07-25 23:38:27.460307+00'),
('710a8240-7b38-4480-bb9f-ea421e431d57', 'docent', '온라인 도슨트 Online Docent', '/online-docent', null, 'dropdown', 2, true, null, null, null, true, '2026-07-25 23:38:27.460307+00'),
('f7008a1a-b4fb-46b0-b780-601730794b41', null, '고대 ~ 왕정 Ancient ~ Monarchy ', '/online-docent/ancient-monarchy', '710a8240-7b38-4480-bb9f-ea421e431d57', 'sidebar_left', 0, true, null, null, null, true, '2026-08-11 05:28:27.995243+00'),
('9238ace9-c444-471f-ac9e-0067075c001d', null, 'BC 1100~146 그리스 Greeks', '/online-docent/ancient-monarchy/greeks', 'f7008a1a-b4fb-46b0-b780-601730794b41', 'sidebar_left', 0, true, null, null, null, true, '2026-07-31 15:06:48.657485+00'),
('8fa3c1ef-c6aa-405e-a19c-37e9c02dc294', null, '1350~1600 르네상스 Renaissance', '/online-docent/ancient-monarchy/renaissance', 'f7008a1a-b4fb-46b0-b780-601730794b41', 'sidebar_left', 1, true, null, null, null, true, '2026-07-25 23:38:27.460307+00'),
('71afe465-8383-48d7-8e4c-5d831e813b51', null, '1600~1750 바로크 Baroque', '/online-docent/ancient-monarchy/baroque', 'f7008a1a-b4fb-46b0-b780-601730794b41', 'sidebar_left', 2, true, null, null, null, true, '2026-07-25 23:38:27.460307+00'),
('2ce0ba78-a566-4230-baed-8cea2f640011', null, '1715~1780 로코코 Rococo', '/online-docent/ancient-monarchy/rococo', 'f7008a1a-b4fb-46b0-b780-601730794b41', 'sidebar_left', 3, true, null, null, null, true, '2026-07-25 23:38:27.460307+00'),
('44efc420-49d1-45fa-b493-21aff2b93c05', null, '혁명 ~ 제국 Revolution ~ Empire', '/online-docent/revolution-empire', '710a8240-7b38-4480-bb9f-ea421e431d57', 'sidebar_left', 1, true, null, null, null, true, '2026-08-11 06:55:06.612539+00'),
('1e9928b0-c8a1-4b27-8d70-0af3b5980b0c', null, '1750~1850 신고전주의 NeoClassicism', '/online-docent/revolution-empire/neoclassicism', '44efc420-49d1-45fa-b493-21aff2b93c05', 'sidebar_left', 0, true, null, null, null, true, '2026-07-25 23:38:27.460307+00'),
('69da478e-a3d6-4cc0-8083-8d16542c33fb', null, '1795~1837 리전시 Regency', '/online-docent/revolution-empire/regency', '44efc420-49d1-45fa-b493-21aff2b93c05', 'sidebar_left', 1, true, null, null, null, true, '2026-07-25 23:38:27.460307+00'),
('845698f1-cdfa-4856-b069-18e0fa0b9f97', null, '1837~1901 빅토리안 Victorian', '/online-docent/revolution-empire/victoria', '44efc420-49d1-45fa-b493-21aff2b93c05', 'sidebar_left', 2, true, null, null, null, true, '2026-07-25 23:38:27.460307+00'),
('64472418-cf04-402b-8ab2-81f5b52dc238', null, '1860~1890 인상파 Impressionism', '/online-docent/revolution-empire/impressionism', '44efc420-49d1-45fa-b493-21aff2b93c05', 'sidebar_left', 3, true, null, null, null, true, '2026-08-11 03:54:02.592693+00'),
('76dfcca8-efee-4b4f-8db8-c2c6337ed002', null, '프로이트~ 인공지능 Freud~A.I.', '/online-docent/freud-ai', '710a8240-7b38-4480-bb9f-ea421e431d57', 'sidebar_left', 2, true, null, null, null, true, '2026-08-11 07:02:28.24872+00'),
('12c14110-5242-4c43-b1ab-3835b94e987a', null, '1890~1920 아르누보 Art Nouveau', '/online-docent/freud-ai/art-nouveau', '76dfcca8-efee-4b4f-8db8-c2c6337ed002', 'sidebar_left', 0, true, null, null, null, true, '2026-07-25 23:38:27.460307+00'),
('500b09ff-e9cf-4bdd-a83a-aed3fd907bb7', null, '1920~1940 아르데코 Art Deco', '/online-docent/freud-ai/art-deco', '76dfcca8-efee-4b4f-8db8-c2c6337ed002', 'sidebar_left', 1, true, null, null, null, true, '2026-07-25 23:38:27.460307+00'),
('d806e2e9-ccc9-4413-b596-a0157ac4203f', null, '1940~1960 비트 세대 Beat Generation', '/online-docent/freud-ai/beat-generation', '76dfcca8-efee-4b4f-8db8-c2c6337ed002', 'sidebar_left', 2, true, null, null, null, true, '2026-07-25 23:38:27.460307+00'),
('a2909bfd-922d-471d-8586-a20d92275049', null, '1960~1980 반문화 CounterCulture', '/online-docent/freud-ai/counterculture', '76dfcca8-efee-4b4f-8db8-c2c6337ed002', 'sidebar_left', 3, true, null, null, null, true, '2026-07-25 23:38:27.460307+00'),
('bbbae4b3-10e0-4b34-8023-f27bb623ba75', null, '1980~2000 대중 문화 Pop Culture', '/online-docent/freud-ai/pop-culture', '76dfcca8-efee-4b4f-8db8-c2c6337ed002', 'sidebar_left', 4, true, null, null, null, true, '2026-07-25 23:38:27.460307+00'),
('21a3845d-1c5e-4dc3-a928-44269f3e98b6', null, '2020~현재, 디지털 문화 digital culture', '/online-docent/freud-ai/digital-culture', '710a8240-7b38-4480-bb9f-ea421e431d57', 'sidebar_left', 3, true, null, null, null, true, '2026-08-11 07:21:17.697308+00'),
('e9ab4e8d-a18f-4322-809b-d089b45f49dc', 'salon', '살롱데상 Salon des Cent', '/salon-des-cent', null, 'sidebar_right', 3, true, null, null, null, true, '2026-07-25 23:38:27.460307+00'),
('b6e1117a-4048-44ca-9725-c6fa32843713', null, '커뮤니티 Community', '/salon-des-cent/community', 'e9ab4e8d-a18f-4322-809b-d089b45f49dc', 'sidebar_right', 0, true, null, null, null, true, '2026-07-25 23:38:27.460307+00'),
('18628c35-1515-4a0f-bf6a-48dfdf4b93b4', null, '출석체크 / 예술가의 달력', '/salon-des-cent/community/attendance', 'b6e1117a-4048-44ca-9725-c6fa32843713', 'sidebar_right', 0, true, null, null, null, true, '2026-07-25 23:38:27.460307+00'),
('11fb321e-9d37-4523-abe1-f37c9a9f9583', null, '자유게시판', '/salon-des-cent/community/general', 'b6e1117a-4048-44ca-9725-c6fa32843713', 'sidebar_right', 1, true, null, null, null, true, '2026-07-25 23:38:27.460307+00'),
('dbe9b5e8-75b8-4a4f-9143-6afc7feaad1b', null, '나의 맛집들', '/salon-des-cent/community/my-restaurants', 'b6e1117a-4048-44ca-9725-c6fa32843713', 'sidebar_right', 2, true, null, null, null, true, '2026-08-07 01:35:20.199018+00'),
('5d53b52d-45ff-4b05-bc9f-56cb4692e859', null, '설문 [우리들 맴]', '/salon-des-cent/community/polls', 'b6e1117a-4048-44ca-9725-c6fa32843713', 'sidebar_right', 3, true, null, null, null, true, '2026-07-25 23:38:27.460307+00'),
('bce2560e-ecf2-4f8b-9f4b-b9a4ffe246e3', null, '공연 / 전시회 소개', '/salon-des-cent/community/events', 'b6e1117a-4048-44ca-9725-c6fa32843713', 'sidebar_right', 4, true, null, null, null, true, '2026-07-27 05:46:11.78328+00'),
('2ff85bc5-1b6b-4526-baba-0b7c1f88f518', null, '이벤트 공지', '/salon-des-cent/community/event-notices', 'b6e1117a-4048-44ca-9725-c6fa32843713', 'sidebar_right', 5, true, null, null, null, true, '2026-07-25 23:38:27.460307+00'),
('32db4897-72e1-4105-a110-05c5c27ce37b', null, 'Q&A', '/salon-des-cent/community/qna', 'b6e1117a-4048-44ca-9725-c6fa32843713', 'sidebar_right', 6, true, null, null, null, true, '2026-07-25 23:38:27.460307+00'),
('52e90164-5bb4-4fc8-aa1f-8473bc8664b6', null, '주제별 클럽 게시판 A', '/salon-des-cent/community/topics-A', 'e9ab4e8d-a18f-4322-809b-d089b45f49dc', 'sidebar_right', 1, true, null, null, null, true, '2026-07-25 23:38:27.460307+00'),
('56089910-d64e-4e53-b6c9-2e37194d5891', null, '예술 Art', '/salon-des-cent/community/topics-A/art', '52e90164-5bb4-4fc8-aa1f-8473bc8664b6', 'sidebar_right', 0, true, null, null, null, true, '2026-07-29 04:25:37.012689+00'),
('c5095f38-e04f-4e10-b2e8-3bf0dc85f931', null, '심리 Psychology', '/salon-des-cent/community/topics-A/-psychology', '52e90164-5bb4-4fc8-aa1f-8473bc8664b6', 'sidebar_right', 1, true, null, null, null, true, '2026-07-29 04:25:42.38209+00'),
('66e0b168-7a30-40fe-82c6-f7c4ef9bf079', null, '문학 Literature', '/salon-des-cent/community/topics-A/literature', '52e90164-5bb4-4fc8-aa1f-8473bc8664b6', 'sidebar_right', 2, true, null, null, null, true, '2026-07-29 04:25:40.851214+00'),
('7b269815-4a5a-419c-bb95-fa4f688cb689', null, '세계역사 World History', '/salon-des-cent/community/topics-A/world-history', '52e90164-5bb4-4fc8-aa1f-8473bc8664b6', 'sidebar_right', 3, true, null, null, null, true, '2026-07-29 04:25:38.093503+00'),
('217266bc-2ab0-49b4-9099-1f1907397086', null, '과학 Science', '/salon-des-cent/community/topics-A/science', '52e90164-5bb4-4fc8-aa1f-8473bc8664b6', 'sidebar_right', 4, true, null, null, null, true, '2026-07-29 04:25:38.703846+00'),
('e502e3ec-74d5-484c-8d6a-5938750273d5', null, '경제 Economy', '/salon-des-cent/community/topics-A/economy', '52e90164-5bb4-4fc8-aa1f-8473bc8664b6', 'sidebar_right', 5, true, null, null, null, true, '2026-07-29 03:17:54.448961+00'),
('2272a166-592a-4b3d-b89e-97a58783134f', null, '정치 Politics', '/salon-des-cent/community/topics-A/politics', '52e90164-5bb4-4fc8-aa1f-8473bc8664b6', 'sidebar_right', 6, true, null, null, null, true, '2026-07-29 04:25:41.643663+00'),
('42cbf587-84cc-4eb9-9ed7-e6206bbf4a50', null, '주제별 클럽 게시판 B', '/salon-des-cent/community/topics-B', 'e9ab4e8d-a18f-4322-809b-d089b45f49dc', 'sidebar_right', 2, true, null, null, null, true, '2026-08-06 14:29:16.077505+00'),
('3ed6ae95-9044-4c4e-80a1-cb4d107f9d1f', null, '영화 & 시리즈 Movies & Series', '/salon-des-cent/community/topics-B/movies-series', '42cbf587-84cc-4eb9-9ed7-e6206bbf4a50', 'sidebar_right', 0, true, null, null, null, true, '2026-08-05 04:38:25.563386+00'),
('51e3f0d1-7934-4d47-b6d2-06ddbd6fd9e9', null, '스포츠 Sports', '/salon-des-cent/community/topics-B/sports', '42cbf587-84cc-4eb9-9ed7-e6206bbf4a50', 'sidebar_right', 1, true, null, null, null, true, '2026-07-29 12:50:14.855006+00'),
('814f0b95-8095-4bf9-a432-7c25a888d40b', null, '건강 Health', '/salon-des-cent/community/topics-B/health', '42cbf587-84cc-4eb9-9ed7-e6206bbf4a50', 'sidebar_right', 2, true, null, null, null, true, '2026-07-29 12:50:14.059136+00'),
('ea4be020-dae9-46cc-9b4c-5ea19609f39d', null, '코메디 Comedy', '/salon-des-cent/community/topics-B/comedy', '42cbf587-84cc-4eb9-9ed7-e6206bbf4a50', 'sidebar_right', 3, true, null, null, null, true, '2026-07-29 04:25:44.001321+00'),
('875c7d1b-3be3-4dec-8c78-dcb2842a7b20', null, '따뜻한 세상 Warm World', '/salon-des-cent/community/topics-B/warm-world', '42cbf587-84cc-4eb9-9ed7-e6206bbf4a50', 'sidebar_right', 4, true, null, null, null, true, '2026-07-29 12:50:41.630713+00'),
('d09b82e2-8ae3-4c22-ab10-908fba6d11b4', null, '패션 Fashion', '/salon-des-cent/community/topics-B/fashion', '42cbf587-84cc-4eb9-9ed7-e6206bbf4a50', 'sidebar_right', 5, true, null, null, null, true, '2026-08-06 08:59:57.157634+00'),
('673e2909-ab23-4b4c-b740-fc0aba111016', null, '인간집사들 Human Butlers', '/salon-des-cent/community/topics-B/human-butlers', '42cbf587-84cc-4eb9-9ed7-e6206bbf4a50', 'sidebar_right', 6, true, null, null, null, true, '2026-07-29 12:50:15.473298+00'),
('e26ba910-4d09-44c2-9ec1-b05e1829ba22', null, '요일별 클럽 모임', '/salon-des-cent/community/daily-club', 'e9ab4e8d-a18f-4322-809b-d089b45f49dc', 'sidebar_right', 3, true, null, null, null, true, '2026-07-25 23:38:27.460307+00'),
('ba3d1fc6-01c1-4ccf-8c9d-6244b91dea68', null, 'Mon 월요 반란클럽', '/salon-des-cent/community/daily-club/monday', 'e26ba910-4d09-44c2-9ec1-b05e1829ba22', 'sidebar_right', 0, true, null, null, null, true, '2026-07-29 12:52:32.104119+00'),
('0d0e6536-10ca-4f14-897d-032cae645f85', null, 'Tue 낭송 북클럽', '/salon-des-cent/community/daily-club/read-book-aloud', 'e26ba910-4d09-44c2-9ec1-b05e1829ba22', 'sidebar_right', 1, true, null, null, null, true, '2026-07-29 12:52:33.188104+00'),
('02bb4dec-50c2-4d28-a563-75b0c01eac9c', null, 'Wed 행간의 조각가들 - 북클럽', '/salon-des-cent/community/daily-club/sentence-sculptors', 'e26ba910-4d09-44c2-9ec1-b05e1829ba22', 'sidebar_right', 2, true, null, null, null, true, '2026-07-29 12:52:33.599214+00'),
('f219ceb4-94d5-4135-9727-8c9cf1c91b0a', null, 'Thurs 영어로 놀자 클럽', '/salon-des-cent/community/daily-club/play-with-English', 'e26ba910-4d09-44c2-9ec1-b05e1829ba22', 'sidebar_right', 3, true, null, null, null, true, '2026-07-29 12:52:34.014612+00'),
('d17421b1-f0cc-42ba-9f0f-cf02d9a30bd5', null, 'Fri 비포 선라이즈 클럽', '/salon-des-cent/community/daily-club/before-sunrise', 'e26ba910-4d09-44c2-9ec1-b05e1829ba22', 'sidebar_right', 4, true, null, null, null, true, '2026-07-29 12:52:34.414807+00'),
('830c1437-8896-4dfc-9aa6-078f098ea3e7', null, 'Sat ''무슨일이든 가능'' 클럽', '/salon-des-cent/community/daily-club/anything-can-happen', 'e26ba910-4d09-44c2-9ec1-b05e1829ba22', 'sidebar_right', 5, true, null, null, null, true, '2026-07-29 12:52:35.14337+00'),
('3066fb57-327f-4faa-a8e0-474cd4087975', null, 'Sun ''연극이 끝나고 난 뒤'' 클럽', '/community-weekday-after-the-play', 'e26ba910-4d09-44c2-9ec1-b05e1829ba22', 'sidebar_right', 6, true, null, null, null, true, '2026-07-29 12:52:35.699283+00'),
('3ada21b3-5097-448b-8123-303385227795', null, '멤버십 Membership', '/salon-des-cent/community/membership', 'e9ab4e8d-a18f-4322-809b-d089b45f49dc', 'sidebar_right', 4, true, null, null, null, true, '2026-07-25 23:38:27.460307+00'),
('df1e89cd-21a2-478d-9609-86cf08a83cf6', null, '나의 보물 이야기들', '/salon-des-cent/community/membership/my-treasure-stories', '3ada21b3-5097-448b-8123-303385227795', 'sidebar_right', 0, true, null, null, null, true, '2026-07-25 23:38:27.460307+00'),
('6ae956cf-7226-4d32-9c3b-d2fc3994b95e', null, '나의 마음일기들', '/salon-des-cent/community/membership/mind-diary', '3ada21b3-5097-448b-8123-303385227795', 'sidebar_right', 1, true, null, null, null, true, '2026-07-25 23:38:27.460307+00'),
('0704334e-a99d-42c4-8ae8-3e56350337d1', null, '나의 아티스트 소개들', '/salon-des-cent/community/membership/artist-intro', '3ada21b3-5097-448b-8123-303385227795', 'sidebar_right', 2, true, null, null, null, true, '2026-07-25 23:38:27.460307+00'),
('5561bc43-66e0-4716-abd0-85762801ff6f', null, '월별 모임 [패트론의 살롱]', '/salon-des-cent/community/membership/patrons-salon', '3ada21b3-5097-448b-8123-303385227795', 'sidebar_right', 3, true, null, null, null, true, '2026-07-25 23:38:27.460307+00'),
('fcb159b1-3575-47b5-9ca8-ffd7664c33b6', null, '패트론 게시판', '/salon-des-cent/community/membership/patrons-board', '3ada21b3-5097-448b-8123-303385227795', 'sidebar_right', 4, true, null, null, null, true, '2026-07-25 23:38:27.460307+00'),
('92fc2211-6c61-4394-89a6-a4f8b84ad6b8', null, '한문장 소설 프로젝트', '/salon-des-cent/community/membership/one-sentence-novel', '3ada21b3-5097-448b-8123-303385227795', 'sidebar_right', 5, true, null, null, null, true, '2026-07-25 23:38:27.460307+00'),
('ae7d3fbd-3940-482c-a827-ea6e6ee2ee61', null, '비밀의 방 도슨트', '/salon-des-cent/community/membership/secret-room', '3ada21b3-5097-448b-8123-303385227795', 'sidebar_right', 6, true, null, null, null, true, '2026-07-25 23:38:27.460307+00'),
('9f30ddb5-10e4-44e4-9e76-30c4db7d31da', null, '갤러리 Gallery', '/salon-des-cent/community/gallery', 'e9ab4e8d-a18f-4322-809b-d089b45f49dc', 'sidebar_right', 5, true, null, null, null, true, '2026-07-25 23:38:27.460307+00'),
('40644b5f-2ff9-40cd-9a03-b66dc18c3cd6', null, '연말 시상식', '/salon-des-cent/community/gallery/awards-ceremony', '9f30ddb5-10e4-44e4-9e76-30c4db7d31da', 'sidebar_right', 1, true, null, null, null, true, '2026-07-25 23:38:27.460307+00'),
('0b6e2dbd-c5ca-4564-b89c-e00526af4d9a', null, '살롱데상 공연들', '/salon-des-cent/community/gallery/performances', '9f30ddb5-10e4-44e4-9e76-30c4db7d31da', 'sidebar_right', 2, true, null, null, null, true, '2026-07-25 23:38:27.460307+00'),
('7425f432-4eea-41cc-9017-104423a2e320', null, '살롱데상 파티들', '/salon-des-cent/community/gallery/parties', '9f30ddb5-10e4-44e4-9e76-30c4db7d31da', 'sidebar_right', 3, true, null, null, null, true, '2026-07-25 23:38:27.460307+00'),
('c2db64b3-fe7c-4779-a7a2-cfc98df7be1b', null, '운명의 방문자들', '/salon-des-cent/community/gallery/fateful-visitors', '9f30ddb5-10e4-44e4-9e76-30c4db7d31da', 'sidebar_right', 4, true, null, null, null, true, '2026-07-25 23:38:27.460307+00'),
('abbd4d3a-b444-4f40-8221-c7a395c48bee', null, '역대 패트론들', '/salon-des-cent/community/gallery/patrons', '9f30ddb5-10e4-44e4-9e76-30c4db7d31da', 'sidebar_right', 5, true, null, null, null, true, '2026-07-25 23:38:27.460307+00'),
('a59070b1-3c59-4fc5-acba-748611da4fe3', null, '아카이브 Archives', '/salon-des-cent/community/archives', 'e9ab4e8d-a18f-4322-809b-d089b45f49dc', 'sidebar_right', 6, true, null, null, null, true, '2026-07-25 23:38:27.460307+00'),
('ee484ff9-2a82-49fe-804d-760243d21c18', null, '미디어 / 기사들 Media & Articles', '/salon-des-cent/community/archives/media-articles', 'a59070b1-3c59-4fc5-acba-748611da4fe3', 'sidebar_right', 0, true, null, null, null, true, '2026-07-31 15:09:44.660074+00'),
('9ef90c32-c4ab-4e13-9978-ae3992293b15', null, '소개지 brochures', '/salon-des-cent/community/archives/downloads', 'a59070b1-3c59-4fc5-acba-748611da4fe3', 'sidebar_right', 1, true, null, null, null, true, '2026-07-25 23:38:27.460307+00'),
('ac10483f-aea7-478f-a158-9e65a7133335', null, '포스터들 posters', '/salon-des-cent/community/archive/posters', 'a59070b1-3c59-4fc5-acba-748611da4fe3', 'sidebar_right', 2, true, null, null, null, true, '2026-07-25 23:38:27.460307+00'),
('e0d6afa3-4246-4f47-9b36-4d9c2c90a3b2', 'space_inquiry', '스튜디오', '/studio', null, 'dropdown', 4, true, null, null, null, true, '2026-07-25 23:38:27.460307+00'),
('bc96ba5b-98b9-4ca7-9373-f33e53ad808e', null, '공간 촬영 대관 (1층 사일로상점)', '/studio/rental_1f_silostore', 'e0d6afa3-4246-4f47-9b36-4d9c2c90a3b2', 'dropdown', 0, true, null, null, null, true, '2026-07-25 23:38:27.460307+00'),
('f29f090a-ab49-44f6-b86c-42778256f7b8', null, '공간 촬영 대관 (2층 살롱데상)', '/studio/rental_2f_salon', 'e0d6afa3-4246-4f47-9b36-4d9c2c90a3b2', 'dropdown', 1, true, null, null, null, true, '2026-07-25 23:38:27.460307+00'),
('147dba24-46f7-42ca-8bef-274d23405c4f', null, '물품 대여 Items Rental', '/studio/items-rental', 'e0d6afa3-4246-4f47-9b36-4d9c2c90a3b2', 'dropdown', 2, true, null, null, null, true, '2026-07-25 23:38:27.460307+00'),
('9c32a00d-b01a-4455-8343-abd444e9d8c4', null, '공간 스타일링 Space Styling', '/studio/space-styling', 'e0d6afa3-4246-4f47-9b36-4d9c2c90a3b2', 'dropdown', 3, true, null, null, null, true, '2026-07-25 23:38:27.460307+00'),
('78753f7f-cf35-4952-962c-e9465049ca83', 'mypage', '마이 페이지 My Page', '/mypage', null, 'dropdown', 5, true, null, null, null, true, '2026-07-25 23:38:27.460307+00'),
('1107a9f3-2122-457b-85bd-f3ca7ec0cbfd', null, 'My Collections 나의 수집품들', '/mypage/my-collections', '78753f7f-cf35-4952-962c-e9465049ca83', 'tab', 0, true, null, null, null, true, '2026-08-05 04:38:16.934379+00'),
('6d825568-ba0d-4fbf-a7de-e986aa1fd01f', null, 'My Treasures 나의 보물', '/mypage/my-collections/mytreasures', '1107a9f3-2122-457b-85bd-f3ca7ec0cbfd', 'tab', 0, true, null, null, null, true, '2026-08-07 00:51:55.48117+00'),
('e6544533-0812-427b-bfb5-c182d9e832a3', null, 'My Books 나의 책', '/mypage/my-collections/mybooks', '1107a9f3-2122-457b-85bd-f3ca7ec0cbfd', 'tab', 1, true, null, null, null, true, '2026-08-07 00:51:45.571189+00'),
('56121587-f9f9-41b7-b499-a9aa005bf834', null, 'My Movies 나의 영화', '/mypage/my-collections/mymovies', '1107a9f3-2122-457b-85bd-f3ca7ec0cbfd', 'tab', 2, true, null, null, null, true, '2026-08-07 00:51:47.442782+00'),
('f2887cec-a197-45fb-ae32-84e417ddc85e', null, 'My Musics 나의 음악', '/mypage/my-collections/mymusics', '1107a9f3-2122-457b-85bd-f3ca7ec0cbfd', 'tab', 3, true, null, null, null, true, '2026-08-07 00:51:48.526329+00'),
('13c52222-eaa0-4777-a297-f903a45adb75', null, 'My Artists 나의 아티스트', '/mypage/my-collections/myartists', '1107a9f3-2122-457b-85bd-f3ca7ec0cbfd', 'tab', 4, true, null, null, null, true, '2026-08-07 00:51:49.294169+00'),
('1c58d862-48f3-465a-8b99-6698f114a798', null, 'My Places 나의 장소', '/mypage/my-collections/myplaces', '1107a9f3-2122-457b-85bd-f3ca7ec0cbfd', 'tab', 5, true, null, null, null, true, '2026-08-07 00:51:49.877048+00'),
('0b4b8c5d-c351-416e-bc1c-f06cad6c1b19', null, 'My Scents 나의 향기', '/mypage/my-collections/myscents', '1107a9f3-2122-457b-85bd-f3ca7ec0cbfd', 'tab', 6, true, null, null, null, true, '2026-08-07 00:51:50.565574+00'),
('59d72469-84ce-4157-a89e-5104b4c77a4a', null, 'My Brands 나의 브랜드', '/mypage/my-collections/mybrands', '1107a9f3-2122-457b-85bd-f3ca7ec0cbfd', 'tab', 7, true, null, null, null, true, '2026-08-07 00:51:51.902497+00'),
('cd597f86-c7de-4913-8bb0-08834b101531', null, 'My Silo Timeline 나의사일로 타임라인', '/mypage/my-silo-timeline', '78753f7f-cf35-4952-962c-e9465049ca83', 'tab', 1, true, null, null, null, true, '2026-08-05 04:38:16.934379+00'),
('b660310f-26d8-4451-bcb2-7723eb47eb11', null, 'My Badges 나의 뱃지', '/mypage/my-silo-timeline/badges', 'cd597f86-c7de-4913-8bb0-08834b101531', 'tab', 0, true, null, null, null, true, '2026-08-05 04:38:16.934379+00'),
('31d8bd56-fd99-428a-be23-502018f1eb72', null, 'My Likes 나의 좋아요', '/mypage/my-silo-timelines/my-likes', 'cd597f86-c7de-4913-8bb0-08834b101531', 'tab', 1, true, null, null, null, true, '2026-08-05 04:38:16.934379+00'),
('e15b6ed3-d2dd-4608-b029-204faa4a9c76', null, 'My Writings 내가 쓴 글', '/mypage/my-silo-timeline/my-writings', 'cd597f86-c7de-4913-8bb0-08834b101531', 'tab', 2, true, null, null, null, true, '2026-08-05 04:38:16.934379+00'),
('05e70df2-8f13-430a-8bb3-bdd55da702c8', null, 'My Comments 나의 댓글', '/mypage/my-silo-timeline/my-comments', 'cd597f86-c7de-4913-8bb0-08834b101531', 'tab', 3, true, null, null, null, true, '2026-08-05 04:38:16.934379+00'),
('39f92e1c-d385-4458-8fb8-84b93e412727', null, 'My Follows 나의 팔로우', '/mypage/my-silo-timeline/my-follows', 'cd597f86-c7de-4913-8bb0-08834b101531', 'tab', 4, true, null, null, null, true, '2026-08-05 04:38:16.934379+00'),
('307dd966-5105-4a4a-b705-07840eb9d9c4', null, 'My Visitors 나를 방문한 사람', '/mypage/my-silo-timeline/my-visitors', 'cd597f86-c7de-4913-8bb0-08834b101531', 'tab', 5, true, null, null, null, true, '2026-08-05 04:38:16.934379+00'),
('3b1eb275-0609-46b2-82cf-9fec748b43db', null, 'My Story 나의 이야기', '/mypage/my-story', '78753f7f-cf35-4952-962c-e9465049ca83', 'dropdown', 2, true, null, null, null, true, '2026-08-07 00:42:11.351283+00'),
('a8c727df-09f0-438b-b31b-51446cc63b15', null, 'My Exhibition 나의 전시회', '/mypage/my-story/my-exhibition', '3b1eb275-0609-46b2-82cf-9fec748b43db', 'tab', 0, true, null, null, null, true, '2026-08-05 04:38:16.934379+00'),
('b46eabdc-5cf5-4d3b-a170-9c148b49744f', null, 'My Bucketlist 나의 버킷리스트', '/mypage/my-story/my-bucketlist', '3b1eb275-0609-46b2-82cf-9fec748b43db', 'tab', 1, true, null, null, null, true, '2026-08-05 04:38:16.934379+00'),
('cfc3e0d1-d454-468d-9a19-473854f2a304', null, 'My Wishlist 나의 위시리스트', '/mypage/my-story/wishlist', '3b1eb275-0609-46b2-82cf-9fec748b43db', 'tab', 2, true, null, null, null, true, '2026-08-05 04:38:16.934379+00'),
('b129eabc-5788-4717-ac9f-a95a1ddf8c90', null, 'My Space 나의 공간', '/mypage/my-story/my-space', '3b1eb275-0609-46b2-82cf-9fec748b43db', 'tab', 3, true, null, null, null, true, '2026-08-05 04:38:16.934379+00'),
('9021f22c-b97e-465c-ad5c-69a45ee88592', null, 'My Mind Diary 나의 마음 일기장', '/mypage/my-story/my-mind-diary', '3b1eb275-0609-46b2-82cf-9fec748b43db', 'tab', 4, true, null, null, null, true, '2026-08-05 04:38:16.934379+00'),
('788fa7ac-ca72-4569-8d7a-72f38f477f25', '__unassigned_pages__', '미분류 페이지', null, null, 'tab', 6, false, null, null, null, true, '2026-08-05 04:38:16.86706+00'),
('31246e05-f296-4e60-ba15-a57a47ca377f', null, '보물 목록 collection', '/silo-store-treasures-collections', '788fa7ac-ca72-4569-8d7a-72f38f477f25', 'tab', 0, false, null, null, '', true, '2026-08-11 09:39:24.248955+00'),
('cb74cba3-32a3-4a20-912d-427a9453d0ef', null, '미디어 / 기사들 Media / Public Articles', '/salon-des-cent-community-archives-public-articles', '788fa7ac-ca72-4569-8d7a-72f38f477f25', 'tab', 1, false, null, null, '', true, '2026-08-11 15:55:08.86293+00'),
('de8ff12a-f096-45a1-8f97-9350b8dca19c', null, '사일로에서의 운명적 만남들과 추억들', '/silo-store-treasures-silo-memories', '788fa7ac-ca72-4569-8d7a-72f38f477f25', 'tab', 2, false, null, null, '', true, '2026-08-11 16:12:22.944322+00'),
('f48dc2bd-af20-4a88-97b9-eceb4449763a', null, '사일로 유산 Heritage', '/silo-store-heritage', '788fa7ac-ca72-4569-8d7a-72f38f477f25', 'tab', 3, false, null, null, '', true, '2026-08-11 17:59:47.381256+00'),
('67250fc2-6bbd-4135-9f9e-87acea3c0811', null, 'Silo''s old Story 사일로의 오래된 이야기', '/silo-old-story', '788fa7ac-ca72-4569-8d7a-72f38f477f25', 'tab', 4, false, null, null, '', true, '2026-08-11 18:02:13.040963+00');

-- site_categories 시드: 상점(Time Slip)/도슨트(era)/컬렉션(EPIC-022)/살롱(게시판 topic) 4개 도메인
insert into site_categories (domain, name, slug, sort_order) values
  ('shop', '르네상스', 'renaissance', 1),
  ('shop', '바로크', 'baroque', 2),
  ('shop', '로코코', 'rococo', 3),
  ('shop', '신고전주의', 'neoclassic', 4),
  ('shop', '리전시(제국·섭정)', 'empire', 5),
  ('shop', '빅토리아', 'victorian', 6),
  ('shop', '아르누보', 'art_nouveau', 7),
  ('shop', '아르데코', 'art_deco', 8),

  ('docent', 'Renaissance', 'renaissance', 1),
  ('docent', 'Baroque', 'baroque', 2),
  ('docent', 'Rococo', 'rococo', 3),
  ('docent', 'NeoClassicism', 'neoclassic', 4),
  ('docent', 'Regency', 'empire', 5),
  ('docent', 'Victoria', 'victorian', 6),
  ('docent', 'Art Nouveau', 'art_nouveau', 7),
  ('docent', 'Art Deco', 'art_deco', 8),
  ('docent', 'Beat Generation', 'beat_generation', 9),
  ('docent', 'CounterCulture', 'counter_culture', 10),
  ('docent', 'Digital', 'digital', 11),

  ('collection', '나를 만든 책', 'book', 1),
  ('collection', '나를 만든 영화', 'movie', 2),
  ('collection', '나를 만든 음악', 'music', 3),
  ('collection', '좋아하는 예술가', 'artist', 4),
  ('collection', '좋아하는 장소', 'place', 5),
  ('collection', '좋아하는 향기', 'scent', 6),
  ('collection', '좋아하는 브랜드', 'brand', 7),
  ('collection', '좋아하는 시대', 'era', 8),

  ('salon', '경제 클럽', 'economy', 1),
  ('salon', '예술 클럽', 'art', 2),
  ('salon', '세계역사 클럽', 'history', 3),
  ('salon', '과학 클럽', 'science', 4),
  ('salon', '코메디 클럽', 'comedy', 5),
  ('salon', '문학 클럽', 'literature', 6),
  ('salon', '건강 클럽', 'health', 7),
  ('salon', '정치 클럽', 'politics', 8),
  ('salon', '영화 클럽', 'movie', 9),
  ('salon', '심리 클럽', 'psychology', 10),
  ('salon', '스포츠 클럽', 'sports', 11),
  ('salon', '인간 집사들 클럽', 'pets', 12),
  ('salon', '따듯한 세상 클럽', 'warmth', 13);

-- =====================================================================
-- 13. 사이트 전역 설정 (EPIC-026)
--    /admin/navigation/settings("홈페이지 설정 관리")가 사용하는 key-value
--    저장소. 설정마다 별도 컬럼을 만드는 대신 setting_value(jsonb)로 유연하게
--    저장 — 새 설정 종류가 생겨도 스키마 변경 없이 setting_key만 추가하면 됨.
--    라이브 DB에는 아직 미적용 — Supabase SQL Editor에서 직접 실행 필요.
-- =====================================================================

create table site_settings (
  id            uuid primary key default gen_random_uuid(),
  setting_key   text unique not null,
  setting_value jsonb not null,
  updated_at    timestamptz not null default now()
);

-- site_settings 시드: settings/page.tsx가 다루는 3개 설정의 초기값
insert into site_settings (setting_key, setting_value) values
  ('main_logo', '{"type":"text","text":"사일로 스토어","imageUrl":""}'),
  ('hero_slideshow', '{"slides":[]}'),
  ('home_curation', '{"domain":"shop","slugs":[],"sortBy":"latest"}');

-- =====================================================================
-- 14. 게시글 북마크 (Board Engine, EPIC-047)
--    wishlists와 동일한 패턴(select/insert/delete 모두 본인 전용, likes와
--    달리 다른 회원이 볼 필요가 없어 공개 select가 아님) — 라이브 DB에는
--    아직 미적용, Supabase SQL Editor에서 직접 실행 필요.
-- =====================================================================

create table post_bookmarks (
  id          uuid primary key default gen_random_uuid(),
  member_id   uuid not null references members(id),
  post_id     uuid not null references posts(id) on delete cascade,
  created_at  timestamptz not null default now(),
  unique (member_id, post_id)
);

-- =====================================================================
-- 인덱스
-- =====================================================================

create index idx_items_status on items(status);
create index idx_orders_member on orders(member_id);
create index idx_wishlists_member on wishlists(member_id);
create index idx_wishlists_item on wishlists(item_id);
create index idx_reservations_member on reservations(member_id);
create index idx_reservations_session on reservations(session_id);
create index idx_posts_board on posts(board_id);
create index idx_posts_author on posts(author_id);
create index idx_comments_post on comments(post_id);
create index idx_points_ledger_member on points_ledger(member_id);
create index idx_rental_bookings_member on rental_bookings(member_id);
create index idx_docent_purchases_member on docent_purchases(member_id);
create index idx_downloads_created on downloads(created_at);
create index idx_daily_checkins_member on daily_checkins(member_id);
create index idx_poll_options_poll on poll_options(poll_id);
create index idx_poll_votes_poll on poll_votes(poll_id);
create index idx_styling_project_media_project on styling_project_media(project_id);
create index idx_styling_project_items_project on styling_project_items(project_id);
create index idx_styling_project_items_item on styling_project_items(item_id);
create index idx_member_collections_member on member_collections(member_id);
create index idx_member_collections_category on member_collections(category);
create index idx_member_follows_following on member_follows(following_id);
create index idx_member_badges_member on member_badges(member_id);
create index idx_member_visitors_owner on member_visitors(owner_id);
create index idx_member_bucket_list_member on member_bucket_list(member_id);
create index idx_site_navigations_parent on site_navigations(parent_id);
create index idx_site_categories_parent on site_categories(parent_id);
create index idx_site_categories_domain on site_categories(domain);
create index idx_post_bookmarks_member on post_bookmarks(member_id);
create index idx_post_bookmarks_post on post_bookmarks(post_id);

-- =====================================================================
-- Row Level Security
-- =====================================================================
-- 위 테이블 전부 RLS가 활성화되어 있음 (확인됨). 다만 테이블별 정확한
-- 정책 조건(누가 읽고/쓸 수 있는지)은 이 파일에 옮기지 않음 — 추측 방지.
-- ⚠️ TODO: 정확한 RLS 정책은 PROJECT_BLUEPRINT.md의 "TODO / 확인 필요" 참고,
--    필요 시 Supabase pg_policies를 직접 조회해서 확인할 것.
-- ⚠️ EPIC-047 TODO: posts.view_count도 like_count/is_best와 동일하게 "다른
--    회원(작성자 아님)이 컬럼 하나만 업데이트"하는 컬럼이라, CLAUDE.md에
--    문서화된 컬럼 단위 GRANT 패턴을 그대로 확장해야 함:
--      revoke update on posts from authenticated;
--      grant update (like_count, is_best, view_count) on posts to authenticated;
--    post_bookmarks는 own-row 전용(select/insert/delete 모두 member_id=본인)
--    RLS만 있으면 되고 별도 GRANT는 불필요(wishlists와 동일 패턴).
