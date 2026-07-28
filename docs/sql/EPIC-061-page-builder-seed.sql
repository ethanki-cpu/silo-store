-- EPIC-061: page_builder/page_modules를 "관리자가 아무것도 안 해도 완성된 상태"로
-- 완전 재시딩한다. EPIC-060 스크립트(draft, board_id 미연결)를 대체한다 --
-- 이 파일 하나만 실행하면 되고, EPIC-060 스크립트를 이미 실행했어도 안전하게
-- 다시 실행 가능하다(멱등: 테이블은 IF NOT EXISTS, 데이터는 삭제 후 재삽입).
--
-- 여전히 CREATE TABLE(DDL)이 포함되어 있어 anon key로 실행 불가 —
-- Supabase SQL Editor 또는 Management API로 직접 실행해야 한다.

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

alter table page_builder enable row level security;
alter table page_modules enable row level security;

drop policy if exists "page_builder_public_read" on page_builder;
create policy "page_builder_public_read" on page_builder
  for select
  using (
    status = 'published'
    or exists (select 1 from members where members.auth_user_id = auth.uid() and members.is_admin = true)
  );

drop policy if exists "page_builder_admin_write" on page_builder;
create policy "page_builder_admin_write" on page_builder
  for all
  using (exists (select 1 from members where members.auth_user_id = auth.uid() and members.is_admin = true))
  with check (exists (select 1 from members where members.auth_user_id = auth.uid() and members.is_admin = true));

drop policy if exists "page_modules_public_read" on page_modules;
create policy "page_modules_public_read" on page_modules
  for select
  using (
    exists (
      select 1 from page_builder pb
      where pb.id = page_modules.page_id
        and (pb.status = 'published' or exists (select 1 from members where members.auth_user_id = auth.uid() and members.is_admin = true))
    )
  );

drop policy if exists "page_modules_admin_write" on page_modules;
create policy "page_modules_admin_write" on page_modules
  for all
  using (exists (select 1 from members where members.auth_user_id = auth.uid() and members.is_admin = true))
  with check (exists (select 1 from members where members.auth_user_id = auth.uid() and members.is_admin = true));

-- ============================================================
-- Seed — 전부 published, board 연동 모듈은 전부 실제 board_id(라이브 DB에서
-- 2026-07-29 기준 조회한 값). 재실행 안전을 위해 8개 slug의 기존 모듈을
-- 먼저 지우고 다시 채운다(page_builder 행 자체는 upsert).
-- ============================================================

insert into page_builder (slug, title, description, status)
values
  ('community', 'Community', 'Salon des Cent Community 메인 허브 — 자유게시판, 주제별 소통, 요일별 모임, Q&A의 실제 게시판을 모아봅니다.', 'published'),
  ('gallery', 'Gallery', 'Gallery 메인 허브 — 시상식, 공연, 파티, 방문자, 패트론 콘텐츠 모음.', 'published'),
  ('archive', 'Archive', 'Archive 메인 허브 — 자료게시판과 아카이브 콘텐츠 모음.', 'published'),
  ('membership', 'Membership', 'Membership 메인 허브 — 패트론 라운지, 아티스트 홍보 게시판과 멤버십 콘텐츠 모음.', 'published'),
  ('studio', 'Studio', 'Studio 메인 허브 — 공간 대관(1F/2F), 물품 대여, 공간 스타일링 예약과 캘린더.', 'published'),
  ('heritage', 'Heritage', 'Grandmas/Grandpas 이야기를 모아보는 사일로 Heritage 메인 허브입니다.', 'published'),
  ('docent', 'Online Docent', '사일로상점/살롱데상 온라인 도슨트 11개 시대 콘텐츠(실제 화면은 기존 docent_contents 조회 코드 유지, 메타데이터만 등록).', 'published'),
  ('mypage', 'MyPage', '회원 개인 허브 — 컬렉션/위시리스트/타임라인/방문자/배지/댓글/버킷리스트.', 'published')
on conflict (slug) do update set status = 'published', title = excluded.title, description = excluded.description, updated_at = now();

