-- =====================================================================
-- 사일로 스토어 (Silo Store) 플랫폼 — Supabase(PostgreSQL) 스키마
-- 구성: 멤버십 / 사일로상점(1층) / 살롱데상(2층) / 커뮤니티(게시판·포인트)
-- 작성 기준: 2026.07 논의 확정본 + 사용자 제공 최종 정리표
-- =====================================================================

create extension if not exists pgcrypto;

-- =====================================================================
-- 1. 멤버십
-- =====================================================================

create table membership_tiers (
  rank                        int primary key,               -- 0=Silo Angel ... 5=Lautrec, 99=Artist
  name                        text not null,
  price                       int not null default 0,        -- 월 회비 (원)

  -- 사일로상점 소매 구매 혜택 (적립 또는 할인, 둘 중 하나만 사용)
  shop_purchase_point_pct     numeric(4,2) not null default 0,
  shop_purchase_discount_pct  numeric(4,2) not null default 0,

  -- 사일로상점 물품 대여 혜택 (소매가 30%/1일 기준가에 적용)
  shop_rental_point_pct       numeric(4,2) not null default 0,
  shop_rental_discount_pct    numeric(4,2) not null default 0,

  -- 큐레이션 공개 단계: 0=제작시기, 1=+시대배경, 2=+제작자·기법, 3=+이전 주인 사연(전체)
  curation_level              int not null default 0,

  -- 공간 대관 (1층 사일로상점 / 2층 살롱데상 공통 적립률)
  venue_rental_point_pct      numeric(4,2) not null default 0,

  -- 클럽모임 (요일별 정기 모임)
  club_all_free               boolean not null default false, -- Lautrec/Artist: 전 요일 무료
  club_monthly_free_sessions  int not null default 0,          -- Patron: 월 1회 무료 선택
  club_participation_discount_pct numeric(4,2) not null default 0, -- Patron: 나머지 참여비 할인율
  club_point_pct              numeric(4,2) not null default 0, -- Alice/GG: 참여비 적립률
  club_priority_booking        boolean not null default false, -- GG 이상: 우선예약

  -- 월별 모임 (패트론 모임 등)
  monthly_salon_meeting_invite boolean not null default false,

  -- 멤버십 콘텐츠 (비밀의 방) — 'none' | 'exam_required'
  secret_room_access          text not null default 'none' check (secret_room_access in ('none','exam_required')),

  -- 온라인 도슨트 콘텐츠
  docent_free_only            boolean not null default false, -- Silo Angel: 무료 콘텐츠만
  docent_per_item_discount_pct numeric(4,2) not null default 0, -- 건별구매 할인 (Patron/Lautrec 20%)
  docent_monthly_free_count   int not null default 0,          -- 월 무료 제공 편수
  docent_needs_agreement      boolean not null default false,  -- Artist: 협의 필요

  -- 음료 주문
  drink_free                  boolean not null default false,  -- Lautrec/Artist

  -- 투어 도슨트 프로그램 (오프라인, 세션당 1만원) — Lautrec만 무료, 나머지는 정가 구매
  tour_docent_free            boolean not null default false,

  -- 살롱 출입 (기본 3,000원/시간·인)
  salon_entry_free            boolean not null default false,  -- Patron 이상: 자유출입(지인동반)
  salon_entry_hourly_fee      int not null default 3000,

  -- 소통 게시판 권한
  board_write_scope           text not null default 'limited' check (board_write_scope in ('limited','all')),
  board_can_write_docent      boolean not null default false,  -- GG 이상: 도슨트 글쓰기
  board_can_create            boolean not null default false,  -- Patron 이상: 게시판 개설
  board_has_patron_board      boolean not null default false,  -- Patron 이상: 패트론 전용 게시판
  board_has_promo_board       boolean not null default false,  -- Artist: 공연/전시/창작물 홍보 게시판

  is_lifetime                 boolean not null default false,  -- Artist: 평생 멤버십
  created_at                  timestamptz not null default now()
);

