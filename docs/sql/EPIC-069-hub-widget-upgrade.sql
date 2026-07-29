-- EPIC-069: Hub 페이지를 Hero + 다중 Slide 위젯 구성으로 고도화
--
-- 배경: EPIC-068 백필 SQL 실행(2026-07-30) 이후 하위 카테고리에 실제 게시판/글이
-- 생겼다. 그런데 /docent, /community/topics, /heritage, /gallery, /archive,
-- /membership 6개 Hub 페이지는 여전히 하위 카테고리를 "application" 위젯(단순 버튼
-- 목록)으로만 나열하고 있어, 게시판에 실제 콘텐츠가 있어도 Hub 화면에서는 미리보기가
-- 전혀 보이지 않는다. 이 스크립트는 각 하위 카테고리 버튼을 실제 게시판에 연결된
-- "slide"(Latest Posts Slider) 위젯으로 교체해 Hub 화면에서 바로 최신 글 미리보기가
-- 보이도록 한다.
--
-- 또한 EPIC-068 백필 가드("이 페이지에 모듈이 0개일 때만 삽입")에 걸려 hero/quote가
-- 채워지지 못했던 orphan 페이지 2개(salon-gallery-awards, shop-reviews)도 함께
-- 보강한다 — 기존에 이미 있던 gallery 위젯은 건드리지 않고 그 앞에 hero/quote/board를
-- 추가한다.
--
-- 안전성: 모든 UPDATE는 module_type='application' + 특정 href를 매칭 조건으로 쓰므로,
-- 이미 slide로 바뀐 뒤 재실행하면 매칭되는 행이 없어 자동으로 안전(멱등). INSERT 구간은
-- "이 페이지에 hero가 아직 없을 때만" DO 블록 가드로 감쌌다.

-- =====================================================================
-- 1. /docent — 11개 시대(era) 버튼 → 게시판 연결 Slide
-- =====================================================================

delete from page_modules
where page_id = (select id from page_builder where slug = 'docent')
  and module_type = 'breadcrumb';

delete from page_modules
where page_id = (select id from page_builder where slug = 'docent')
  and module_type = 'board' and board_id is null;

update page_modules set module_type = 'slide',
  board_id = (select id from boards where category = 'renaissance'),
  settings = jsonb_build_object('sort', 'latest', 'title', '르네상스')
where page_id = (select id from page_builder where slug = 'docent')
  and module_type = 'application' and settings->'actions'->0->>'href' = '/docent/renaissance';

update page_modules set module_type = 'slide',
  board_id = (select id from boards where category = 'baroque'),
  settings = jsonb_build_object('sort', 'latest', 'title', '바로크')
where page_id = (select id from page_builder where slug = 'docent')
  and module_type = 'application' and settings->'actions'->0->>'href' = '/docent/baroque';

update page_modules set module_type = 'slide',
  board_id = (select id from boards where category = 'rococo'),
  settings = jsonb_build_object('sort', 'latest', 'title', '로코코')
where page_id = (select id from page_builder where slug = 'docent')
  and module_type = 'application' and settings->'actions'->0->>'href' = '/docent/rococo';

update page_modules set module_type = 'slide',
  board_id = (select id from boards where category = 'neoclassicism'),
  settings = jsonb_build_object('sort', 'latest', 'title', '신고전주의')
where page_id = (select id from page_builder where slug = 'docent')
  and module_type = 'application' and settings->'actions'->0->>'href' = '/docent/neoclassicism';

update page_modules set module_type = 'slide',
  board_id = (select id from boards where category = 'regency'),
  settings = jsonb_build_object('sort', 'latest', 'title', '리젠시')
where page_id = (select id from page_builder where slug = 'docent')
  and module_type = 'application' and settings->'actions'->0->>'href' = '/docent/regency';

update page_modules set module_type = 'slide',
  board_id = (select id from boards where category = 'victoria'),
  settings = jsonb_build_object('sort', 'latest', 'title', '빅토리아')
where page_id = (select id from page_builder where slug = 'docent')
  and module_type = 'application' and settings->'actions'->0->>'href' = '/docent/victoria';

update page_modules set module_type = 'slide',
  board_id = (select id from boards where category = 'art-nouveau'),
  settings = jsonb_build_object('sort', 'latest', 'title', '아르누보')