delete from page_modules where page_id in (select id from page_builder where slug in
  ('community','gallery','archive','membership','studio','heritage','docent','mypage'));



insert into page_modules (page_id, module_type, board_id, settings, sort_order) select id, 'hero', null, jsonb_build_object('title','Community','subtitle','살롱데상','description','Salon des Cent Community 메인 허브 — 자유게시판, 주제별 소통, 요일별 모임, Q&A의 실제 게시판을 모아봅니다.','breadcrumb','[{"label":"홈","href":"/"},{"label":"살롱데상"},{"label":"Community"}]'::jsonb), 0 from page_builder where slug = 'community';

insert into page_modules (page_id, module_type, board_id, settings, sort_order) select id, 'slide', 'b0f009f3-6982-4d3c-959a-76e5386b9c34', jsonb_build_object('title','최신 글','sort','latest'), 1 from page_builder where slug = 'community';

insert into page_modules (page_id, module_type, board_id, settings, sort_order) select id, 'slide', 'b0f009f3-6982-4d3c-959a-76e5386b9c34', jsonb_build_object('title','인기 글','sort','popular'), 2 from page_builder where slug = 'community';

insert into page_modules (page_id, module_type, board_id, settings, sort_order) select id, 'application', null, jsonb_build_object('actions', jsonb_build_array(jsonb_build_object('label','출석체크','href','/attendance'))), 3 from page_builder where slug = 'community';

insert into page_modules (page_id, module_type, board_id, settings, sort_order) select id, 'board', 'b0f009f3-6982-4d3c-959a-76e5386b9c34', '{}'::jsonb, 4 from page_builder where slug = 'community';

insert into page_modules (page_id, module_type, board_id, settings, sort_order) select id, 'slide', '6ad97043-0c75-4c9c-9f67-dd3f24f50e5e', jsonb_build_object('title','경제 클럽'), 5 from page_builder where slug = 'community';

insert into page_modules (page_id, module_type, board_id, settings, sort_order) select id, 'slide', '8a03b831-692c-40eb-b87d-97cf0294ce69', jsonb_build_object('title','예술 클럽'), 6 from page_builder where slug = 'community';

insert into page_modules (page_id, module_type, board_id, settings, sort_order) select id, 'slide', '35d06411-6957-4e82-a144-3fe8651191e1', jsonb_build_object('title','세계역사 클럽'), 7 from page_builder where slug = 'community';

insert into page_modules (page_id, module_type, board_id, settings, sort_order) select id, 'slide', '6152cbaa-c8d7-44a1-ac4c-a0a418aef5ce', jsonb_build_object('title','과학 클럽'), 8 from page_builder where slug = 'community';

insert into page_modules (page_id, module_type, board_id, settings, sort_order) select id, 'slide', '77110fdd-18e3-4ce4-9c46-4a7dd2434ce4', jsonb_build_object('title','코메디 클럽'), 9 from page_builder where slug = 'community';

insert into page_modules (page_id, module_type, board_id, settings, sort_order) select id, 'slide', '7d2fa3f8-1b52-42a7-88dd-2337b79f606b', jsonb_build_object('title','문학 클럽'), 10 from page_builder where slug = 'community';

insert into page_modules (page_id, module_type, board_id, settings, sort_order) select id, 'slide', 'bbaac6c2-ac4b-44ca-bdb0-e424231825e6', jsonb_build_object('title','건강 클럽'), 11 from page_builder where slug = 'community';

insert into page_modules (page_id, module_type, board_id, settings, sort_order) select id, 'slide', '19898353-7be7-4715-93fa-bd3a37051583', jsonb_build_object('title','정치 클럽'), 12 from page_builder where slug = 'community';

insert into page_modules (page_id, module_type, board_id, settings, sort_order) select id, 'slide', 'e1ece7bb-81aa-4738-bfd5-b53bd57aeecd', jsonb_build_object('title','영화 클럽'), 13 from page_builder where slug = 'community';

insert into page_modules (page_id, module_type, board_id, settings, sort_order) select id, 'slide', '5b76ed4c-0f20-4175-8196-10197cbb2d1e', jsonb_build_object('title','심리 클럽'), 14 from page_builder where slug = 'community';