insert into membership_tiers (
  rank, name, price,
  shop_purchase_point_pct, shop_purchase_discount_pct,
  shop_rental_point_pct, shop_rental_discount_pct,
  curation_level, venue_rental_point_pct,
  club_all_free, club_monthly_free_sessions, club_participation_discount_pct, club_point_pct, club_priority_booking,
  monthly_salon_meeting_invite, secret_room_access,
  docent_free_only, docent_per_item_discount_pct, docent_monthly_free_count, docent_needs_agreement,
  drink_free, tour_docent_free, salon_entry_free, salon_entry_hourly_fee,
  board_write_scope, board_can_write_docent, board_can_create, board_has_patron_board, board_has_promo_board,
  is_lifetime
) values
  (0, 'Silo Angel',    0,      0,  0,   5,  0,  0,  2,  false, 0, 0,  0, false, false, 'none',  true,  0,  0, false, false, false, false, 3000, 'limited', false, false, false, false, false),
  (1, 'Alice',     10000,      3,  0,   8,  0,  1,  4,  false, 0, 0,  3, false, false, 'none',  false, 0,  0, false, false, false, false, 3000, 'all',     false, false, false, false, false),
  (2, 'Great Gatsby',25000,    5,  0,   0, 10,  2,  6,  false, 0, 0,  5, true,  false, 'none',  false, 0,  0, false, false, false, false, 3000, 'all',     true,  false, false, false, false),
  (3, 'Patron',     40000,     0,  5,   0, 15,  3,  6,  false, 1, 10, 0, true,  true,  'exam_required', false, 20, 1, false, false, false, true,  3000, 'all',     true,  true,  true,  false, false),
  (4, 'Lautrec',   100000,     0,  8,   0, 15,  3,  6,  true,  0, 0,  0, true,  true,  'exam_required', false, 20, 1, false, true,  true,  true,  3000, 'all',     true,  true,  true,  false, false),
  (99,'Artist',         0,     0, 10,   0, 15,  3,  6,  true,  0, 0,  0, true,  true,  'exam_required', false, 0,  0, true,  true,  false, true,  3000, 'all',     true,  true,  true,  true,  true);

-- 회원
create table members (
  id                uuid primary key default gen_random_uuid(),
  name              text not null,
  email             text unique,
  kakao_id          text,
  membership_rank   int not null default 0 references membership_tiers(rank),
  membership_started_at timestamptz default now(),
  joined_at         timestamptz not null default now()
);

create table member_profiles (
  member_id   uuid primary key references members(id) on delete cascade,
  bio         text,
  cover_image text
);

-- =====================================================================
-- 2. 사일로상점 (1층) — 물품 소매·대여, 큐레이션
-- =====================================================================

create table items (
  id                    uuid primary key default gen_random_uuid(),
  name                  text not null,
  photo_url             text,
  price                 int not null,                                        -- 소매가
  rental_price_per_day  int generated always as (round(price * 0.3)) stored, -- 대여가 = 소매가 30%/1일
  category              text,

  -- 큐레이션 4단계 (등급에 따라 API가 선택적으로 노출)
  era_info              text,  -- level 0: 제작 시기
  era_context           text,  -- level 1: 시대 배경
  maker_info            text,  -- level 2: 제작자·기법
  previous_owner_story  text,  -- level 3: 이전 주인 사연

  status                text not null default 'available' check (status in ('available','rented','sold','archived')),
  created_at            timestamptz not null default now()
);

create table orders (
  id                    uuid primary key default gen_random_uuid(),
  member_id             uuid not null references members(id),
  item_id               uuid not null references items(id),
  order_type            text not null check (order_type in ('purchase','rental')),
  rental_days           int,                                    -- order_type = 'rental'일 때만 사용
  price_charged         int not null,
  discount_applied_pct  numeric(4,2) not null default 0,
  point_earned          int not null default 0,
  payment_status        text not null default 'pending_transfer' check (payment_status in ('pending_transfer','confirmed','cancelled')),
  created_at            timestamptz not null default now()
);