where page_id = (select id from page_builder where slug = 'docent')
  and module_type = 'application' and settings->'actions'->0->>'href' = '/docent/art-nouveau';

update page_modules set module_type = 'slide',
  board_id = (select id from boards where category = 'art-deco'),
  settings = jsonb_build_object('sort', 'latest', 'title', '아르데코')
where page_id = (select id from page_builder where slug = 'docent')
  and module_type = 'application' and settings->'actions'->0->>'href' = '/docent/art-deco';

update page_modules set module_type = 'slide',
  board_id = (select id from boards where category = 'beat-generation'),
  settings = jsonb_build_object('sort', 'latest', 'title', '비트 세대')
where page_id = (select id from page_builder where slug = 'docent')
  and module_type = 'application' and settings->'actions'->0->>'href' = '/docent/beat-generation';

update page_modules set module_type = 'slide',
  board_id = (select id from boards where category = 'counter-culture'),
  settings = jsonb_build_object('sort', 'latest', 'title', '카운터 컬처')
where page_id = (select id from page_builder where slug = 'docent')
  and module_type = 'application' and settings->'actions'->0->>'href' = '/docent/counterculture';

update page_modules set module_type = 'slide',
  board_id = (select id from boards where category = 'digital'),
  settings = jsonb_build_object('sort', 'latest', 'title', '디지털')
where page_id = (select id from page_builder where slug = 'docent')
  and module_type = 'application' and settings->'actions'->0->>'href' = '/docent/digital';

-- =====================================================================
-- 2. /heritage — Grandmas/Grandpas 버튼 → Slide
-- =====================================================================

update page_modules set module_type = 'slide',
  board_id = (select id from boards where category = 'grandmas'),
  settings = jsonb_build_object('sort', 'latest', 'title', 'Grandmas')
where page_id = (select id from page_builder where slug = 'heritage')
  and module_type = 'application' and settings->'actions'->0->>'href' = '/heritage/grandmas';

update page_modules set module_type = 'slide',
  board_id = (select id from boards where category = 'grandpas'),
  settings = jsonb_build_object('sort', 'latest', 'title', 'Grandpas')
where page_id = (select id from page_builder where slug = 'heritage')
  and module_type = 'application' and settings->'actions'->0->>'href' = '/heritage/grandpas';

-- =====================================================================
-- 3. /gallery — 시상식/공연/파티/방문자/패트론 버튼 → Slide
-- =====================================================================

update page_modules set module_type = 'slide',
  board_id = (select id from boards where category = 'awards'),
  settings = jsonb_build_object('sort', 'latest', 'title', '시상식')
where page_id = (select id from page_builder where slug = 'gallery')
  and module_type = 'application' and settings->'actions'->0->>'href' = '/gallery/awards';

update page_modules set module_type = 'slide',
  board_id = (select id from boards where category = 'performances'),
  settings = jsonb_build_object('sort', 'latest', 'title', '공연')
where page_id = (select id from page_builder where slug = 'gallery')
  and module_type = 'application' and settings->'actions'->0->>'href' = '/gallery/performance';

update page_modules set module_type = 'slide',
  board_id = (select id from boards where category = 'parties'),
  settings = jsonb_build_object('sort', 'latest', 'title', '파티')
where page_id = (select id from page_builder where slug = 'gallery')
  and module_type = 'application' and settings->'actions'->0->>'href' = '/gallery/parties';

update page_modules set module_type = 'slide',
  board_id = (select id from boards where category = 'gallery-visitors'),
  settings = jsonb_build_object('sort', 'latest', 'title', '방문자')
where page_id = (select id from page_builder where slug = 'gallery')
  and module_type = 'application' and settings->'actions'->0->>'href' = '/gallery/visitors';

update page_modules set module_type = 'slide',
  board_id = (select id from boards where category = 'patrons'),
  settings = jsonb_build_object('sort', 'latest', 'title', '패트론')
where page_id = (select id from page_builder where slug = 'gallery')
  and module_type = 'application' and settings->'actions'->0->>'href' = '/gallery/patrons';

-- =====================================================================
-- 4. /archive — 기존 board(자료게시판) 위젯은 유지, 소개지/포스터/타임라인 버튼 → Slide
-- =====================================================================