insert into page_modules (page_id, module_type, board_id, settings, sort_order) select id, 'slide', '36c5c652-2dd9-4b34-b3e6-58b3eafcb113', jsonb_build_object('title','스포츠 클럽'), 15 from page_builder where slug = 'community';

insert into page_modules (page_id, module_type, board_id, settings, sort_order) select id, 'slide', '7b7df043-292e-4808-999e-35b39412f02b', jsonb_build_object('title','인간 집사들 클럽'), 16 from page_builder where slug = 'community';

insert into page_modules (page_id, module_type, board_id, settings, sort_order) select id, 'slide', '409f6463-1e32-4c93-af21-add36cde0ec7', jsonb_build_object('title','따듯한 세상 클럽'), 17 from page_builder where slug = 'community';

insert into page_modules (page_id, module_type, board_id, settings, sort_order) select id, 'slide', '60fac912-479b-43f7-9c9f-3fa430c2d290', jsonb_build_object('title','월요반란 클럽 모임방'), 18 from page_builder where slug = 'community';

insert into page_modules (page_id, module_type, board_id, settings, sort_order) select id, 'slide', '552c4a76-d360-4641-a2f5-52866ac6d8b7', jsonb_build_object('title','책 낭송 클럽 모임방'), 19 from page_builder where slug = 'community';

insert into page_modules (page_id, module_type, board_id, settings, sort_order) select id, 'slide', '2852eafb-9d67-404f-a0ab-b20dde1f21f7', jsonb_build_object('title','행간의 조각가 모임방'), 20 from page_builder where slug = 'community';

insert into page_modules (page_id, module_type, board_id, settings, sort_order) select id, 'slide', 'dfb601f3-f000-43f1-a1c6-71d32e80c92e', jsonb_build_object('title','놀아보자 영어클럽 모임방'), 21 from page_builder where slug = 'community';

insert into page_modules (page_id, module_type, board_id, settings, sort_order) select id, 'slide', 'f4721f4b-96cf-4452-abe1-6ed0dbe26b15', jsonb_build_object('title','비포 선라이즈 소셜클럽 모임방'), 22 from page_builder where slug = 'community';

insert into page_modules (page_id, module_type, board_id, settings, sort_order) select id, 'slide', '0292cdf6-2fe4-40a7-be34-27544f7a3cd9', jsonb_build_object('title','무슨일이든 일어날수있어 클럽 모임방'), 23 from page_builder where slug = 'community';

insert into page_modules (page_id, module_type, board_id, settings, sort_order) select id, 'slide', '841ec465-a34f-4bd5-8ecc-13a8912e3a3c', jsonb_build_object('title','연극이 끝나고 난 뒤 클럽 모임방'), 24 from page_builder where slug = 'community';

insert into page_modules (page_id, module_type, board_id, settings, sort_order) select id, 'board', '2af851de-05d2-4150-8005-238cfe11147a', '{}'::jsonb, 25 from page_builder where slug = 'community';

insert into page_modules (page_id, module_type, board_id, settings, sort_order) select id, 'application', null, jsonb_build_object('actions', jsonb_build_array(jsonb_build_object('label','이벤트 공지','href','/salon/event-notices'))), 26 from page_builder where slug = 'community';

insert into page_modules (page_id, module_type, board_id, settings, sort_order) select id, 'hero', null, jsonb_build_object('title','Gallery','subtitle','살롱데상','description','Gallery 메인 허브 — 시상식, 공연, 파티, 방문자, 패트론 콘텐츠 모음.','breadcrumb','[{"label":"홈","href":"/"},{"label":"살롱데상"},{"label":"Gallery"}]'::jsonb), 0 from page_builder where slug = 'gallery';

insert into page_modules (page_id, module_type, board_id, settings, sort_order) select id, 'application', null, jsonb_build_object('actions', jsonb_build_array(jsonb_build_object('label','시상식 Awards','href','/gallery/awards'))), 1 from page_builder where slug = 'gallery';