-- =====================================================================
-- 3. 살롱데상 (2층) — 클럽모임, 월별모임, 비밀의 방, 도슨트 투어
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
  is_monthly_free_pick  boolean not null default false, -- Patron 월 1회 무료 선택 사용 여부
  payment_status        text not null default 'pending_transfer' check (payment_status in ('pending_transfer','confirmed','cancelled')),
  created_at            timestamptz not null default now()
);

-- 월별 모임 (패트론 모임 등)
create table salon_events (
  id                 uuid primary key default gen_random_uuid(),
  title              text not null,
  event_date         date not null,
  min_rank_required  int references membership_tiers(rank) default 3 -- 기본값: Patron 이상
);

create table salon_event_rsvps (
  id          uuid primary key default gen_random_uuid(),
  event_id    uuid not null references salon_events(id),
  member_id   uuid not null references members(id),
  created_at  timestamptz not null default now(),
  unique (event_id, member_id)
);

-- 멤버십 콘텐츠 (비밀의 방)
create table salon_rooms (
  id             uuid primary key default gen_random_uuid(),
  name           text not null,   -- 예: 패트론의 비밀의 방 I / II
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

-- 투어 도슨트 프로그램 (오프라인, 세션당 1만원)
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

-- 음료 주문
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

create table drink_orders (
  id              uuid primary key default gen_random_uuid(),
  member_id       uuid not null references members(id),
  drink_id        uuid not null references drink_menu(id),
  price_charged   int not null default 0, -- Lautrec/Artist는 0
  created_at      timestamptz not null default now()
);

-- 살롱 출입 (시간당 3,000원, Patron 이상 자유출입)
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
  base_headcount         int not null,        -- 사진 2인 / 영상 3인 기준
  extra_person_hourly_fee int not null default 6000
);

insert into rental_types (floor, shoot_type, weekday_price, weekend_price, base_headcount) values
  ('1f_silostore', 'photo', 60000,  80000,  2),
  ('1f_silostore', 'video', 90000,  110000, 3),
  ('2f_salon',      'photo', 100000, 120000, 2),
  ('2f_salon',      'video', 150000, 170000, 3);

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
-- 5. 온라인 도슨트 콘텐츠 (건별 판매형, 봉비방 모델)
-- =====================================================================

create table docent_contents (
  id          uuid primary key default gen_random_uuid(),
  title       text not null,
  keywords    text,
  is_free     boolean not null default false,
  price       int not null default 3300,
  body_url    text,
  cover_image text,
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

-- =====================================================================
-- 6. 커뮤니티 — 게시판 · 개인 페이지 · 포인트
-- =====================================================================

create table boards (
  id                  uuid primary key default gen_random_uuid(),
  name                text not null,
  category            text,   -- 13개 클럽 주제 / 모임별 / 패트론 / 아티스트 홍보
  board_type          text not null check (board_type in ('topic','group','patron','artist_promo')),
  min_rank_to_write   int references membership_tiers(rank) default 0
);

-- 13개 클럽 주제 게시판 시드
insert into boards (name, category, board_type) values
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
  ('따듯한 세상 클럽', 'warmth', 'topic');

create table posts (
  id              uuid primary key default gen_random_uuid(),
  board_id        uuid references boards(id),   -- null = 개인 페이지 글
  author_id       uuid not null references members(id),
  title           text,
  body            text,
  is_docent_post  boolean not null default false,
  visibility      text not null default 'public' check (visibility in ('public','private','friends')),
  like_count      int not null default 0,
  is_best         boolean not null default false,
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
                'shop_purchase','shop_rental','venue_rental'
              )),
  points      int not null,
  related_id  uuid,
  created_at  timestamptz not null default now()
);

-- =====================================================================
-- 인덱스
-- =====================================================================

create index idx_items_status on items(status);
create index idx_orders_member on orders(member_id);
create index idx_reservations_member on reservations(member_id);
create index idx_reservations_session on reservations(session_id);
create index idx_posts_board on posts(board_id);
create index idx_posts_author on posts(author_id);
create index idx_comments_post on comments(post_id);
create index idx_points_ledger_member on points_ledger(member_id);
create index idx_rental_bookings_member on rental_bookings(member_id);
create index idx_docent_purchases_member on docent_purchases(member_id);
