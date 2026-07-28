-- ⚠️ SUPERSEDED — 이 파일은 실행하지 마세요.
-- EPIC-061(docs/sql/EPIC-061-page-builder-seed.sql)이 이 파일을 완전히
-- 대체합니다: 테이블/RLS는 동일하게 다시 만들고(IF NOT EXISTS라 이미 이
-- 파일을 실행했어도 안전), seed는 draft+board_id NULL이었던 것을
-- published+실제 board_id 연결로 다시 채웁니다. EPIC-061 파일 하나만
-- 실행하세요.
--
-- EPIC-060: Page Builder CMS System
--
-- 이 프로젝트는 Supabase migration 파일을 쓰지 않고 Management API를 통해
-- ad hoc으로 스키마를 적용해왔다(CLAUDE.md 참고). 이번 스키마 변경(신규
-- 테이블 2개, CREATE TABLE/DDL)은 anon key로는 실행할 수 없고 Management
-- API personal access token이 필요한데, 이번 작업 세션에는 그 토큰이 없어
-- Claude가 직접 실행하지 못했다 — 이 파일을 Supabase 대시보드의 SQL
-- Editor(또는 Management API)에서 직접 실행해야 한다.
--
-- 실행 순서: 이 파일 전체를 한 번에 실행하면 된다(테이블 생성 → RLS →
-- 초기 데이터 seed 순서로 아래에 이미 정렬되어 있음).
--
-- 안전성: 아래 seed는 8개 페이지를 전부 status='draft'로 넣는다. draft는
-- 관리자(is_admin)에게만 보이고 공개 페이지에는 전혀 영향을 주지 않으므로,
-- 이 스크립트를 실행해도 지금 사이트 화면은 하나도 바뀌지 않는다 — 이후
-- /admin/pages에서 관리자가 각 페이지 내용을 확인/수정하고 "공개"로 바꿔야
-- 실제 사용자에게 보이기 시작한다.