update page_modules set module_type = 'slide',
  board_id = (select id from boards where category = 'brochure'),
  settings = jsonb_build_object('sort', 'latest', 'title', '소개지')
where page_id = (select id from page_builder where slug = 'archive')
  and module_type = 'application' and settings->'actions'->0->>'href' = '/archive/brochure';

update page_modules set module_type = 'slide',
  board_id = (select id from boards where category = 'poster'),
  settings = jsonb_build_object('sort', 'latest', 'title', '포스터')
where page_id = (select id from page_builder where slug = 'archive')
  and module_type = 'application' and settings->'actions'->0->>'href' = '/archive/posters';

update page_modules set module_type = 'slide',
  board_id = (select id from boards where category = 'timeline'),
  settings = jsonb_build_object('sort', 'latest', 'title', '타임라인')
where page_id = (select id from page_builder where slug = 'archive')
  and module_type = 'application' and settings->'actions'->0->>'href' = '/archive/timeline';

-- =====================================================================
-- 5. /membership — 기존 board(패트론 라운지/아티스트 홍보) 위젯은 유지,
--    나의 보물이야기/한문장 소설/마음일기/비밀의 방 버튼 → Slide
-- =====================================================================

update page_modules set module_type = 'slide',
  board_id = (select id from boards where category = 'my-treasures'),
  settings = jsonb_build_object('sort', 'latest', 'title', '나의 보물이야기')
where page_id = (select id from page_builder where slug = 'membership')
  and module_type = 'application' and settings->'actions'->0->>'href' = '/membership/my-treasures';

update page_modules set module_type = 'slide',
  board_id = (select id from boards where category = 'one-line-novel'),
  settings = jsonb_build_object('sort', 'latest', 'title', '한문장 소설 프로젝트')
where page_id = (select id from page_builder where slug = 'membership')
  and module_type = 'application' and settings->'actions'->0->>'href' = '/membership/one-sentence-novel';

update page_modules set module_type = 'slide',
  board_id = (select id from boards where category = 'mind-diary'),
  settings = jsonb_build_object('sort', 'latest', 'title', '마음일기')
where page_id = (select id from page_builder where slug = 'membership')
  and module_type = 'application' and settings->'actions'->0->>'href' = '/membership/mind-diary';

update page_modules set module_type = 'slide',
  board_id = (select id from boards where category = 'secret-room-docent'),
  settings = jsonb_build_object('sort', 'latest', 'title', '비밀의 방 도슨트')
where page_id = (select id from page_builder where slug = 'membership')
  and module_type = 'application' and settings->'actions'->0->>'href' = '/membership/secret-room';

-- =====================================================================
-- 6. /community/topics — 13개 클럽 전부를 Slide로(hero 없이 text/단일
--    slide·board·gallery·video 5개로 구성돼 있던 기존 상태를 전면 교체).
--    이미 hero가 있으면(=이 스크립트가 이미 실행됐으면) 건드리지 않는다.
-- =====================================================================

do $$
declare
  pid uuid := (select id from page_builder where slug = 'community-topics');