insert into page_modules (page_id, module_type, board_id, settings, sort_order) select id, 'application', null, jsonb_build_object('actions', jsonb_build_array(jsonb_build_object('label','공연 Performance','href','/gallery/performance'))), 2 from page_builder where slug = 'gallery';

insert into page_modules (page_id, module_type, board_id, settings, sort_order) select id, 'application', null, jsonb_build_object('actions', jsonb_build_array(jsonb_build_object('label','파티 Party','href','/gallery/parties'))), 3 from page_builder where slug = 'gallery';

insert into page_modules (page_id, module_type, board_id, settings, sort_order) select id, 'application', null, jsonb_build_object('actions', jsonb_build_array(jsonb_build_object('label','방문자 Visitors','href','/gallery/visitors'))), 4 from page_builder where slug = 'gallery';

insert into page_modules (page_id, module_type, board_id, settings, sort_order) select id, 'application', null, jsonb_build_object('actions', jsonb_build_array(jsonb_build_object('label','패트론 Patrons','href','/gallery/patrons'))), 5 from page_builder where slug = 'gallery';

insert into page_modules (page_id, module_type, board_id, settings, sort_order) select id, 'hero', null, jsonb_build_object('title','Archive','subtitle','살롱데상','description','Archive 메인 허브 — 자료게시판과 아카이브 콘텐츠 모음.','breadcrumb','[{"label":"홈","href":"/"},{"label":"살롱데상"},{"label":"Archive"}]'::jsonb), 0 from page_builder where slug = 'archive';

insert into page_modules (page_id, module_type, board_id, settings, sort_order) select id, 'board', 'fae3fc66-3e58-4c83-b27c-5f5263f272b9', '{}'::jsonb, 1 from page_builder where slug = 'archive';

insert into page_modules (page_id, module_type, board_id, settings, sort_order) select id, 'application', null, jsonb_build_object('actions', jsonb_build_array(jsonb_build_object('label','소개지','href','/archive/brochure'))), 2 from page_builder where slug = 'archive';

insert into page_modules (page_id, module_type, board_id, settings, sort_order) select id, 'application', null, jsonb_build_object('actions', jsonb_build_array(jsonb_build_object('label','포스터','href','/archive/posters'))), 3 from page_builder where slug = 'archive';

insert into page_modules (page_id, module_type, board_id, settings, sort_order) select id, 'application', null, jsonb_build_object('actions', jsonb_build_array(jsonb_build_object('label','타임라인','href','/archive/timeline'))), 4 from page_builder where slug = 'archive';

insert into page_modules (page_id, module_type, board_id, settings, sort_order) select id, 'hero', null, jsonb_build_object('title','Membership','subtitle','살롱데상','description','Membership 메인 허브 — 패트론 라운지, 아티스트 홍보 게시판과 멤버십 콘텐츠 모음.','breadcrumb','[{"label":"홈","href":"/"},{"label":"살롱데상"},{"label":"Membership"}]'::jsonb), 0 from page_builder where slug = 'membership';

insert into page_modules (page_id, module_type, board_id, settings, sort_order) select id, 'board', 'f6301106-2633-400b-bb82-7f871236b0fe', '{}'::jsonb, 1 from page_builder where slug = 'membership';

insert into page_modules (page_id, module_type, board_id, settings, sort_order) select id, 'board', '8cd7886a-dce8-46a5-9a5f-f34c842623da', '{}'::jsonb, 2 from page_builder where slug = 'membership';

insert into page_modules (page_id, module_type, board_id, settings, sort_order) select id, 'application', null, jsonb_build_object('actions', jsonb_build_array(jsonb_build_object('label','나의 보물이야기','href','/membership/my-treasures'))), 3 from page_builder where slug = 'membership';

insert into page_modules (page_id, module_type, board_id, settings, sort_order) select id, 'application', null, jsonb_build_object('actions', jsonb_build_array(jsonb_build_object('label','한문장 소설 프로젝트','href','/membership/one-sentence-novel'))), 4 from page_builder where slug = 'membership';

insert into page_modules (page_id, module_type, board_id, settings, sort_order) select id, 'application', null, jsonb_build_object('actions', jsonb_build_array(jsonb_build_object('label','마음일기','href','/membership/mind-diary'))), 5 from page_builder where slug = 'membership';