-- ============================================================
-- 1. page_builder — 페이지 메타데이터
-- ============================================================
create table if not exists page_builder (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  title text not null,
  description text,
  status text not null default 'draft' check (status in ('draft', 'published')),
  layout text not null default 'default',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ============================================================
-- 2. page_modules — 페이지를 구성하는 모듈(순서가 있는 블록 목록)
-- ============================================================
create table if not exists page_modules (
  id uuid primary key default gen_random_uuid(),
  page_id uuid not null references page_builder(id) on delete cascade,
  module_type text not null check (module_type in (
    'hero', 'board', 'slide', 'gallery', 'calendar', 'application',
    'timeline', 'search', 'sort', 'filter', 'html', 'spacer', 'divider', 'text'
  )),
  board_id uuid references boards(id) on delete set null,
  settings jsonb not null default '{}'::jsonb,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists page_modules_page_id_sort_idx
  on page_modules (page_id, sort_order);

-- ============================================================
-- 3. RLS — 이 프로젝트의 기존 admin-bypass 패턴(orders/reservations 등)과
--    동일하게: 공개(published) 행은 누구나 읽고, 비공개(draft)/쓰기는
--    is_admin만 허용한다.
-- ============================================================
alter table page_builder enable row level security;
alter table page_modules enable row level security;

drop policy if exists "page_builder_public_read" on page_builder;
create policy "page_builder_public_read" on page_builder
  for select
  using (
    status = 'published'
    or exists (
      select 1 from members
      where members.auth_user_id = auth.uid() and members.is_admin = true
    )
  );

drop policy if exists "page_builder_admin_write" on page_builder;
create policy "page_builder_admin_write" on page_builder
  for all
  using (
    exists (
      select 1 from members
      where members.auth_user_id = auth.uid() and members.is_admin = true
    )
  )
  with check (
    exists (
      select 1 from members
      where members.auth_user_id = auth.uid() and members.is_admin = true
    )
  );

drop policy if exists "page_modules_public_read" on page_modules;
create policy "page_modules_public_read" on page_modules
  for select
  using (
    exists (
      select 1 from page_builder pb
      where pb.id = page_modules.page_id
        and (
          pb.status = 'published'
          or exists (
            select 1 from members
            where members.auth_user_id = auth.uid() and members.is_admin = true
          )
        )
    )
  );

drop policy if exists "page_modules_admin_write" on page_modules;
create policy "page_modules_admin_write" on page_modules
  for all
  using (
    exists (
      select 1 from members
      where members.auth_user_id = auth.uid() and members.is_admin = true
    )
  )
  with check (
    exists (
      select 1 from members
      where members.auth_user_id = auth.uid() and members.is_admin = true
    )
  );

-- ============================================================
-- 4. Seed — 기존 8개 Hub Page(Community/Gallery/Archive/Membership/
--    Studio/Heritage/Docent/MyPage)를 page_builder에 draft로 등록한다.
--    Hero 모듈 내용은 각 페이지의 기존 하드코딩 텍스트를 그대로 옮긴
--    것이라, 관리자가 나중에 "공개"로 바꾸기만 해도 지금과 거의 동일한
--    화면이 된다(단, board 모듈의 board_id는 비워둔다 — 어떤 boards 행이
--    맞는지는 /admin/pages 화면에서 관리자가 직접 골라 연결해야 한다,
--    EPIC-060 요구사항 9번).
--
--    Docent/MyPage는 Board 기반 Hub가 아니라 각자 고유 기능(도슨트 콘텐츠
--    목록, 마이페이지 12개 개인 탭)을 가진 페이지라 모듈로 완전히
--    대체하지 않는다 — 메타데이터 행만 만들어 /admin/pages 목록에 보이고
--    "페이지 수정" 버튼이 뜨게 하되, 실제 화면은 기존 코드 그대로 유지한다
--    (기존 코드와 호환성 유지, 상세 이유는 커밋 메시지/보고 참고).
-- ============================================================

insert into page_builder (slug, title, description, status)
values
  ('community', 'Community', 'Salon des Cent Community 메인 허브 — 출석체크, 자유게시판, 주제별 소통, 요일별 클럽, 월별 모임 등 하위 게시판의 최신글/인기글을 모아봅니다.', 'draft'),
  ('gallery', 'Gallery', 'Gallery 메인 허브 — 시상식, 공연들, 파티, 운명의 방문자들, 패트론들 게시판의 최신글/인기글/추천글을 모아봅니다.', 'draft'),
  ('archive', 'Archive', 'Archive 메인 허브 — 자료게시판/타임라인 등 하위 게시판의 최신글/인기글/추천글을 모아봅니다.', 'draft'),
  ('membership', 'Membership', 'Membership 메인 허브 — 하위 게시판(패트론 게시판, 나의 보물 이야기, 마음일기 등)의 최신글/인기글/추천글을 모아봅니다.', 'draft'),
  ('studio', 'Studio', 'Studio 메인 허브 — 공간 대관(1F/2F), 물품 대여, 공간 스타일링 4개 서비스의 최신 포트폴리오/대표 이미지/추천 콘텐츠를 모아봅니다.', 'draft'),
  ('heritage', 'Heritage', 'Grandmas/Grandpas 게시판의 최신글/인기글을 모아보는 사일로 Heritage 메인 허브입니다.', 'draft'),
  ('docent', 'Online Docent', '사일로상점/살롱데상 온라인 도슨트 콘텐츠 목록(도슨트 콘텐츠 전용, Board 미사용 — 기존 코드 그대로 유지, 메타데이터만 등록).', 'draft'),
  ('mypage', 'MyPage', '회원 개인 허브(컬렉션/위시리스트/타임라인 등 12개 탭, Board 미사용 — 기존 코드 그대로 유지, 메타데이터만 등록).', 'draft')
on conflict (slug) do nothing;

-- Community: Hero + Board(연결 필요)
insert into page_modules (page_id, module_type, settings, sort_order)
select id, 'hero', jsonb_build_object(
  'title', 'Community',
  'subtitle', '살롱데상',
  'description', 'Salon des Cent Community 메인 허브 — 출석체크, 자유게시판, 주제별 소통, 요일별 클럽, 월별 모임 등 하위 게시판의 최신글/인기글을 모아봅니다.',
  'breadcrumb', jsonb_build_array(
    jsonb_build_object('label', '홈', 'href', '/'),
    jsonb_build_object('label', '살롱데상'),
    jsonb_build_object('label', 'Community')
  )
), 0
from page_builder where slug = 'community';

insert into page_modules (page_id, module_type, board_id, settings, sort_order)
select id, 'board', null, '{}'::jsonb, 1 from page_builder where slug = 'community';

-- Gallery: Hero + Board(연결 필요)
insert into page_modules (page_id, module_type, settings, sort_order)
select id, 'hero', jsonb_build_object(
  'title', 'Gallery',
  'subtitle', '살롱데상',
  'description', 'Gallery 메인 허브 — 시상식, 공연들, 파티, 운명의 방문자들, 패트론들 게시판의 최신글/인기글/추천글을 모아봅니다.',
  'breadcrumb', jsonb_build_array(
    jsonb_build_object('label', '홈', 'href', '/'),
    jsonb_build_object('label', '살롱데상'),
    jsonb_build_object('label', 'Gallery')
  )
), 0
from page_builder where slug = 'gallery';

insert into page_modules (page_id, module_type, board_id, settings, sort_order)
select id, 'board', null, '{}'::jsonb, 1 from page_builder where slug = 'gallery';

-- Archive: Hero + Board(연결 필요)
insert into page_modules (page_id, module_type, settings, sort_order)
select id, 'hero', jsonb_build_object(
  'title', 'Archive',
  'subtitle', '살롱데상',
  'description', 'Archive 메인 허브 — 자료게시판/타임라인 등 하위 게시판의 최신글/인기글/추천글을 모아봅니다.',
  'breadcrumb', jsonb_build_array(
    jsonb_build_object('label', '홈', 'href', '/'),
    jsonb_build_object('label', '살롱데상'),
    jsonb_build_object('label', 'Archive')
  )
), 0
from page_builder where slug = 'archive';

insert into page_modules (page_id, module_type, board_id, settings, sort_order)
select id, 'board', null, '{}'::jsonb, 1 from page_builder where slug = 'archive';

-- Membership: Hero + Board(연결 필요)
insert into page_modules (page_id, module_type, settings, sort_order)
select id, 'hero', jsonb_build_object(
  'title', 'Membership',
  'subtitle', '살롱데상',
  'description', 'Membership 메인 허브 — 하위 게시판(패트론 게시판, 나의 보물 이야기, 마음일기 등)의 최신글/인기글/추천글을 모아봅니다.',
  'breadcrumb', jsonb_build_array(
    jsonb_build_object('label', '홈', 'href', '/'),
    jsonb_build_object('label', '살롱데상'),
    jsonb_build_object('label', 'Membership')
  )
), 0
from page_builder where slug = 'membership';

insert into page_modules (page_id, module_type, board_id, settings, sort_order)
select id, 'board', null, '{}'::jsonb, 1 from page_builder where slug = 'membership';

-- Heritage: Hero + Board(연결 필요)
insert into page_modules (page_id, module_type, settings, sort_order)
select id, 'hero', jsonb_build_object(
  'title', 'Heritage',
  'subtitle', '사일로상점',
  'description', 'Grandmas/Grandpas 게시판의 최신글/인기글을 모아보는 사일로 Heritage 메인 허브입니다.',
  'breadcrumb', jsonb_build_array(
    jsonb_build_object('label', '홈', 'href', '/'),
    jsonb_build_object('label', '사일로상점'),
    jsonb_build_object('label', 'Heritage')
  )
), 0
from page_builder where slug = 'heritage';

insert into page_modules (page_id, module_type, board_id, settings, sort_order)
select id, 'board', null, '{}'::jsonb, 1 from page_builder where slug = 'heritage';

-- Studio: Hero + Application + Calendar + Board(연결 필요) — 기존
-- src/app/studio/page.tsx가 이미 수동으로 조립해두었던 4개 모듈 순서를
-- 그대로 옮긴 것.
insert into page_modules (page_id, module_type, settings, sort_order)
select id, 'hero', jsonb_build_object(
  'title', 'Studio',
  'subtitle', '스튜디오',
  'description', 'Studio 메인 허브 — 공간 대관(1F/2F), 물품 대여, 공간 스타일링 4개 서비스의 최신 포트폴리오/대표 이미지/추천 콘텐츠를 모아봅니다.',
  'breadcrumb', jsonb_build_array(
    jsonb_build_object('label', '홈', 'href', '/'),
    jsonb_build_object('label', '스튜디오'),
    jsonb_build_object('label', 'Studio')
  )
), 0
from page_builder where slug = 'studio';

insert into page_modules (page_id, module_type, settings, sort_order)
select id, 'application', jsonb_build_object(
  'actions', jsonb_build_array(
    jsonb_build_object('label', '공간 촬영 대관 신청', 'href', '/rental'),
    jsonb_build_object('label', '물품 대여 신청', 'href', '/space-inquiry/item-rental'),
    jsonb_build_object('label', '공간 스타일링 문의', 'href', '/space-inquiry/styling')
  )
), 1
from page_builder where slug = 'studio';

insert into page_modules (page_id, module_type, settings, sort_order)
select id, 'calendar', '{}'::jsonb, 2 from page_builder where slug = 'studio';

insert into page_modules (page_id, module_type, board_id, settings, sort_order)
select id, 'board', null, '{}'::jsonb, 3 from page_builder where slug = 'studio';
