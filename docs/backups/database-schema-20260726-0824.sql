-- =====================================================================
-- 사일로 스토어 (Silo Store) 플랫폼 — Supabase(PostgreSQL) 스키마
-- 구성: 멤버십 / 사일로상점(1층) / 살롱데상(2층) / 커뮤니티(게시판·포인트)
--       / 출석체크 / 설문조사 / 자료 다운로드
--
-- ⚠️ 마지막 동기화: 2026-07-26 (EPIC-022: member_collections/member_follows/
--    member_badges/member_visitors 4개 테이블 신규 설계 — 아직 라이브 DB에는
--    적용 전이며, 이 파일의 정의가 실행할 DDL의 원본임. 그 전 동기화는 2026-07-24
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
  category            text,
  board_type          text not null check (board_type in (
                        'topic','group','patron','artist_promo',
                        'adoption_story','archive','qna'
                      )),
  min_rank_to_write   int references membership_tiers(rank) default 0
);

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
-- 참고: 'patron'/'artist_promo' 보드는 min_rank_to_write가 각각 3/99로
--       DB에 설정돼 있음 (기본값 0이 아님) — 실제 글쓰기 가능 여부는
--       min_rank_to_write가 아니라 src/lib/serverAuth.ts의
--       canWriteToBoard()가 board_type별로 판정함.

create table posts (
  id              uuid primary key default gen_random_uuid(),
  board_id        uuid references boards(id),
  author_id       uuid not null references members(id),
  title           text,
  body            text,
  is_docent_post  boolean not null default false,
  visibility      text not null default 'public' check (visibility in ('public','private','friends')),
  like_count      int not null default 0,
  is_best         boolean not null default false,
  photo_url       text,               -- 개인 페이지(마이피드) 글의 첨부 사진
  order_id        uuid references orders(id),  -- After Adoption 후기가 어떤 구매 건에 대한 글인지 연결
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

-- =====================================================================
-- Row Level Security
-- =====================================================================
-- 위 테이블 전부 RLS가 활성화되어 있음 (확인됨). 다만 테이블별 정확한
-- 정책 조건(누가 읽고/쓸 수 있는지)은 이 파일에 옮기지 않음 — 추측 방지.
-- ⚠️ TODO: 정확한 RLS 정책은 PROJECT_BLUEPRINT.md의 "TODO / 확인 필요" 참고,
--    필요 시 Supabase pg_policies를 직접 조회해서 확인할 것.