insert into page_modules (page_id, module_type, board_id, settings, sort_order) select id, 'application', null, jsonb_build_object('actions', jsonb_build_array(jsonb_build_object('label','비밀의 방 도슨트','href','/membership/secret-room'))), 6 from page_builder where slug = 'membership';

insert into page_modules (page_id, module_type, board_id, settings, sort_order) select id, 'hero', null, jsonb_build_object('title','Heritage','subtitle','사일로상점','description','Grandmas/Grandpas 이야기를 모아보는 사일로 Heritage 메인 허브입니다.','breadcrumb','[{"label":"홈","href":"/"},{"label":"사일로상점"},{"label":"Heritage"}]'::jsonb), 0 from page_builder where slug = 'heritage';

insert into page_modules (page_id, module_type, board_id, settings, sort_order) select id, 'application', null, jsonb_build_object('actions', jsonb_build_array(jsonb_build_object('label','Grandmas','href','/heritage/grandmas'))), 1 from page_builder where slug = 'heritage';

insert into page_modules (page_id, module_type, board_id, settings, sort_order) select id, 'application', null, jsonb_build_object('actions', jsonb_build_array(jsonb_build_object('label','Grandpas','href','/heritage/grandpas'))), 2 from page_builder where slug = 'heritage';

insert into page_modules (page_id, module_type, board_id, settings, sort_order) select id, 'hero', null, jsonb_build_object('title','Studio','subtitle','스튜디오','description','Studio 메인 허브 — 공간 대관(1F/2F), 물품 대여, 공간 스타일링 예약과 캘린더.','breadcrumb','[{"label":"홈","href":"/"},{"label":"스튜디오"},{"label":"Studio"}]'::jsonb), 0 from page_builder where slug = 'studio';

insert into page_modules (page_id, module_type, board_id, settings, sort_order) select id, 'application', null, jsonb_build_object('actions', jsonb_build_array(
  jsonb_build_object('label','공간 촬영 대관 신청','href','/rental'),
  jsonb_build_object('label','물품 대여 신청','href','/space-inquiry/item-rental'),
  jsonb_build_object('label','공간 스타일링 문의','href','/space-inquiry/styling')
)), 1 from page_builder where slug = 'studio';

insert into page_modules (page_id, module_type, board_id, settings, sort_order) select id, 'calendar', null, '{}'::jsonb, 2 from page_builder where slug = 'studio';

insert into page_modules (page_id, module_type, board_id, settings, sort_order) select id, 'hero', null, jsonb_build_object('title','Online Docent','subtitle','사일로상점','description','사일로상점/살롱데상 온라인 도슨트 콘텐츠입니다.','breadcrumb','[{"label":"홈","href":"/"},{"label":"사일로상점"},{"label":"Online Docent"}]'::jsonb), 0 from page_builder where slug = 'docent';

insert into page_modules (page_id, module_type, board_id, settings, sort_order) select id, 'application', null, jsonb_build_object('actions', jsonb_build_array(jsonb_build_object('label','Renaissance','href','/docent/renaissance'))), 1 from page_builder where slug = 'docent';

insert into page_modules (page_id, module_type, board_id, settings, sort_order) select id, 'application', null, jsonb_build_object('actions', jsonb_build_array(jsonb_build_object('label','Baroque','href','/docent/baroque'))), 2 from page_builder where slug = 'docent';

insert into page_modules (page_id, module_type, board_id, settings, sort_order) select id, 'application', null, jsonb_build_object('actions', jsonb_build_array(jsonb_build_object('label','Rococo','href','/docent/rococo'))), 3 from page_builder where slug = 'docent';

insert into page_modules (page_id, module_type, board_id, settings, sort_order) select id, 'application', null, jsonb_build_object('actions', jsonb_build_array(jsonb_build_object('label','NeoClassicism','href','/docent/neoclassicism'))), 4 from page_builder where slug = 'docent';