begin
  if pid is not null and not exists (
    select 1 from page_modules where page_id = pid and module_type = 'hero'
  ) then
    delete from page_modules where page_id = pid;

    insert into page_modules (page_id, module_type, sort_order, board_id, settings) values
      (pid, 'hero', 0, null, jsonb_build_object(
        'title', '주제별 소통 게시판',
        'subtitle', '살롱데상 · 커뮤니티',
        'description', '13개 주제별 클럽 게시판의 최신 글을 모아보는 허브입니다.',
        'breadcrumb', jsonb_build_array(
          jsonb_build_object('href', '/', 'label', '홈'),
          jsonb_build_object('label', '살롱데상'),
          jsonb_build_object('href', '/community', 'label', '커뮤니티'),
          jsonb_build_object('label', '주제별 소통 게시판')
        )
      )),
      (pid, 'slide', 1, (select id from boards where category = 'economy'), jsonb_build_object('sort', 'latest', 'title', '경제 클럽')),
      (pid, 'slide', 2, (select id from boards where category = 'art'), jsonb_build_object('sort', 'latest', 'title', '예술 클럽')),
      (pid, 'slide', 3, (select id from boards where category = 'history'), jsonb_build_object('sort', 'latest', 'title', '세계역사 클럽')),
      (pid, 'slide', 4, (select id from boards where category = 'science'), jsonb_build_object('sort', 'latest', 'title', '과학 클럽')),
      (pid, 'slide', 5, (select id from boards where category = 'comedy'), jsonb_build_object('sort', 'latest', 'title', '코메디 클럽')),
      (pid, 'slide', 6, (select id from boards where category = 'literature'), jsonb_build_object('sort', 'latest', 'title', '문학 클럽')),
      (pid, 'slide', 7, (select id from boards where category = 'health'), jsonb_build_object('sort', 'latest', 'title', '건강 클럽')),
      (pid, 'slide', 8, (select id from boards where category = 'politics'), jsonb_build_object('sort', 'latest', 'title', '정치 클럽')),
      (pid, 'slide', 9, (select id from boards where category = 'movie'), jsonb_build_object('sort', 'latest', 'title', '영화 클럽')),
      (pid, 'slide', 10, (select id from boards where category = 'psychology'), jsonb_build_object('sort', 'latest', 'title', '심리 클럽')),
      (pid, 'slide', 11, (select id from boards where category = 'sports'), jsonb_build_object('sort', 'latest', 'title', '스포츠 클럽')),
      (pid, 'slide', 12, (select id from boards where category = 'pets'), jsonb_build_object('sort', 'latest', 'title', '인간 집사들 클럽')),
      (pid, 'slide', 13, (select id from boards where category = 'warmth'), jsonb_build_object('sort', 'latest', 'title', '따듯한 세상 클럽'));
  end if;
end $$;

-- =====================================================================
-- 7. Orphan 페이지 2개 — 기존 gallery 위젯은 유지하고 hero/quote/board를 보강
-- =====================================================================

do $$
declare
  pid uuid := (select id from page_builder where slug = 'salon-gallery-awards');
begin
  if pid is not null and not exists (
    select 1 from page_modules where page_id = pid and module_type = 'hero'
  ) then
    insert into page_modules (page_id, module_type, sort_order, board_id, settings) values
      (pid, 'hero', 0, null, jsonb_build_object(
        'title', '시상식',
        'subtitle', '살롱데상 · 갤러리',
        'description', '시상식을 소개하는 스토리 게시판입니다.',
        'breadcrumb', jsonb_build_array(
          jsonb_build_object('href', '/', 'label', '홈'),
          jsonb_build_object('label', '살롱데상'),
          jsonb_build_object('label', '갤러리'),
          jsonb_build_object('label', '시상식')
        )
      )),
      (pid, 'quote', 1, null, jsonb_build_object('text', '인용문을 입력하세요', 'author', '')),
      (pid, 'board', 2, (select id from boards where category = 'awards'), '{}'::jsonb);

    update page_modules set board_id = (select id from boards where category = 'awards'), sort_order = 3
    where page_id = pid and module_type = 'gallery' and board_id is null;
  end if;
end $$;

do $$
declare
  pid uuid := (select id from page_builder where slug = 'shop-reviews');
  adoption_board_id uuid;
begin
  if pid is not null and not exists (
    select 1 from page_modules where page_id = pid and module_type = 'hero'
  ) then
    select board_id into adoption_board_id
    from page_modules where page_id = pid and module_type = 'gallery' limit 1;

    insert into page_modules (page_id, module_type, sort_order, board_id, settings) values
      (pid, 'hero', 0, null, jsonb_build_object(
        'title', 'After Adoption',
        'subtitle', '사일로상점',
        'description', '구매하신 물품의 분양 후 이야기를 나누는 게시판입니다.',
        'breadcrumb', jsonb_build_array(
          jsonb_build_object('href', '/', 'label', '홈'),
          jsonb_build_object('label', '사일로상점'),
          jsonb_build_object('label', 'After Adoption')
        )
      )),
      (pid, 'quote', 1, null, jsonb_build_object('text', '인용문을 입력하세요', 'author', '')),
      (pid, 'board', 2, adoption_board_id, '{}'::jsonb);

    update page_modules set sort_order = 3
    where page_id = pid and module_type = 'gallery';
  end if;
end $$;