insert into page_modules (page_id, module_type, board_id, settings, sort_order) select id, 'application', null, jsonb_build_object('actions', jsonb_build_array(jsonb_build_object('label','Regency','href','/docent/regency'))), 5 from page_builder where slug = 'docent';

insert into page_modules (page_id, module_type, board_id, settings, sort_order) select id, 'application', null, jsonb_build_object('actions', jsonb_build_array(jsonb_build_object('label','Victoria','href','/docent/victoria'))), 6 from page_builder where slug = 'docent';

insert into page_modules (page_id, module_type, board_id, settings, sort_order) select id, 'application', null, jsonb_build_object('actions', jsonb_build_array(jsonb_build_object('label','Art Nouveau','href','/docent/art-nouveau'))), 7 from page_builder where slug = 'docent';

insert into page_modules (page_id, module_type, board_id, settings, sort_order) select id, 'application', null, jsonb_build_object('actions', jsonb_build_array(jsonb_build_object('label','Art Deco','href','/docent/art-deco'))), 8 from page_builder where slug = 'docent';

insert into page_modules (page_id, module_type, board_id, settings, sort_order) select id, 'application', null, jsonb_build_object('actions', jsonb_build_array(jsonb_build_object('label','Beat Generation','href','/docent/beat-generation'))), 9 from page_builder where slug = 'docent';

insert into page_modules (page_id, module_type, board_id, settings, sort_order) select id, 'application', null, jsonb_build_object('actions', jsonb_build_array(jsonb_build_object('label','CounterCulture','href','/docent/counterculture'))), 10 from page_builder where slug = 'docent';

insert into page_modules (page_id, module_type, board_id, settings, sort_order) select id, 'application', null, jsonb_build_object('actions', jsonb_build_array(jsonb_build_object('label','Digital','href','/docent/digital'))), 11 from page_builder where slug = 'docent';

insert into page_modules (page_id, module_type, board_id, settings, sort_order) select id, 'hero', null, jsonb_build_object('title','MyPage','subtitle','마이페이지','description','나만의 물건과 이야기, 흔적이 모이는 작은 박물관입니다.','breadcrumb','[{"label":"홈","href":"/"},{"label":"마이페이지"},{"label":"MyPage"}]'::jsonb), 0 from page_builder where slug = 'mypage';

insert into page_modules (page_id, module_type, board_id, settings, sort_order) select id, 'application', null, jsonb_build_object('actions', jsonb_build_array(jsonb_build_object('label','나의 컬렉션','href','/mypage/collections'))), 1 from page_builder where slug = 'mypage';

insert into page_modules (page_id, module_type, board_id, settings, sort_order) select id, 'application', null, jsonb_build_object('actions', jsonb_build_array(jsonb_build_object('label','나의 위시리스트','href','/mypage/wishlist'))), 2 from page_builder where slug = 'mypage';

insert into page_modules (page_id, module_type, board_id, settings, sort_order) select id, 'application', null, jsonb_build_object('actions', jsonb_build_array(jsonb_build_object('label','타임라인','href','/mypage/timeline'))), 3 from page_builder where slug = 'mypage';

insert into page_modules (page_id, module_type, board_id, settings, sort_order) select id, 'application', null, jsonb_build_object('actions', jsonb_build_array(jsonb_build_object('label','방문자 기록','href','/mypage/visitors'))), 4 from page_builder where slug = 'mypage';

insert into page_modules (page_id, module_type, board_id, settings, sort_order) select id, 'application', null, jsonb_build_object('actions', jsonb_build_array(jsonb_build_object('label','받은 배지','href','/mypage/badges'))), 5 from page_builder where slug = 'mypage';

insert into page_modules (page_id, module_type, board_id, settings, sort_order) select id, 'application', null, jsonb_build_object('actions', jsonb_build_array(jsonb_build_object('label','내가 쓴 댓글','href','/mypage/comments'))), 6 from page_builder where slug = 'mypage';

insert into page_modules (page_id, module_type, board_id, settings, sort_order) select id, 'application', null, jsonb_build_object('actions', jsonb_build_array(jsonb_build_object('label','버킷리스트','href','/mypage/bucketlist'))), 7 from page_builder where slug = 'mypage';
