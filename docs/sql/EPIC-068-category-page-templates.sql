-- EPIC-068: Category Page Templates — new boards + page_builder/page_modules
-- backfill for Shop/Docent/Heritage/Community/Membership/Gallery/Archive.
-- Re-run safe: boards guarded by `where not exists (... category=...)`, page_builder
-- is `on conflict (slug) do nothing`, and every page's widgets are only inserted
-- inside a DO block that checks the page currently has zero page_modules — so
-- already-configured pages (e.g. community-general, treasures) are left untouched.

-- ============================================================
-- 1) New boards (~30) for categories with no existing board row
-- ============================================================

insert into boards (name, category, board_type)
select '사일로 보물들', 'treasures', 'topic'
where not exists (select 1 from boards where category = 'treasures');

insert into boards (name, category, board_type)
select '입양신청서 라이브러리', 'adoption-library', 'topic'
where not exists (select 1 from boards where category = 'adoption-library');

insert into boards (name, category, board_type)
select '르네상스', 'renaissance', 'topic'
where not exists (select 1 from boards where category = 'renaissance');

insert into boards (name, category, board_type)
select '바로크', 'baroque', 'topic'
where not exists (select 1 from boards where category = 'baroque');

insert into boards (name, category, board_type)
select '로코코', 'rococo', 'topic'
where not exists (select 1 from boards where category = 'rococo');

insert into boards (name, category, board_type)
select '신고전주의', 'neoclassicism', 'topic'
where not exists (select 1 from boards where category = 'neoclassicism');

insert into boards (name, category, board_type)
select '리젠시', 'regency', 'topic'
where not exists (select 1 from boards where category = 'regency');

insert into boards (name, category, board_type)
select '빅토리아', 'victoria', 'topic'
where not exists (select 1 from boards where category = 'victoria');

insert into boards (name, category, board_type)
select '아르누보', 'art-nouveau', 'topic'
where not exists (select 1 from boards where category = 'art-nouveau');

insert into boards (name, category, board_type)
select '아르데코', 'art-deco', 'topic'
where not exists (select 1 from boards where category = 'art-deco');

insert into boards (name, category, board_type)
select '비트 세대', 'beat-generation', 'topic'
where not exists (select 1 from boards where category = 'beat-generation');

insert into boards (name, category, board_type)
select '카운터 컬처', 'counter-culture', 'topic'
where not exists (select 1 from boards where category = 'counter-culture');

insert into boards (name, category, board_type)
select '디지털', 'digital', 'topic'
where not exists (select 1 from boards where category = 'digital');

insert into boards (name, category, board_type)
select 'Grandmas', 'grandmas', 'topic'
where not exists (select 1 from boards where category = 'grandmas');

insert into boards (name, category, board_type)
select 'Grandpas', 'grandpas', 'topic'
where not exists (select 1 from boards where category = 'grandpas');

insert into boards (name, category, board_type)
select '시상식', 'awards', 'topic'
where not exists (select 1 from boards where category = 'awards');

insert into boards (name, category, board_type)
select '공연들', 'performances', 'topic'
where not exists (select 1 from boards where category = 'performances');

insert into boards (name, category, board_type)
select '파티', 'parties', 'topic'
where not exists (select 1 from boards where category = 'parties');

insert into boards (name, category, board_type)
select '운명의 방문자들', 'gallery-visitors', 'topic'
where not exists (select 1 from boards where category = 'gallery-visitors');

insert into boards (name, category, board_type)
select '패트론들', 'patrons', 'topic'
where not exists (select 1 from boards where category = 'patrons');

insert into boards (name, category, board_type)
select '소개지', 'brochure', 'topic'
where not exists (select 1 from boards where category = 'brochure');

insert into boards (name, category, board_type)
select '포스터', 'poster', 'topic'
where not exists (select 1 from boards where category = 'poster');

insert into boards (name, category, board_type)
select '타임라인', 'timeline', 'topic'
where not exists (select 1 from boards where category = 'timeline');

insert into boards (name, category, board_type)
select '나의 보물 이야기', 'my-treasures', 'topic'
where not exists (select 1 from boards where category = 'my-treasures');

insert into boards (name, category, board_type)
select '마음일기', 'mind-diary', 'topic'
where not exists (select 1 from boards where category = 'mind-diary');

insert into boards (name, category, board_type)
select '한문장 소설 프로젝트', 'one-line-novel', 'topic'
where not exists (select 1 from boards where category = 'one-line-novel');

insert into boards (name, category, board_type)
select '비밀의 방 도슨트', 'secret-room-docent', 'topic'
where not exists (select 1 from boards where category = 'secret-room-docent');

insert into boards (name, category, board_type)
select '공연 / 전시회 소개', 'events', 'topic'
where not exists (select 1 from boards where category = 'events');

insert into boards (name, category, board_type)
select '이벤트 공지', 'notice', 'topic'
where not exists (select 1 from boards where category = 'notice');

insert into boards (name, category, board_type)
select '월별 모임', 'monthly-salon', 'topic'
where not exists (select 1 from boards where category = 'monthly-salon');

-- ============================================================
-- 2) page_builder rows (ensure they exist; never overwrite existing)
-- ============================================================

insert into page_builder (slug, title, description, status)
values
  ('shop-adoption-library', '입양신청서 라이브러리', '입양(구매) 신청서 예시를 모아보는 스토리 게시판입니다.', 'published'),
  ('shop-reviews', '분양 후기', '사일로 보물을 입양(구매/대여)한 회원들의 후기 게시판입니다.', 'published'),
  ('docent', '온라인 도슨트', '시대별 도슨트 게시판의 최신 글을 모아보는 허브입니다.', 'published'),
  ('docent-renaissance', '르네상스', '르네상스 시대 도슨트 이야기를 나누는 스토리 게시판입니다.', 'published'),
  ('docent-baroque', '바로크', '바로크 시대 도슨트 이야기를 나누는 스토리 게시판입니다.', 'published'),
  ('docent-rococo', '로코코', '로코코 시대 도슨트 이야기를 나누는 스토리 게시판입니다.', 'published'),
  ('docent-neoclassicism', '신고전주의', '신고전주의 시대 도슨트 이야기를 나누는 스토리 게시판입니다.', 'published'),
  ('docent-regency', '리젠시', '리젠시 시대 도슨트 이야기를 나누는 스토리 게시판입니다.', 'published'),
  ('docent-victoria', '빅토리아', '빅토리아 시대 도슨트 이야기를 나누는 스토리 게시판입니다.', 'published'),
  ('docent-art-nouveau', '아르누보', '아르누보 시대 도슨트 이야기를 나누는 스토리 게시판입니다.', 'published'),
  ('docent-art-deco', '아르데코', '아르데코 시대 도슨트 이야기를 나누는 스토리 게시판입니다.', 'published'),
  ('docent-beat-generation', '비트 세대', '비트 세대 시대 도슨트 이야기를 나누는 스토리 게시판입니다.', 'published'),
  ('docent-counterculture', '카운터 컬처', '카운터 컬처 시대 도슨트 이야기를 나누는 스토리 게시판입니다.', 'published'),
  ('docent-digital', '디지털', '디지털 시대 도슨트 이야기를 나누는 스토리 게시판입니다.', 'published'),
  ('heritage', '사일로 유산', 'Grandmas/Grandpas 게시판의 최신 글을 모아보는 허브입니다.', 'published'),
  ('heritage-grandmas', 'Grandmas', '할머니들의 이야기를 나누는 스토리 게시판입니다.', 'published'),
  ('heritage-grandpas', 'Grandpas', '할아버지들의 이야기를 나누는 스토리 게시판입니다.', 'published'),
  ('community', '커뮤니티', '살롱데상 Community의 최신 글을 모아보는 허브입니다.', 'published'),
  ('community-topics', '주제별 소통 게시판', '13개 주제별 클럽 게시판의 최신 글을 모아보는 허브입니다.', 'published'),
  ('community-topics-economy', '경제 클럽', '경제 클럽 주제 게시판입니다.', 'published'),
  ('community-topics-art', '예술 클럽', '예술 클럽 주제 게시판입니다.', 'published'),
  ('community-topics-world-history', '세계역사 클럽', '세계역사 클럽 주제 게시판입니다.', 'published'),
  ('community-topics-science', '과학 클럽', '과학 클럽 주제 게시판입니다.', 'published'),
  ('community-topics-comedy', '코메디 클럽', '코메디 클럽 주제 게시판입니다.', 'published'),
  ('community-topics-literature', '문학 클럽', '문학 클럽 주제 게시판입니다.', 'published'),
  ('community-topics-health', '건강 클럽', '건강 클럽 주제 게시판입니다.', 'published'),
  ('community-topics-politics', '정치 클럽', '정치 클럽 주제 게시판입니다.', 'published'),
  ('community-topics-movie', '영화 클럽', '영화 클럽 주제 게시판입니다.', 'published'),
  ('community-topics-psychology', '심리 클럽', '심리 클럽 주제 게시판입니다.', 'published'),
  ('community-topics-sports', '스포츠 클럽', '스포츠 클럽 주제 게시판입니다.', 'published'),
  ('community-topics-pet-owners', '인간 집사들 클럽', '인간 집사들 클럽 주제 게시판입니다.', 'published'),
  ('community-topics-warm-world', '따듯한 세상 클럽', '따듯한 세상 클럽 주제 게시판입니다.', 'published'),
  ('community-weekday', '요일별 클럽 모임', '요일별로 열리는 클럽 모임방 게시판의 최신 글을 모아보는 허브입니다.', 'published'),
  ('community-weekday-monday', '월요반란 클럽 모임방', '월요반란 클럽 모임방 게시판 — 주간 참석 신청은 아래 버튼으로.', 'published'),
  ('community-weekday-book', '책 낭송 클럽 모임방', '책 낭송 클럽 모임방 게시판 — 주간 참석 신청은 아래 버튼으로.', 'published'),
  ('community-weekday-between-lines', '행간의 조각가 모임방', '행간의 조각가 모임방 게시판 — 주간 참석 신청은 아래 버튼으로.', 'published'),
  ('community-weekday-english-play', '놀아보자 영어클럽 모임방', '놀아보자 영어클럽 모임방 게시판 — 주간 참석 신청은 아래 버튼으로.', 'published'),
  ('community-weekday-before-sunrise', '비포 선라이즈 소셜클럽 모임방', '비포 선라이즈 소셜클럽 모임방 게시판 — 주간 참석 신청은 아래 버튼으로.', 'published'),
  ('community-weekday-anything-can-happen', '무슨일이든 일어날수있어 클럽 모임방', '무슨일이든 일어날수있어 클럽 모임방 게시판 — 주간 참석 신청은 아래 버튼으로.', 'published'),
  ('community-weekday-after-the-play', '연극이 끝나고 난 뒤 클럽 모임방', '연극이 끝나고 난 뒤 클럽 모임방 게시판 — 주간 참석 신청은 아래 버튼으로.', 'published'),
  ('community-qna', 'Q&A', '궁금한 점을 묻고 답하는 게시판입니다.', 'published'),
  ('monthly-events', '월별 모임', '패트론의 살롱, 월별 정기 모임 안내 게시판입니다.', 'published'),
  ('community-events', '공연 / 전시회 소개', '커뮤니티 회원들의 공연/전시회 소식을 소개하는 스토리 게시판입니다.', 'published'),
  ('event-notices', '이벤트 공지', '이벤트 공지를 소개하는 스토리 게시판입니다.', 'published'),
  ('membership', '멤버십', 'Membership 하위 게시판의 최신 글을 모아보는 허브입니다.', 'published'),
  ('membership-my-treasures', '나의 보물 이야기', '회원들의 ''나의 보물'' 이야기를 모아보는 스토리 게시판입니다.', 'published'),
  ('membership-artist-intro', '나의 아티스트 소개', '회원 본인을 아티스트로 소개하는 게시판입니다.', 'published'),
  ('membership-mind-diary', '마음일기', '마음일기를 나누는 게시판입니다.', 'published'),
  ('membership-patron', '패트론 게시판', '패트론 등급 전용 라운지 게시판입니다.', 'published'),
  ('membership-one-sentence-novel', '한문장 소설 프로젝트', '한 문장씩 이어 쓰는 소설 프로젝트 게시판입니다.', 'published'),
  ('membership-secret-room', '비밀의 방 도슨트', '비밀의 방 전용 도슨트 게시판입니다.', 'published'),
  ('salon-my-treasure-story', '나의 보물 이야기', '회원들의 ''나의 보물'' 이야기를 모아보는 스토리 게시판입니다.', 'published'),
  ('salon-artist-intro', '나의 아티스트 소개', '회원 본인을 아티스트로 소개하는 게시판입니다.', 'published'),
  ('salon-mind-diary', '마음일기', '마음일기를 나누는 게시판입니다.', 'published'),
  ('salon-one-sentence-novel', '한문장 소설 프로젝트', '한 문장씩 이어 쓰는 소설 프로젝트 게시판입니다.', 'published'),
  ('salon-secret-room', '비밀의 방 도슨트', '비밀의 방 전용 도슨트 게시판입니다.', 'published'),
  ('gallery', '갤러리', 'Gallery 하위 게시판의 최신 글을 모아보는 허브입니다.', 'published'),
  ('gallery-awards', '시상식', '시상식을 소개하는 스토리 게시판입니다.', 'published'),
  ('gallery-parties', '파티', '파티를 소개하는 스토리 게시판입니다.', 'published'),
  ('gallery-patrons', '패트론들', '패트론들을 소개하는 스토리 게시판입니다.', 'published'),
  ('gallery-performance', '공연들', '공연들을 소개하는 스토리 게시판입니다.', 'published'),
  ('gallery-visitors', '운명의 방문자들', '운명의 방문자들을 소개하는 스토리 게시판입니다.', 'published'),
  ('salon-gallery-awards', '시상식', '시상식을 소개하는 스토리 게시판입니다.', 'published'),
  ('salon-gallery-parties', '파티', '파티를 소개하는 스토리 게시판입니다.', 'published'),
  ('salon-gallery-patrons', '패트론들', '패트론들을 소개하는 스토리 게시판입니다.', 'published'),
  ('salon-gallery-performances', '공연들', '공연들을 소개하는 스토리 게시판입니다.', 'published'),
  ('salon-gallery-visitors', '운명의 방문자들', '운명의 방문자들을 소개하는 스토리 게시판입니다.', 'published'),
  ('archive', '아카이브', 'Archive 하위 게시판의 최신 글을 모아보는 허브입니다.', 'published'),
  ('archive-brochure', '소개지', '소개지를 아카이빙하는 스토리 게시판입니다.', 'published'),
  ('archive-posters', '포스터', '포스터를 아카이빙하는 스토리 게시판입니다.', 'published'),
  ('archive-timeline', '타임라인', '사일로상점과 살롱데상의 모든 이벤트를 연/월 순으로 보여주는 반응형 타임라인입니다.', 'published')
on conflict (slug) do nothing;

-- ============================================================
-- 3) page_modules — default template per page, only if currently empty
-- ============================================================

-- shop-adoption-library (입양신청서 라이브러리)
do $$
declare
  v_page_id uuid;
begin
  select id into v_page_id from page_builder where slug = 'shop-adoption-library';
  if v_page_id is not null and not exists (select 1 from page_modules where page_id = v_page_id) then
    insert into page_modules (page_id, module_type, board_id, settings, sort_order) values
      (v_page_id, 'hero', null, '{"title":"입양신청서 라이브러리","subtitle":"사일로상점","description":"입양(구매) 신청서 예시를 모아보는 스토리 게시판입니다.","breadcrumb":[{"label":"홈","href":"/"},{"label":"사일로상점"},{"label":"입양신청서 라이브러리"}]}'::jsonb, 0),
      (v_page_id, 'quote', null, '{"text":"인용문을 입력하세요","author":""}'::jsonb, 1),
      (v_page_id, 'board', (select id from boards where category = 'adoption-library' limit 1), '{"showThumbnail":true}'::jsonb, 2),
      (v_page_id, 'gallery', (select id from boards where category = 'adoption-library' limit 1), '{}'::jsonb, 3);
  end if;
end $$;

-- shop-reviews (분양 후기)
do $$
declare
  v_page_id uuid;
begin
  select id into v_page_id from page_builder where slug = 'shop-reviews';
  if v_page_id is not null and not exists (select 1 from page_modules where page_id = v_page_id) then
    insert into page_modules (page_id, module_type, board_id, settings, sort_order) values
      (v_page_id, 'hero', null, '{"title":"분양 후기","subtitle":"사일로상점","description":"사일로 보물을 입양(구매/대여)한 회원들의 후기 게시판입니다.","breadcrumb":[{"label":"홈","href":"/"},{"label":"사일로상점"},{"label":"분양 후기"}]}'::jsonb, 0),
      (v_page_id, 'quote', null, '{"text":"인용문을 입력하세요","author":""}'::jsonb, 1),
      (v_page_id, 'board', (select id from boards where name = 'After Adoption 분양 후 이야기' limit 1), '{"showThumbnail":true}'::jsonb, 2),
      (v_page_id, 'gallery', (select id from boards where name = 'After Adoption 분양 후 이야기' limit 1), '{}'::jsonb, 3);
  end if;
end $$;

-- docent (온라인 도슨트)
do $$
declare
  v_page_id uuid;
begin
  select id into v_page_id from page_builder where slug = 'docent';
  if v_page_id is not null and not exists (select 1 from page_modules where page_id = v_page_id) then
    insert into page_modules (page_id, module_type, board_id, settings, sort_order) values
      (v_page_id, 'hero', null, '{"title":"온라인 도슨트","subtitle":"Online Docent","description":"시대별 도슨트 게시판의 최신 글을 모아보는 허브입니다.","breadcrumb":[{"label":"홈","href":"/"},{"label":"온라인 도슨트"}]}'::jsonb, 0),
      (v_page_id, 'slide', (select id from boards where category = 'renaissance' limit 1), '{"title":"르네상스","sort":"latest"}'::jsonb, 1),
      (v_page_id, 'slide', (select id from boards where category = 'baroque' limit 1), '{"title":"바로크","sort":"latest"}'::jsonb, 2),
      (v_page_id, 'slide', (select id from boards where category = 'rococo' limit 1), '{"title":"로코코","sort":"latest"}'::jsonb, 3),
      (v_page_id, 'slide', (select id from boards where category = 'neoclassicism' limit 1), '{"title":"신고전주의","sort":"latest"}'::jsonb, 4),
      (v_page_id, 'slide', (select id from boards where category = 'regency' limit 1), '{"title":"리젠시","sort":"latest"}'::jsonb, 5),
      (v_page_id, 'slide', (select id from boards where category = 'victoria' limit 1), '{"title":"빅토리아","sort":"latest"}'::jsonb, 6),
      (v_page_id, 'slide', (select id from boards where category = 'art-nouveau' limit 1), '{"title":"아르누보","sort":"latest"}'::jsonb, 7),
      (v_page_id, 'slide', (select id from boards where category = 'art-deco' limit 1), '{"title":"아르데코","sort":"latest"}'::jsonb, 8),
      (v_page_id, 'slide', (select id from boards where category = 'beat-generation' limit 1), '{"title":"비트 세대","sort":"latest"}'::jsonb, 9),
      (v_page_id, 'slide', (select id from boards where category = 'counter-culture' limit 1), '{"title":"카운터 컬처","sort":"latest"}'::jsonb, 10),
      (v_page_id, 'slide', (select id from boards where category = 'digital' limit 1), '{"title":"디지털","sort":"latest"}'::jsonb, 11);
  end if;
end $$;

-- docent-renaissance (르네상스)
do $$
declare
  v_page_id uuid;
begin
  select id into v_page_id from page_builder where slug = 'docent-renaissance';
  if v_page_id is not null and not exists (select 1 from page_modules where page_id = v_page_id) then
    insert into page_modules (page_id, module_type, board_id, settings, sort_order) values
      (v_page_id, 'hero', null, '{"title":"르네상스","subtitle":"온라인 도슨트","description":"르네상스 시대 도슨트 이야기를 나누는 스토리 게시판입니다.","breadcrumb":[{"label":"홈","href":"/"},{"label":"온라인 도슨트","href":"/docent"},{"label":"르네상스"}]}'::jsonb, 0),
      (v_page_id, 'quote', null, '{"text":"인용문을 입력하세요","author":""}'::jsonb, 1),
      (v_page_id, 'board', (select id from boards where category = 'renaissance' limit 1), '{"showThumbnail":true}'::jsonb, 2),
      (v_page_id, 'gallery', (select id from boards where category = 'renaissance' limit 1), '{}'::jsonb, 3);
  end if;
end $$;

-- docent-baroque (바로크)
do $$
declare
  v_page_id uuid;
begin
  select id into v_page_id from page_builder where slug = 'docent-baroque';
  if v_page_id is not null and not exists (select 1 from page_modules where page_id = v_page_id) then
    insert into page_modules (page_id, module_type, board_id, settings, sort_order) values
      (v_page_id, 'hero', null, '{"title":"바로크","subtitle":"온라인 도슨트","description":"바로크 시대 도슨트 이야기를 나누는 스토리 게시판입니다.","breadcrumb":[{"label":"홈","href":"/"},{"label":"온라인 도슨트","href":"/docent"},{"label":"바로크"}]}'::jsonb, 0),
      (v_page_id, 'quote', null, '{"text":"인용문을 입력하세요","author":""}'::jsonb, 1),
      (v_page_id, 'board', (select id from boards where category = 'baroque' limit 1), '{"showThumbnail":true}'::jsonb, 2),
      (v_page_id, 'gallery', (select id from boards where category = 'baroque' limit 1), '{}'::jsonb, 3);
  end if;
end $$;

-- docent-rococo (로코코)
do $$
declare
  v_page_id uuid;
begin
  select id into v_page_id from page_builder where slug = 'docent-rococo';
  if v_page_id is not null and not exists (select 1 from page_modules where page_id = v_page_id) then
    insert into page_modules (page_id, module_type, board_id, settings, sort_order) values
      (v_page_id, 'hero', null, '{"title":"로코코","subtitle":"온라인 도슨트","description":"로코코 시대 도슨트 이야기를 나누는 스토리 게시판입니다.","breadcrumb":[{"label":"홈","href":"/"},{"label":"온라인 도슨트","href":"/docent"},{"label":"로코코"}]}'::jsonb, 0),
      (v_page_id, 'quote', null, '{"text":"인용문을 입력하세요","author":""}'::jsonb, 1),
      (v_page_id, 'board', (select id from boards where category = 'rococo' limit 1), '{"showThumbnail":true}'::jsonb, 2),
      (v_page_id, 'gallery', (select id from boards where category = 'rococo' limit 1), '{}'::jsonb, 3);
  end if;
end $$;

-- docent-neoclassicism (신고전주의)
do $$
declare
  v_page_id uuid;
begin
  select id into v_page_id from page_builder where slug = 'docent-neoclassicism';
  if v_page_id is not null and not exists (select 1 from page_modules where page_id = v_page_id) then
    insert into page_modules (page_id, module_type, board_id, settings, sort_order) values
      (v_page_id, 'hero', null, '{"title":"신고전주의","subtitle":"온라인 도슨트","description":"신고전주의 시대 도슨트 이야기를 나누는 스토리 게시판입니다.","breadcrumb":[{"label":"홈","href":"/"},{"label":"온라인 도슨트","href":"/docent"},{"label":"신고전주의"}]}'::jsonb, 0),
      (v_page_id, 'quote', null, '{"text":"인용문을 입력하세요","author":""}'::jsonb, 1),
      (v_page_id, 'board', (select id from boards where category = 'neoclassicism' limit 1), '{"showThumbnail":true}'::jsonb, 2),
      (v_page_id, 'gallery', (select id from boards where category = 'neoclassicism' limit 1), '{}'::jsonb, 3);
  end if;
end $$;

-- docent-regency (리젠시)
do $$
declare
  v_page_id uuid;
begin
  select id into v_page_id from page_builder where slug = 'docent-regency';
  if v_page_id is not null and not exists (select 1 from page_modules where page_id = v_page_id) then
    insert into page_modules (page_id, module_type, board_id, settings, sort_order) values
      (v_page_id, 'hero', null, '{"title":"리젠시","subtitle":"온라인 도슨트","description":"리젠시 시대 도슨트 이야기를 나누는 스토리 게시판입니다.","breadcrumb":[{"label":"홈","href":"/"},{"label":"온라인 도슨트","href":"/docent"},{"label":"리젠시"}]}'::jsonb, 0),
      (v_page_id, 'quote', null, '{"text":"인용문을 입력하세요","author":""}'::jsonb, 1),
      (v_page_id, 'board', (select id from boards where category = 'regency' limit 1), '{"showThumbnail":true}'::jsonb, 2),
      (v_page_id, 'gallery', (select id from boards where category = 'regency' limit 1), '{}'::jsonb, 3);
  end if;
end $$;

-- docent-victoria (빅토리아)
do $$
declare
  v_page_id uuid;
begin
  select id into v_page_id from page_builder where slug = 'docent-victoria';
  if v_page_id is not null and not exists (select 1 from page_modules where page_id = v_page_id) then
    insert into page_modules (page_id, module_type, board_id, settings, sort_order) values
      (v_page_id, 'hero', null, '{"title":"빅토리아","subtitle":"온라인 도슨트","description":"빅토리아 시대 도슨트 이야기를 나누는 스토리 게시판입니다.","breadcrumb":[{"label":"홈","href":"/"},{"label":"온라인 도슨트","href":"/docent"},{"label":"빅토리아"}]}'::jsonb, 0),
      (v_page_id, 'quote', null, '{"text":"인용문을 입력하세요","author":""}'::jsonb, 1),
      (v_page_id, 'board', (select id from boards where category = 'victoria' limit 1), '{"showThumbnail":true}'::jsonb, 2),
      (v_page_id, 'gallery', (select id from boards where category = 'victoria' limit 1), '{}'::jsonb, 3);
  end if;
end $$;

-- docent-art-nouveau (아르누보)
do $$
declare
  v_page_id uuid;
begin
  select id into v_page_id from page_builder where slug = 'docent-art-nouveau';
  if v_page_id is not null and not exists (select 1 from page_modules where page_id = v_page_id) then
    insert into page_modules (page_id, module_type, board_id, settings, sort_order) values
      (v_page_id, 'hero', null, '{"title":"아르누보","subtitle":"온라인 도슨트","description":"아르누보 시대 도슨트 이야기를 나누는 스토리 게시판입니다.","breadcrumb":[{"label":"홈","href":"/"},{"label":"온라인 도슨트","href":"/docent"},{"label":"아르누보"}]}'::jsonb, 0),
      (v_page_id, 'quote', null, '{"text":"인용문을 입력하세요","author":""}'::jsonb, 1),
      (v_page_id, 'board', (select id from boards where category = 'art-nouveau' limit 1), '{"showThumbnail":true}'::jsonb, 2),
      (v_page_id, 'gallery', (select id from boards where category = 'art-nouveau' limit 1), '{}'::jsonb, 3);
  end if;
end $$;

-- docent-art-deco (아르데코)
do $$
declare
  v_page_id uuid;
begin
  select id into v_page_id from page_builder where slug = 'docent-art-deco';
  if v_page_id is not null and not exists (select 1 from page_modules where page_id = v_page_id) then
    insert into page_modules (page_id, module_type, board_id, settings, sort_order) values
      (v_page_id, 'hero', null, '{"title":"아르데코","subtitle":"온라인 도슨트","description":"아르데코 시대 도슨트 이야기를 나누는 스토리 게시판입니다.","breadcrumb":[{"label":"홈","href":"/"},{"label":"온라인 도슨트","href":"/docent"},{"label":"아르데코"}]}'::jsonb, 0),
      (v_page_id, 'quote', null, '{"text":"인용문을 입력하세요","author":""}'::jsonb, 1),
      (v_page_id, 'board', (select id from boards where category = 'art-deco' limit 1), '{"showThumbnail":true}'::jsonb, 2),
      (v_page_id, 'gallery', (select id from boards where category = 'art-deco' limit 1), '{}'::jsonb, 3);
  end if;
end $$;

-- docent-beat-generation (비트 세대)
do $$
declare
  v_page_id uuid;
begin
  select id into v_page_id from page_builder where slug = 'docent-beat-generation';
  if v_page_id is not null and not exists (select 1 from page_modules where page_id = v_page_id) then
    insert into page_modules (page_id, module_type, board_id, settings, sort_order) values
      (v_page_id, 'hero', null, '{"title":"비트 세대","subtitle":"온라인 도슨트","description":"비트 세대 시대 도슨트 이야기를 나누는 스토리 게시판입니다.","breadcrumb":[{"label":"홈","href":"/"},{"label":"온라인 도슨트","href":"/docent"},{"label":"비트 세대"}]}'::jsonb, 0),
      (v_page_id, 'quote', null, '{"text":"인용문을 입력하세요","author":""}'::jsonb, 1),
      (v_page_id, 'board', (select id from boards where category = 'beat-generation' limit 1), '{"showThumbnail":true}'::jsonb, 2),
      (v_page_id, 'gallery', (select id from boards where category = 'beat-generation' limit 1), '{}'::jsonb, 3);
  end if;
end $$;

-- docent-counterculture (카운터 컬처)
do $$
declare
  v_page_id uuid;
begin
  select id into v_page_id from page_builder where slug = 'docent-counterculture';
  if v_page_id is not null and not exists (select 1 from page_modules where page_id = v_page_id) then
    insert into page_modules (page_id, module_type, board_id, settings, sort_order) values
      (v_page_id, 'hero', null, '{"title":"카운터 컬처","subtitle":"온라인 도슨트","description":"카운터 컬처 시대 도슨트 이야기를 나누는 스토리 게시판입니다.","breadcrumb":[{"label":"홈","href":"/"},{"label":"온라인 도슨트","href":"/docent"},{"label":"카운터 컬처"}]}'::jsonb, 0),
      (v_page_id, 'quote', null, '{"text":"인용문을 입력하세요","author":""}'::jsonb, 1),
      (v_page_id, 'board', (select id from boards where category = 'counter-culture' limit 1), '{"showThumbnail":true}'::jsonb, 2),
      (v_page_id, 'gallery', (select id from boards where category = 'counter-culture' limit 1), '{}'::jsonb, 3);
  end if;
end $$;

-- docent-digital (디지털)
do $$
declare
  v_page_id uuid;
begin
  select id into v_page_id from page_builder where slug = 'docent-digital';
  if v_page_id is not null and not exists (select 1 from page_modules where page_id = v_page_id) then
    insert into page_modules (page_id, module_type, board_id, settings, sort_order) values
      (v_page_id, 'hero', null, '{"title":"디지털","subtitle":"온라인 도슨트","description":"디지털 시대 도슨트 이야기를 나누는 스토리 게시판입니다.","breadcrumb":[{"label":"홈","href":"/"},{"label":"온라인 도슨트","href":"/docent"},{"label":"디지털"}]}'::jsonb, 0),
      (v_page_id, 'quote', null, '{"text":"인용문을 입력하세요","author":""}'::jsonb, 1),
      (v_page_id, 'board', (select id from boards where category = 'digital' limit 1), '{"showThumbnail":true}'::jsonb, 2),
      (v_page_id, 'gallery', (select id from boards where category = 'digital' limit 1), '{}'::jsonb, 3);
  end if;
end $$;

-- heritage (사일로 유산)
do $$
declare
  v_page_id uuid;
begin
  select id into v_page_id from page_builder where slug = 'heritage';
  if v_page_id is not null and not exists (select 1 from page_modules where page_id = v_page_id) then
    insert into page_modules (page_id, module_type, board_id, settings, sort_order) values
      (v_page_id, 'hero', null, '{"title":"사일로 유산","subtitle":"Heritage","description":"Grandmas/Grandpas 게시판의 최신 글을 모아보는 허브입니다.","breadcrumb":[{"label":"홈","href":"/"},{"label":"사일로 유산"}]}'::jsonb, 0),
      (v_page_id, 'slide', (select id from boards where category = 'grandmas' limit 1), '{"title":"Grandmas","sort":"latest"}'::jsonb, 1),
      (v_page_id, 'slide', (select id from boards where category = 'grandpas' limit 1), '{"title":"Grandpas","sort":"latest"}'::jsonb, 2);
  end if;
end $$;

-- heritage-grandmas (Grandmas)
do $$
declare
  v_page_id uuid;
begin
  select id into v_page_id from page_builder where slug = 'heritage-grandmas';
  if v_page_id is not null and not exists (select 1 from page_modules where page_id = v_page_id) then
    insert into page_modules (page_id, module_type, board_id, settings, sort_order) values
      (v_page_id, 'hero', null, '{"title":"Grandmas","subtitle":"사일로 유산","description":"할머니들의 이야기를 나누는 스토리 게시판입니다.","breadcrumb":[{"label":"홈","href":"/"},{"label":"사일로 유산","href":"/heritage"},{"label":"Grandmas"}]}'::jsonb, 0),
      (v_page_id, 'quote', null, '{"text":"인용문을 입력하세요","author":""}'::jsonb, 1),
      (v_page_id, 'board', (select id from boards where category = 'grandmas' limit 1), '{"showThumbnail":true}'::jsonb, 2),
      (v_page_id, 'gallery', (select id from boards where category = 'grandmas' limit 1), '{}'::jsonb, 3);
  end if;
end $$;

-- heritage-grandpas (Grandpas)
do $$
declare
  v_page_id uuid;
begin
  select id into v_page_id from page_builder where slug = 'heritage-grandpas';
  if v_page_id is not null and not exists (select 1 from page_modules where page_id = v_page_id) then
    insert into page_modules (page_id, module_type, board_id, settings, sort_order) values
      (v_page_id, 'hero', null, '{"title":"Grandpas","subtitle":"사일로 유산","description":"할아버지들의 이야기를 나누는 스토리 게시판입니다.","breadcrumb":[{"label":"홈","href":"/"},{"label":"사일로 유산","href":"/heritage"},{"label":"Grandpas"}]}'::jsonb, 0),
      (v_page_id, 'quote', null, '{"text":"인용문을 입력하세요","author":""}'::jsonb, 1),
      (v_page_id, 'board', (select id from boards where category = 'grandpas' limit 1), '{"showThumbnail":true}'::jsonb, 2),
      (v_page_id, 'gallery', (select id from boards where category = 'grandpas' limit 1), '{}'::jsonb, 3);
  end if;
end $$;

-- community (커뮤니티)
do $$
declare
  v_page_id uuid;
begin
  select id into v_page_id from page_builder where slug = 'community';
  if v_page_id is not null and not exists (select 1 from page_modules where page_id = v_page_id) then
    insert into page_modules (page_id, module_type, board_id, settings, sort_order) values
      (v_page_id, 'hero', null, '{"title":"커뮤니티","subtitle":"살롱데상","description":"살롱데상 Community의 최신 글을 모아보는 허브입니다.","breadcrumb":[{"label":"홈","href":"/"},{"label":"살롱데상"},{"label":"커뮤니티"}]}'::jsonb, 0),
      (v_page_id, 'slide', (select id from boards where name = '자유게시판' limit 1), '{"title":"자유게시판","sort":"latest"}'::jsonb, 1),
      (v_page_id, 'slide', (select id from boards where category = 'economy' limit 1), '{"title":"경제 클럽","sort":"latest"}'::jsonb, 2),
      (v_page_id, 'slide', (select id from boards where category = 'art' limit 1), '{"title":"예술 클럽","sort":"latest"}'::jsonb, 3),
      (v_page_id, 'slide', (select id from boards where category = 'history' limit 1), '{"title":"세계역사 클럽","sort":"latest"}'::jsonb, 4),
      (v_page_id, 'slide', (select id from boards where category = 'science' limit 1), '{"title":"과학 클럽","sort":"latest"}'::jsonb, 5),
      (v_page_id, 'slide', (select id from boards where category = 'comedy' limit 1), '{"title":"코메디 클럽","sort":"latest"}'::jsonb, 6),
      (v_page_id, 'slide', (select id from boards where category = 'literature' limit 1), '{"title":"문학 클럽","sort":"latest"}'::jsonb, 7),
      (v_page_id, 'slide', (select id from boards where category = 'health' limit 1), '{"title":"건강 클럽","sort":"latest"}'::jsonb, 8),
      (v_page_id, 'slide', (select id from boards where category = 'politics' limit 1), '{"title":"정치 클럽","sort":"latest"}'::jsonb, 9),
      (v_page_id, 'slide', (select id from boards where category = 'movie' limit 1), '{"title":"영화 클럽","sort":"latest"}'::jsonb, 10),
      (v_page_id, 'slide', (select id from boards where category = 'psychology' limit 1), '{"title":"심리 클럽","sort":"latest"}'::jsonb, 11),
      (v_page_id, 'slide', (select id from boards where category = 'sports' limit 1), '{"title":"스포츠 클럽","sort":"latest"}'::jsonb, 12),
      (v_page_id, 'slide', (select id from boards where category = 'pets' limit 1), '{"title":"인간 집사들 클럽","sort":"latest"}'::jsonb, 13),
      (v_page_id, 'slide', (select id from boards where category = 'warmth' limit 1), '{"title":"따듯한 세상 클럽","sort":"latest"}'::jsonb, 14),
      (v_page_id, 'slide', (select id from boards where category = 'mon' limit 1), '{"title":"월요반란 클럽 모임방","sort":"latest"}'::jsonb, 15),
      (v_page_id, 'slide', (select id from boards where category = 'tue' limit 1), '{"title":"책 낭송 클럽 모임방","sort":"latest"}'::jsonb, 16),
      (v_page_id, 'slide', (select id from boards where category = 'wed' limit 1), '{"title":"행간의 조각가 모임방","sort":"latest"}'::jsonb, 17),
      (v_page_id, 'slide', (select id from boards where category = 'thu' limit 1), '{"title":"놀아보자 영어클럽 모임방","sort":"latest"}'::jsonb, 18),
      (v_page_id, 'slide', (select id from boards where category = 'fri' limit 1), '{"title":"비포 선라이즈 소셜클럽 모임방","sort":"latest"}'::jsonb, 19),
      (v_page_id, 'slide', (select id from boards where category = 'sat' limit 1), '{"title":"무슨일이든 일어날수있어 클럽 모임방","sort":"latest"}'::jsonb, 20),
      (v_page_id, 'slide', (select id from boards where category = 'sun' limit 1), '{"title":"연극이 끝나고 난 뒤 클럽 모임방","sort":"latest"}'::jsonb, 21);
  end if;
end $$;

-- community-topics (주제별 소통 게시판)
do $$
declare
  v_page_id uuid;
begin
  select id into v_page_id from page_builder where slug = 'community-topics';
  if v_page_id is not null and not exists (select 1 from page_modules where page_id = v_page_id) then
    insert into page_modules (page_id, module_type, board_id, settings, sort_order) values
      (v_page_id, 'hero', null, '{"title":"주제별 소통 게시판","subtitle":"살롱데상 · 커뮤니티","description":"13개 주제별 클럽 게시판의 최신 글을 모아보는 허브입니다.","breadcrumb":[{"label":"홈","href":"/"},{"label":"살롱데상"},{"label":"커뮤니티","href":"/community"},{"label":"주제별 소통 게시판"}]}'::jsonb, 0),
      (v_page_id, 'slide', (select id from boards where category = 'economy' limit 1), '{"title":"경제 클럽","sort":"latest"}'::jsonb, 1),
      (v_page_id, 'slide', (select id from boards where category = 'art' limit 1), '{"title":"예술 클럽","sort":"latest"}'::jsonb, 2),
      (v_page_id, 'slide', (select id from boards where category = 'history' limit 1), '{"title":"세계역사 클럽","sort":"latest"}'::jsonb, 3),
      (v_page_id, 'slide', (select id from boards where category = 'science' limit 1), '{"title":"과학 클럽","sort":"latest"}'::jsonb, 4),
      (v_page_id, 'slide', (select id from boards where category = 'comedy' limit 1), '{"title":"코메디 클럽","sort":"latest"}'::jsonb, 5),
      (v_page_id, 'slide', (select id from boards where category = 'literature' limit 1), '{"title":"문학 클럽","sort":"latest"}'::jsonb, 6),
      (v_page_id, 'slide', (select id from boards where category = 'health' limit 1), '{"title":"건강 클럽","sort":"latest"}'::jsonb, 7),
      (v_page_id, 'slide', (select id from boards where category = 'politics' limit 1), '{"title":"정치 클럽","sort":"latest"}'::jsonb, 8),
      (v_page_id, 'slide', (select id from boards where category = 'movie' limit 1), '{"title":"영화 클럽","sort":"latest"}'::jsonb, 9),
      (v_page_id, 'slide', (select id from boards where category = 'psychology' limit 1), '{"title":"심리 클럽","sort":"latest"}'::jsonb, 10),
      (v_page_id, 'slide', (select id from boards where category = 'sports' limit 1), '{"title":"스포츠 클럽","sort":"latest"}'::jsonb, 11),
      (v_page_id, 'slide', (select id from boards where category = 'pets' limit 1), '{"title":"인간 집사들 클럽","sort":"latest"}'::jsonb, 12),
      (v_page_id, 'slide', (select id from boards where category = 'warmth' limit 1), '{"title":"따듯한 세상 클럽","sort":"latest"}'::jsonb, 13);
  end if;
end $$;

-- community-topics-economy (경제 클럽)
do $$
declare
  v_page_id uuid;
begin
  select id into v_page_id from page_builder where slug = 'community-topics-economy';
  if v_page_id is not null and not exists (select 1 from page_modules where page_id = v_page_id) then
    insert into page_modules (page_id, module_type, board_id, settings, sort_order) values
      (v_page_id, 'hero', null, '{"title":"경제 클럽","subtitle":"살롱데상 · 커뮤니티 · 주제별 소통","description":"경제 클럽 주제 게시판입니다.","breadcrumb":[{"label":"홈","href":"/"},{"label":"살롱데상"},{"label":"커뮤니티","href":"/community"},{"label":"주제별 소통 게시판","href":"/community/topics"},{"label":"경제 클럽"}]}'::jsonb, 0),
      (v_page_id, 'board', (select id from boards where category = 'economy' limit 1), '{"showThumbnail":false}'::jsonb, 1);
  end if;
end $$;

-- community-topics-art (예술 클럽)
do $$
declare
  v_page_id uuid;
begin
  select id into v_page_id from page_builder where slug = 'community-topics-art';
  if v_page_id is not null and not exists (select 1 from page_modules where page_id = v_page_id) then
    insert into page_modules (page_id, module_type, board_id, settings, sort_order) values
      (v_page_id, 'hero', null, '{"title":"예술 클럽","subtitle":"살롱데상 · 커뮤니티 · 주제별 소통","description":"예술 클럽 주제 게시판입니다.","breadcrumb":[{"label":"홈","href":"/"},{"label":"살롱데상"},{"label":"커뮤니티","href":"/community"},{"label":"주제별 소통 게시판","href":"/community/topics"},{"label":"예술 클럽"}]}'::jsonb, 0),
      (v_page_id, 'board', (select id from boards where category = 'art' limit 1), '{"showThumbnail":false}'::jsonb, 1);
  end if;
end $$;

-- community-topics-world-history (세계역사 클럽)
do $$
declare
  v_page_id uuid;
begin
  select id into v_page_id from page_builder where slug = 'community-topics-world-history';
  if v_page_id is not null and not exists (select 1 from page_modules where page_id = v_page_id) then
    insert into page_modules (page_id, module_type, board_id, settings, sort_order) values
      (v_page_id, 'hero', null, '{"title":"세계역사 클럽","subtitle":"살롱데상 · 커뮤니티 · 주제별 소통","description":"세계역사 클럽 주제 게시판입니다.","breadcrumb":[{"label":"홈","href":"/"},{"label":"살롱데상"},{"label":"커뮤니티","href":"/community"},{"label":"주제별 소통 게시판","href":"/community/topics"},{"label":"세계역사 클럽"}]}'::jsonb, 0),
      (v_page_id, 'board', (select id from boards where category = 'history' limit 1), '{"showThumbnail":false}'::jsonb, 1);
  end if;
end $$;

-- community-topics-science (과학 클럽)
do $$
declare
  v_page_id uuid;
begin
  select id into v_page_id from page_builder where slug = 'community-topics-science';
  if v_page_id is not null and not exists (select 1 from page_modules where page_id = v_page_id) then
    insert into page_modules (page_id, module_type, board_id, settings, sort_order) values
      (v_page_id, 'hero', null, '{"title":"과학 클럽","subtitle":"살롱데상 · 커뮤니티 · 주제별 소통","description":"과학 클럽 주제 게시판입니다.","breadcrumb":[{"label":"홈","href":"/"},{"label":"살롱데상"},{"label":"커뮤니티","href":"/community"},{"label":"주제별 소통 게시판","href":"/community/topics"},{"label":"과학 클럽"}]}'::jsonb, 0),
      (v_page_id, 'board', (select id from boards where category = 'science' limit 1), '{"showThumbnail":false}'::jsonb, 1);
  end if;
end $$;

-- community-topics-comedy (코메디 클럽)
do $$
declare
  v_page_id uuid;
begin
  select id into v_page_id from page_builder where slug = 'community-topics-comedy';
  if v_page_id is not null and not exists (select 1 from page_modules where page_id = v_page_id) then
    insert into page_modules (page_id, module_type, board_id, settings, sort_order) values
      (v_page_id, 'hero', null, '{"title":"코메디 클럽","subtitle":"살롱데상 · 커뮤니티 · 주제별 소통","description":"코메디 클럽 주제 게시판입니다.","breadcrumb":[{"label":"홈","href":"/"},{"label":"살롱데상"},{"label":"커뮤니티","href":"/community"},{"label":"주제별 소통 게시판","href":"/community/topics"},{"label":"코메디 클럽"}]}'::jsonb, 0),
      (v_page_id, 'board', (select id from boards where category = 'comedy' limit 1), '{"showThumbnail":false}'::jsonb, 1);
  end if;
end $$;

-- community-topics-literature (문학 클럽)
do $$
declare
  v_page_id uuid;
begin
  select id into v_page_id from page_builder where slug = 'community-topics-literature';
  if v_page_id is not null and not exists (select 1 from page_modules where page_id = v_page_id) then
    insert into page_modules (page_id, module_type, board_id, settings, sort_order) values
      (v_page_id, 'hero', null, '{"title":"문학 클럽","subtitle":"살롱데상 · 커뮤니티 · 주제별 소통","description":"문학 클럽 주제 게시판입니다.","breadcrumb":[{"label":"홈","href":"/"},{"label":"살롱데상"},{"label":"커뮤니티","href":"/community"},{"label":"주제별 소통 게시판","href":"/community/topics"},{"label":"문학 클럽"}]}'::jsonb, 0),
      (v_page_id, 'board', (select id from boards where category = 'literature' limit 1), '{"showThumbnail":false}'::jsonb, 1);
  end if;
end $$;

-- community-topics-health (건강 클럽)
do $$
declare
  v_page_id uuid;
begin
  select id into v_page_id from page_builder where slug = 'community-topics-health';
  if v_page_id is not null and not exists (select 1 from page_modules where page_id = v_page_id) then
    insert into page_modules (page_id, module_type, board_id, settings, sort_order) values
      (v_page_id, 'hero', null, '{"title":"건강 클럽","subtitle":"살롱데상 · 커뮤니티 · 주제별 소통","description":"건강 클럽 주제 게시판입니다.","breadcrumb":[{"label":"홈","href":"/"},{"label":"살롱데상"},{"label":"커뮤니티","href":"/community"},{"label":"주제별 소통 게시판","href":"/community/topics"},{"label":"건강 클럽"}]}'::jsonb, 0),
      (v_page_id, 'board', (select id from boards where category = 'health' limit 1), '{"showThumbnail":false}'::jsonb, 1);
  end if;
end $$;

-- community-topics-politics (정치 클럽)
do $$
declare
  v_page_id uuid;
begin
  select id into v_page_id from page_builder where slug = 'community-topics-politics';
  if v_page_id is not null and not exists (select 1 from page_modules where page_id = v_page_id) then
    insert into page_modules (page_id, module_type, board_id, settings, sort_order) values
      (v_page_id, 'hero', null, '{"title":"정치 클럽","subtitle":"살롱데상 · 커뮤니티 · 주제별 소통","description":"정치 클럽 주제 게시판입니다.","breadcrumb":[{"label":"홈","href":"/"},{"label":"살롱데상"},{"label":"커뮤니티","href":"/community"},{"label":"주제별 소통 게시판","href":"/community/topics"},{"label":"정치 클럽"}]}'::jsonb, 0),
      (v_page_id, 'board', (select id from boards where category = 'politics' limit 1), '{"showThumbnail":false}'::jsonb, 1);
  end if;
end $$;

-- community-topics-movie (영화 클럽)
do $$
declare
  v_page_id uuid;
begin
  select id into v_page_id from page_builder where slug = 'community-topics-movie';
  if v_page_id is not null and not exists (select 1 from page_modules where page_id = v_page_id) then
    insert into page_modules (page_id, module_type, board_id, settings, sort_order) values
      (v_page_id, 'hero', null, '{"title":"영화 클럽","subtitle":"살롱데상 · 커뮤니티 · 주제별 소통","description":"영화 클럽 주제 게시판입니다.","breadcrumb":[{"label":"홈","href":"/"},{"label":"살롱데상"},{"label":"커뮤니티","href":"/community"},{"label":"주제별 소통 게시판","href":"/community/topics"},{"label":"영화 클럽"}]}'::jsonb, 0),
      (v_page_id, 'board', (select id from boards where category = 'movie' limit 1), '{"showThumbnail":false}'::jsonb, 1);
  end if;
end $$;

-- community-topics-psychology (심리 클럽)
do $$
declare
  v_page_id uuid;
begin
  select id into v_page_id from page_builder where slug = 'community-topics-psychology';
  if v_page_id is not null and not exists (select 1 from page_modules where page_id = v_page_id) then
    insert into page_modules (page_id, module_type, board_id, settings, sort_order) values
      (v_page_id, 'hero', null, '{"title":"심리 클럽","subtitle":"살롱데상 · 커뮤니티 · 주제별 소통","description":"심리 클럽 주제 게시판입니다.","breadcrumb":[{"label":"홈","href":"/"},{"label":"살롱데상"},{"label":"커뮤니티","href":"/community"},{"label":"주제별 소통 게시판","href":"/community/topics"},{"label":"심리 클럽"}]}'::jsonb, 0),
      (v_page_id, 'board', (select id from boards where category = 'psychology' limit 1), '{"showThumbnail":false}'::jsonb, 1);
  end if;
end $$;

-- community-topics-sports (스포츠 클럽)
do $$
declare
  v_page_id uuid;
begin
  select id into v_page_id from page_builder where slug = 'community-topics-sports';
  if v_page_id is not null and not exists (select 1 from page_modules where page_id = v_page_id) then
    insert into page_modules (page_id, module_type, board_id, settings, sort_order) values
      (v_page_id, 'hero', null, '{"title":"스포츠 클럽","subtitle":"살롱데상 · 커뮤니티 · 주제별 소통","description":"스포츠 클럽 주제 게시판입니다.","breadcrumb":[{"label":"홈","href":"/"},{"label":"살롱데상"},{"label":"커뮤니티","href":"/community"},{"label":"주제별 소통 게시판","href":"/community/topics"},{"label":"스포츠 클럽"}]}'::jsonb, 0),
      (v_page_id, 'board', (select id from boards where category = 'sports' limit 1), '{"showThumbnail":false}'::jsonb, 1);
  end if;
end $$;

-- community-topics-pet-owners (인간 집사들 클럽)
do $$
declare
  v_page_id uuid;
begin
  select id into v_page_id from page_builder where slug = 'community-topics-pet-owners';
  if v_page_id is not null and not exists (select 1 from page_modules where page_id = v_page_id) then
    insert into page_modules (page_id, module_type, board_id, settings, sort_order) values
      (v_page_id, 'hero', null, '{"title":"인간 집사들 클럽","subtitle":"살롱데상 · 커뮤니티 · 주제별 소통","description":"인간 집사들 클럽 주제 게시판입니다.","breadcrumb":[{"label":"홈","href":"/"},{"label":"살롱데상"},{"label":"커뮤니티","href":"/community"},{"label":"주제별 소통 게시판","href":"/community/topics"},{"label":"인간 집사들 클럽"}]}'::jsonb, 0),
      (v_page_id, 'board', (select id from boards where category = 'pets' limit 1), '{"showThumbnail":false}'::jsonb, 1);
  end if;
end $$;

-- community-topics-warm-world (따듯한 세상 클럽)
do $$
declare
  v_page_id uuid;
begin
  select id into v_page_id from page_builder where slug = 'community-topics-warm-world';
  if v_page_id is not null and not exists (select 1 from page_modules where page_id = v_page_id) then
    insert into page_modules (page_id, module_type, board_id, settings, sort_order) values
      (v_page_id, 'hero', null, '{"title":"따듯한 세상 클럽","subtitle":"살롱데상 · 커뮤니티 · 주제별 소통","description":"따듯한 세상 클럽 주제 게시판입니다.","breadcrumb":[{"label":"홈","href":"/"},{"label":"살롱데상"},{"label":"커뮤니티","href":"/community"},{"label":"주제별 소통 게시판","href":"/community/topics"},{"label":"따듯한 세상 클럽"}]}'::jsonb, 0),
      (v_page_id, 'board', (select id from boards where category = 'warmth' limit 1), '{"showThumbnail":false}'::jsonb, 1);
  end if;
end $$;

-- community-weekday (요일별 클럽 모임)
do $$
declare
  v_page_id uuid;
begin
  select id into v_page_id from page_builder where slug = 'community-weekday';
  if v_page_id is not null and not exists (select 1 from page_modules where page_id = v_page_id) then
    insert into page_modules (page_id, module_type, board_id, settings, sort_order) values
      (v_page_id, 'hero', null, '{"title":"요일별 클럽 모임","subtitle":"살롱데상 · 커뮤니티","description":"요일별로 열리는 클럽 모임방 게시판의 최신 글을 모아보는 허브입니다.","breadcrumb":[{"label":"홈","href":"/"},{"label":"살롱데상"},{"label":"커뮤니티","href":"/community"},{"label":"요일별 클럽 모임"}]}'::jsonb, 0),
      (v_page_id, 'slide', (select id from boards where category = 'mon' limit 1), '{"title":"월요반란 클럽 모임방","sort":"latest"}'::jsonb, 1),
      (v_page_id, 'slide', (select id from boards where category = 'tue' limit 1), '{"title":"책 낭송 클럽 모임방","sort":"latest"}'::jsonb, 2),
      (v_page_id, 'slide', (select id from boards where category = 'wed' limit 1), '{"title":"행간의 조각가 모임방","sort":"latest"}'::jsonb, 3),
      (v_page_id, 'slide', (select id from boards where category = 'thu' limit 1), '{"title":"놀아보자 영어클럽 모임방","sort":"latest"}'::jsonb, 4),
      (v_page_id, 'slide', (select id from boards where category = 'fri' limit 1), '{"title":"비포 선라이즈 소셜클럽 모임방","sort":"latest"}'::jsonb, 5),
      (v_page_id, 'slide', (select id from boards where category = 'sat' limit 1), '{"title":"무슨일이든 일어날수있어 클럽 모임방","sort":"latest"}'::jsonb, 6),
      (v_page_id, 'slide', (select id from boards where category = 'sun' limit 1), '{"title":"연극이 끝나고 난 뒤 클럽 모임방","sort":"latest"}'::jsonb, 7);
  end if;
end $$;

-- community-weekday-monday (월요반란 클럽 모임방)
do $$
declare
  v_page_id uuid;
begin
  select id into v_page_id from page_builder where slug = 'community-weekday-monday';
  if v_page_id is not null and not exists (select 1 from page_modules where page_id = v_page_id) then
    insert into page_modules (page_id, module_type, board_id, settings, sort_order) values
      (v_page_id, 'hero', null, '{"title":"월요반란 클럽 모임방","subtitle":"살롱데상 · 커뮤니티 · 요일별 클럽 모임","description":"월요반란 클럽 모임방 게시판 — 주간 참석 신청은 아래 버튼으로.","breadcrumb":[{"label":"홈","href":"/"},{"label":"살롱데상"},{"label":"커뮤니티","href":"/community"},{"label":"요일별 클럽 모임","href":"/community/weekday"},{"label":"월요반란 클럽 모임방"}]}'::jsonb, 0),
      (v_page_id, 'application', null, '{"actions":[{"label":"참석 신청","href":"/community/club/월요반란 클럽 모임방"}]}'::jsonb, 1),
      (v_page_id, 'board', (select id from boards where category = 'mon' limit 1), '{"showThumbnail":false}'::jsonb, 2);
  end if;
end $$;

-- community-weekday-book (책 낭송 클럽 모임방)
do $$
declare
  v_page_id uuid;
begin
  select id into v_page_id from page_builder where slug = 'community-weekday-book';
  if v_page_id is not null and not exists (select 1 from page_modules where page_id = v_page_id) then
    insert into page_modules (page_id, module_type, board_id, settings, sort_order) values
      (v_page_id, 'hero', null, '{"title":"책 낭송 클럽 모임방","subtitle":"살롱데상 · 커뮤니티 · 요일별 클럽 모임","description":"책 낭송 클럽 모임방 게시판 — 주간 참석 신청은 아래 버튼으로.","breadcrumb":[{"label":"홈","href":"/"},{"label":"살롱데상"},{"label":"커뮤니티","href":"/community"},{"label":"요일별 클럽 모임","href":"/community/weekday"},{"label":"책 낭송 클럽 모임방"}]}'::jsonb, 0),
      (v_page_id, 'application', null, '{"actions":[{"label":"참석 신청","href":"/community/club/책 낭송 클럽 모임방"}]}'::jsonb, 1),
      (v_page_id, 'board', (select id from boards where category = 'tue' limit 1), '{"showThumbnail":false}'::jsonb, 2);
  end if;
end $$;

-- community-weekday-between-lines (행간의 조각가 모임방)
do $$
declare
  v_page_id uuid;
begin
  select id into v_page_id from page_builder where slug = 'community-weekday-between-lines';
  if v_page_id is not null and not exists (select 1 from page_modules where page_id = v_page_id) then
    insert into page_modules (page_id, module_type, board_id, settings, sort_order) values
      (v_page_id, 'hero', null, '{"title":"행간의 조각가 모임방","subtitle":"살롱데상 · 커뮤니티 · 요일별 클럽 모임","description":"행간의 조각가 모임방 게시판 — 주간 참석 신청은 아래 버튼으로.","breadcrumb":[{"label":"홈","href":"/"},{"label":"살롱데상"},{"label":"커뮤니티","href":"/community"},{"label":"요일별 클럽 모임","href":"/community/weekday"},{"label":"행간의 조각가 모임방"}]}'::jsonb, 0),
      (v_page_id, 'application', null, '{"actions":[{"label":"참석 신청","href":"/community/club/행간의 조각가 모임방"}]}'::jsonb, 1),
      (v_page_id, 'board', (select id from boards where category = 'wed' limit 1), '{"showThumbnail":false}'::jsonb, 2);
  end if;
end $$;

-- community-weekday-english-play (놀아보자 영어클럽 모임방)
do $$
declare
  v_page_id uuid;
begin
  select id into v_page_id from page_builder where slug = 'community-weekday-english-play';
  if v_page_id is not null and not exists (select 1 from page_modules where page_id = v_page_id) then
    insert into page_modules (page_id, module_type, board_id, settings, sort_order) values
      (v_page_id, 'hero', null, '{"title":"놀아보자 영어클럽 모임방","subtitle":"살롱데상 · 커뮤니티 · 요일별 클럽 모임","description":"놀아보자 영어클럽 모임방 게시판 — 주간 참석 신청은 아래 버튼으로.","breadcrumb":[{"label":"홈","href":"/"},{"label":"살롱데상"},{"label":"커뮤니티","href":"/community"},{"label":"요일별 클럽 모임","href":"/community/weekday"},{"label":"놀아보자 영어클럽 모임방"}]}'::jsonb, 0),
      (v_page_id, 'application', null, '{"actions":[{"label":"참석 신청","href":"/community/club/놀아보자 영어클럽 모임방"}]}'::jsonb, 1),
      (v_page_id, 'board', (select id from boards where category = 'thu' limit 1), '{"showThumbnail":false}'::jsonb, 2);
  end if;
end $$;

-- community-weekday-before-sunrise (비포 선라이즈 소셜클럽 모임방)
do $$
declare
  v_page_id uuid;
begin
  select id into v_page_id from page_builder where slug = 'community-weekday-before-sunrise';
  if v_page_id is not null and not exists (select 1 from page_modules where page_id = v_page_id) then
    insert into page_modules (page_id, module_type, board_id, settings, sort_order) values
      (v_page_id, 'hero', null, '{"title":"비포 선라이즈 소셜클럽 모임방","subtitle":"살롱데상 · 커뮤니티 · 요일별 클럽 모임","description":"비포 선라이즈 소셜클럽 모임방 게시판 — 주간 참석 신청은 아래 버튼으로.","breadcrumb":[{"label":"홈","href":"/"},{"label":"살롱데상"},{"label":"커뮤니티","href":"/community"},{"label":"요일별 클럽 모임","href":"/community/weekday"},{"label":"비포 선라이즈 소셜클럽 모임방"}]}'::jsonb, 0),
      (v_page_id, 'application', null, '{"actions":[{"label":"참석 신청","href":"/community/club/비포 선라이즈 소셜클럽 모임방"}]}'::jsonb, 1),
      (v_page_id, 'board', (select id from boards where category = 'fri' limit 1), '{"showThumbnail":false}'::jsonb, 2);
  end if;
end $$;

-- community-weekday-anything-can-happen (무슨일이든 일어날수있어 클럽 모임방)
do $$
declare
  v_page_id uuid;
begin
  select id into v_page_id from page_builder where slug = 'community-weekday-anything-can-happen';
  if v_page_id is not null and not exists (select 1 from page_modules where page_id = v_page_id) then
    insert into page_modules (page_id, module_type, board_id, settings, sort_order) values
      (v_page_id, 'hero', null, '{"title":"무슨일이든 일어날수있어 클럽 모임방","subtitle":"살롱데상 · 커뮤니티 · 요일별 클럽 모임","description":"무슨일이든 일어날수있어 클럽 모임방 게시판 — 주간 참석 신청은 아래 버튼으로.","breadcrumb":[{"label":"홈","href":"/"},{"label":"살롱데상"},{"label":"커뮤니티","href":"/community"},{"label":"요일별 클럽 모임","href":"/community/weekday"},{"label":"무슨일이든 일어날수있어 클럽 모임방"}]}'::jsonb, 0),
      (v_page_id, 'application', null, '{"actions":[{"label":"참석 신청","href":"/community/club/무슨일이든 일어날수있어 클럽 모임방"}]}'::jsonb, 1),
      (v_page_id, 'board', (select id from boards where category = 'sat' limit 1), '{"showThumbnail":false}'::jsonb, 2);
  end if;
end $$;

-- community-weekday-after-the-play (연극이 끝나고 난 뒤 클럽 모임방)
do $$
declare
  v_page_id uuid;
begin
  select id into v_page_id from page_builder where slug = 'community-weekday-after-the-play';
  if v_page_id is not null and not exists (select 1 from page_modules where page_id = v_page_id) then
    insert into page_modules (page_id, module_type, board_id, settings, sort_order) values
      (v_page_id, 'hero', null, '{"title":"연극이 끝나고 난 뒤 클럽 모임방","subtitle":"살롱데상 · 커뮤니티 · 요일별 클럽 모임","description":"연극이 끝나고 난 뒤 클럽 모임방 게시판 — 주간 참석 신청은 아래 버튼으로.","breadcrumb":[{"label":"홈","href":"/"},{"label":"살롱데상"},{"label":"커뮤니티","href":"/community"},{"label":"요일별 클럽 모임","href":"/community/weekday"},{"label":"연극이 끝나고 난 뒤 클럽 모임방"}]}'::jsonb, 0),
      (v_page_id, 'application', null, '{"actions":[{"label":"참석 신청","href":"/community/club/연극이 끝나고 난 뒤 클럽 모임방"}]}'::jsonb, 1),
      (v_page_id, 'board', (select id from boards where category = 'sun' limit 1), '{"showThumbnail":false}'::jsonb, 2);
  end if;
end $$;

-- community-qna (Q&A)
do $$
declare
  v_page_id uuid;
begin
  select id into v_page_id from page_builder where slug = 'community-qna';
  if v_page_id is not null and not exists (select 1 from page_modules where page_id = v_page_id) then
    insert into page_modules (page_id, module_type, board_id, settings, sort_order) values
      (v_page_id, 'hero', null, '{"title":"Q&A","subtitle":"살롱데상 · 커뮤니티","description":"궁금한 점을 묻고 답하는 게시판입니다.","breadcrumb":[{"label":"홈","href":"/"},{"label":"살롱데상"},{"label":"커뮤니티","href":"/community"},{"label":"Q&A"}]}'::jsonb, 0),
      (v_page_id, 'board', (select id from boards where name = '질문과 답변' limit 1), '{"showThumbnail":false}'::jsonb, 1);
  end if;
end $$;

-- monthly-events (월별 모임)
do $$
declare
  v_page_id uuid;
begin
  select id into v_page_id from page_builder where slug = 'monthly-events';
  if v_page_id is not null and not exists (select 1 from page_modules where page_id = v_page_id) then
    insert into page_modules (page_id, module_type, board_id, settings, sort_order) values
      (v_page_id, 'hero', null, '{"title":"월별 모임","subtitle":"살롱데상 · 커뮤니티 · 패트론의 살롱","description":"패트론의 살롱, 월별 정기 모임 안내 게시판입니다.","breadcrumb":[{"label":"홈","href":"/"},{"label":"살롱데상"},{"label":"커뮤니티"},{"label":"월별 모임"}]}'::jsonb, 0),
      (v_page_id, 'board', (select id from boards where category = 'monthly-salon' limit 1), '{"showThumbnail":false}'::jsonb, 1);
  end if;
end $$;

-- community-events (공연 / 전시회 소개)
do $$
declare
  v_page_id uuid;
begin
  select id into v_page_id from page_builder where slug = 'community-events';
  if v_page_id is not null and not exists (select 1 from page_modules where page_id = v_page_id) then
    insert into page_modules (page_id, module_type, board_id, settings, sort_order) values
      (v_page_id, 'hero', null, '{"title":"공연 / 전시회 소개","subtitle":"살롱데상 · 커뮤니티","description":"커뮤니티 회원들의 공연/전시회 소식을 소개하는 스토리 게시판입니다.","breadcrumb":[{"label":"홈","href":"/"},{"label":"살롱데상"},{"label":"커뮤니티"},{"label":"공연 / 전시회 소개"}]}'::jsonb, 0),
      (v_page_id, 'quote', null, '{"text":"인용문을 입력하세요","author":""}'::jsonb, 1),
      (v_page_id, 'board', (select id from boards where category = 'events' limit 1), '{"showThumbnail":true}'::jsonb, 2),
      (v_page_id, 'gallery', (select id from boards where category = 'events' limit 1), '{}'::jsonb, 3);
  end if;
end $$;

-- event-notices (이벤트 공지)
do $$
declare
  v_page_id uuid;
begin
  select id into v_page_id from page_builder where slug = 'event-notices';
  if v_page_id is not null and not exists (select 1 from page_modules where page_id = v_page_id) then
    insert into page_modules (page_id, module_type, board_id, settings, sort_order) values
      (v_page_id, 'hero', null, '{"title":"이벤트 공지","subtitle":"살롱데상 · 커뮤니티","description":"이벤트 공지를 소개하는 스토리 게시판입니다.","breadcrumb":[{"label":"홈","href":"/"},{"label":"살롱데상"},{"label":"커뮤니티"},{"label":"이벤트 공지"}]}'::jsonb, 0),
      (v_page_id, 'quote', null, '{"text":"인용문을 입력하세요","author":""}'::jsonb, 1),
      (v_page_id, 'board', (select id from boards where category = 'notice' limit 1), '{"showThumbnail":true}'::jsonb, 2),
      (v_page_id, 'gallery', (select id from boards where category = 'notice' limit 1), '{}'::jsonb, 3);
  end if;
end $$;

-- membership (멤버십)
do $$
declare
  v_page_id uuid;
begin
  select id into v_page_id from page_builder where slug = 'membership';
  if v_page_id is not null and not exists (select 1 from page_modules where page_id = v_page_id) then
    insert into page_modules (page_id, module_type, board_id, settings, sort_order) values
      (v_page_id, 'hero', null, '{"title":"멤버십","subtitle":"살롱데상","description":"Membership 하위 게시판의 최신 글을 모아보는 허브입니다.","breadcrumb":[{"label":"홈","href":"/"},{"label":"살롱데상"},{"label":"멤버십"}]}'::jsonb, 0),
      (v_page_id, 'slide', (select id from boards where category = 'my-treasures' limit 1), '{"title":"나의 보물 이야기","sort":"latest"}'::jsonb, 1),
      (v_page_id, 'slide', (select id from boards where name = '아티스트 홍보' limit 1), '{"title":"나의 아티스트 소개","sort":"latest"}'::jsonb, 2),
      (v_page_id, 'slide', (select id from boards where category = 'mind-diary' limit 1), '{"title":"마음일기","sort":"latest"}'::jsonb, 3),
      (v_page_id, 'slide', (select id from boards where name = '패트론 라운지' limit 1), '{"title":"패트론 게시판","sort":"latest"}'::jsonb, 4),
      (v_page_id, 'slide', (select id from boards where category = 'one-line-novel' limit 1), '{"title":"한문장 소설 프로젝트","sort":"latest"}'::jsonb, 5),
      (v_page_id, 'slide', (select id from boards where category = 'secret-room-docent' limit 1), '{"title":"비밀의 방 도슨트","sort":"latest"}'::jsonb, 6);
  end if;
end $$;

-- membership-my-treasures (나의 보물 이야기)
do $$
declare
  v_page_id uuid;
begin
  select id into v_page_id from page_builder where slug = 'membership-my-treasures';
  if v_page_id is not null and not exists (select 1 from page_modules where page_id = v_page_id) then
    insert into page_modules (page_id, module_type, board_id, settings, sort_order) values
      (v_page_id, 'hero', null, '{"title":"나의 보물 이야기","subtitle":"살롱데상 · 멤버십","description":"회원들의 ''나의 보물'' 이야기를 모아보는 스토리 게시판입니다.","breadcrumb":[{"label":"홈","href":"/"},{"label":"살롱데상"},{"label":"멤버십","href":"/membership"},{"label":"나의 보물 이야기"}]}'::jsonb, 0),
      (v_page_id, 'quote', null, '{"text":"인용문을 입력하세요","author":""}'::jsonb, 1),
      (v_page_id, 'board', (select id from boards where category = 'my-treasures' limit 1), '{"showThumbnail":true}'::jsonb, 2),
      (v_page_id, 'gallery', (select id from boards where category = 'my-treasures' limit 1), '{}'::jsonb, 3);
  end if;
end $$;

-- membership-artist-intro (나의 아티스트 소개)
do $$
declare
  v_page_id uuid;
begin
  select id into v_page_id from page_builder where slug = 'membership-artist-intro';
  if v_page_id is not null and not exists (select 1 from page_modules where page_id = v_page_id) then
    insert into page_modules (page_id, module_type, board_id, settings, sort_order) values
      (v_page_id, 'hero', null, '{"title":"나의 아티스트 소개","subtitle":"살롱데상 · 멤버십","description":"회원 본인을 아티스트로 소개하는 게시판입니다.","breadcrumb":[{"label":"홈","href":"/"},{"label":"살롱데상"},{"label":"멤버십","href":"/membership"},{"label":"나의 아티스트 소개"}]}'::jsonb, 0),
      (v_page_id, 'board', (select id from boards where name = '아티스트 홍보' limit 1), '{"showThumbnail":false}'::jsonb, 1);
  end if;
end $$;

-- membership-mind-diary (마음일기)
do $$
declare
  v_page_id uuid;
begin
  select id into v_page_id from page_builder where slug = 'membership-mind-diary';
  if v_page_id is not null and not exists (select 1 from page_modules where page_id = v_page_id) then
    insert into page_modules (page_id, module_type, board_id, settings, sort_order) values
      (v_page_id, 'hero', null, '{"title":"마음일기","subtitle":"살롱데상 · 멤버십","description":"마음일기를 나누는 게시판입니다.","breadcrumb":[{"label":"홈","href":"/"},{"label":"살롱데상"},{"label":"멤버십","href":"/membership"},{"label":"마음일기"}]}'::jsonb, 0),
      (v_page_id, 'board', (select id from boards where category = 'mind-diary' limit 1), '{"showThumbnail":false}'::jsonb, 1);
  end if;
end $$;

-- membership-patron (패트론 게시판)
do $$
declare
  v_page_id uuid;
begin
  select id into v_page_id from page_builder where slug = 'membership-patron';
  if v_page_id is not null and not exists (select 1 from page_modules where page_id = v_page_id) then
    insert into page_modules (page_id, module_type, board_id, settings, sort_order) values
      (v_page_id, 'hero', null, '{"title":"패트론 게시판","subtitle":"살롱데상 · 멤버십","description":"패트론 등급 전용 라운지 게시판입니다.","breadcrumb":[{"label":"홈","href":"/"},{"label":"살롱데상"},{"label":"멤버십","href":"/membership"},{"label":"패트론 게시판"}]}'::jsonb, 0),
      (v_page_id, 'board', (select id from boards where name = '패트론 라운지' limit 1), '{"showThumbnail":false}'::jsonb, 1);
  end if;
end $$;

-- membership-one-sentence-novel (한문장 소설 프로젝트)
do $$
declare
  v_page_id uuid;
begin
  select id into v_page_id from page_builder where slug = 'membership-one-sentence-novel';
  if v_page_id is not null and not exists (select 1 from page_modules where page_id = v_page_id) then
    insert into page_modules (page_id, module_type, board_id, settings, sort_order) values
      (v_page_id, 'hero', null, '{"title":"한문장 소설 프로젝트","subtitle":"살롱데상 · 멤버십","description":"한 문장씩 이어 쓰는 소설 프로젝트 게시판입니다.","breadcrumb":[{"label":"홈","href":"/"},{"label":"살롱데상"},{"label":"멤버십","href":"/membership"},{"label":"한문장 소설 프로젝트"}]}'::jsonb, 0),
      (v_page_id, 'board', (select id from boards where category = 'one-line-novel' limit 1), '{"showThumbnail":false}'::jsonb, 1);
  end if;
end $$;

-- membership-secret-room (비밀의 방 도슨트)
do $$
declare
  v_page_id uuid;
begin
  select id into v_page_id from page_builder where slug = 'membership-secret-room';
  if v_page_id is not null and not exists (select 1 from page_modules where page_id = v_page_id) then
    insert into page_modules (page_id, module_type, board_id, settings, sort_order) values
      (v_page_id, 'hero', null, '{"title":"비밀의 방 도슨트","subtitle":"살롱데상 · 멤버십","description":"비밀의 방 전용 도슨트 게시판입니다.","breadcrumb":[{"label":"홈","href":"/"},{"label":"살롱데상"},{"label":"멤버십","href":"/membership"},{"label":"비밀의 방 도슨트"}]}'::jsonb, 0),
      (v_page_id, 'board', (select id from boards where category = 'secret-room-docent' limit 1), '{"showThumbnail":false}'::jsonb, 1);
  end if;
end $$;

-- salon-my-treasure-story (나의 보물 이야기)
do $$
declare
  v_page_id uuid;
begin
  select id into v_page_id from page_builder where slug = 'salon-my-treasure-story';
  if v_page_id is not null and not exists (select 1 from page_modules where page_id = v_page_id) then
    insert into page_modules (page_id, module_type, board_id, settings, sort_order) values
      (v_page_id, 'hero', null, '{"title":"나의 보물 이야기","subtitle":"살롱데상 · 멤버십","description":"회원들의 ''나의 보물'' 이야기를 모아보는 스토리 게시판입니다.","breadcrumb":[{"label":"홈","href":"/"},{"label":"살롱데상"},{"label":"멤버십"},{"label":"나의 보물 이야기"}]}'::jsonb, 0),
      (v_page_id, 'quote', null, '{"text":"인용문을 입력하세요","author":""}'::jsonb, 1),
      (v_page_id, 'board', (select id from boards where category = 'my-treasures' limit 1), '{"showThumbnail":true}'::jsonb, 2),
      (v_page_id, 'gallery', (select id from boards where category = 'my-treasures' limit 1), '{}'::jsonb, 3);
  end if;
end $$;

-- salon-artist-intro (나의 아티스트 소개)
do $$
declare
  v_page_id uuid;
begin
  select id into v_page_id from page_builder where slug = 'salon-artist-intro';
  if v_page_id is not null and not exists (select 1 from page_modules where page_id = v_page_id) then
    insert into page_modules (page_id, module_type, board_id, settings, sort_order) values
      (v_page_id, 'hero', null, '{"title":"나의 아티스트 소개","subtitle":"살롱데상 · 멤버십","description":"회원 본인을 아티스트로 소개하는 게시판입니다.","breadcrumb":[{"label":"홈","href":"/"},{"label":"살롱데상"},{"label":"멤버십"},{"label":"나의 아티스트 소개"}]}'::jsonb, 0),
      (v_page_id, 'board', (select id from boards where name = '아티스트 홍보' limit 1), '{"showThumbnail":false}'::jsonb, 1);
  end if;
end $$;

-- salon-mind-diary (마음일기)
do $$
declare
  v_page_id uuid;
begin
  select id into v_page_id from page_builder where slug = 'salon-mind-diary';
  if v_page_id is not null and not exists (select 1 from page_modules where page_id = v_page_id) then
    insert into page_modules (page_id, module_type, board_id, settings, sort_order) values
      (v_page_id, 'hero', null, '{"title":"마음일기","subtitle":"살롱데상 · 멤버십","description":"마음일기를 나누는 게시판입니다.","breadcrumb":[{"label":"홈","href":"/"},{"label":"살롱데상"},{"label":"멤버십"},{"label":"마음일기"}]}'::jsonb, 0),
      (v_page_id, 'board', (select id from boards where category = 'mind-diary' limit 1), '{"showThumbnail":false}'::jsonb, 1);
  end if;
end $$;

-- salon-one-sentence-novel (한문장 소설 프로젝트)
do $$
declare
  v_page_id uuid;
begin
  select id into v_page_id from page_builder where slug = 'salon-one-sentence-novel';
  if v_page_id is not null and not exists (select 1 from page_modules where page_id = v_page_id) then
    insert into page_modules (page_id, module_type, board_id, settings, sort_order) values
      (v_page_id, 'hero', null, '{"title":"한문장 소설 프로젝트","subtitle":"살롱데상 · 멤버십","description":"한 문장씩 이어 쓰는 소설 프로젝트 게시판입니다.","breadcrumb":[{"label":"홈","href":"/"},{"label":"살롱데상"},{"label":"멤버십"},{"label":"한문장 소설 프로젝트"}]}'::jsonb, 0),
      (v_page_id, 'board', (select id from boards where category = 'one-line-novel' limit 1), '{"showThumbnail":false}'::jsonb, 1);
  end if;
end $$;

-- salon-secret-room (비밀의 방 도슨트)
do $$
declare
  v_page_id uuid;
begin
  select id into v_page_id from page_builder where slug = 'salon-secret-room';
  if v_page_id is not null and not exists (select 1 from page_modules where page_id = v_page_id) then
    insert into page_modules (page_id, module_type, board_id, settings, sort_order) values
      (v_page_id, 'hero', null, '{"title":"비밀의 방 도슨트","subtitle":"살롱데상 · 멤버십","description":"비밀의 방 전용 도슨트 게시판입니다.","breadcrumb":[{"label":"홈","href":"/"},{"label":"살롱데상"},{"label":"멤버십"},{"label":"비밀의 방 도슨트"}]}'::jsonb, 0),
      (v_page_id, 'board', (select id from boards where category = 'secret-room-docent' limit 1), '{"showThumbnail":false}'::jsonb, 1);
  end if;
end $$;

-- gallery (갤러리)
do $$
declare
  v_page_id uuid;
begin
  select id into v_page_id from page_builder where slug = 'gallery';
  if v_page_id is not null and not exists (select 1 from page_modules where page_id = v_page_id) then
    insert into page_modules (page_id, module_type, board_id, settings, sort_order) values
      (v_page_id, 'hero', null, '{"title":"갤러리","subtitle":"살롱데상","description":"Gallery 하위 게시판의 최신 글을 모아보는 허브입니다.","breadcrumb":[{"label":"홈","href":"/"},{"label":"살롱데상"},{"label":"갤러리"}]}'::jsonb, 0),
      (v_page_id, 'slide', (select id from boards where category = 'awards' limit 1), '{"title":"시상식","sort":"latest"}'::jsonb, 1),
      (v_page_id, 'slide', (select id from boards where category = 'parties' limit 1), '{"title":"파티","sort":"latest"}'::jsonb, 2),
      (v_page_id, 'slide', (select id from boards where category = 'patrons' limit 1), '{"title":"패트론들","sort":"latest"}'::jsonb, 3),
      (v_page_id, 'slide', (select id from boards where category = 'performances' limit 1), '{"title":"공연들","sort":"latest"}'::jsonb, 4),
      (v_page_id, 'slide', (select id from boards where category = 'gallery-visitors' limit 1), '{"title":"운명의 방문자들","sort":"latest"}'::jsonb, 5);
  end if;
end $$;

-- gallery-awards (시상식)
do $$
declare
  v_page_id uuid;
begin
  select id into v_page_id from page_builder where slug = 'gallery-awards';
  if v_page_id is not null and not exists (select 1 from page_modules where page_id = v_page_id) then
    insert into page_modules (page_id, module_type, board_id, settings, sort_order) values
      (v_page_id, 'hero', null, '{"title":"시상식","subtitle":"살롱데상 · 갤러리","description":"시상식을 소개하는 스토리 게시판입니다.","breadcrumb":[{"label":"홈","href":"/"},{"label":"살롱데상"},{"label":"갤러리","href":"/gallery"},{"label":"시상식"}]}'::jsonb, 0),
      (v_page_id, 'quote', null, '{"text":"인용문을 입력하세요","author":""}'::jsonb, 1),
      (v_page_id, 'board', (select id from boards where category = 'awards' limit 1), '{"showThumbnail":true}'::jsonb, 2),
      (v_page_id, 'gallery', (select id from boards where category = 'awards' limit 1), '{}'::jsonb, 3);
  end if;
end $$;

-- gallery-parties (파티)
do $$
declare
  v_page_id uuid;
begin
  select id into v_page_id from page_builder where slug = 'gallery-parties';
  if v_page_id is not null and not exists (select 1 from page_modules where page_id = v_page_id) then
    insert into page_modules (page_id, module_type, board_id, settings, sort_order) values
      (v_page_id, 'hero', null, '{"title":"파티","subtitle":"살롱데상 · 갤러리","description":"파티를 소개하는 스토리 게시판입니다.","breadcrumb":[{"label":"홈","href":"/"},{"label":"살롱데상"},{"label":"갤러리","href":"/gallery"},{"label":"파티"}]}'::jsonb, 0),
      (v_page_id, 'quote', null, '{"text":"인용문을 입력하세요","author":""}'::jsonb, 1),
      (v_page_id, 'board', (select id from boards where category = 'parties' limit 1), '{"showThumbnail":true}'::jsonb, 2),
      (v_page_id, 'gallery', (select id from boards where category = 'parties' limit 1), '{}'::jsonb, 3);
  end if;
end $$;

-- gallery-patrons (패트론들)
do $$
declare
  v_page_id uuid;
begin
  select id into v_page_id from page_builder where slug = 'gallery-patrons';
  if v_page_id is not null and not exists (select 1 from page_modules where page_id = v_page_id) then
    insert into page_modules (page_id, module_type, board_id, settings, sort_order) values
      (v_page_id, 'hero', null, '{"title":"패트론들","subtitle":"살롱데상 · 갤러리","description":"패트론들을 소개하는 스토리 게시판입니다.","breadcrumb":[{"label":"홈","href":"/"},{"label":"살롱데상"},{"label":"갤러리","href":"/gallery"},{"label":"패트론들"}]}'::jsonb, 0),
      (v_page_id, 'quote', null, '{"text":"인용문을 입력하세요","author":""}'::jsonb, 1),
      (v_page_id, 'board', (select id from boards where category = 'patrons' limit 1), '{"showThumbnail":true}'::jsonb, 2),
      (v_page_id, 'gallery', (select id from boards where category = 'patrons' limit 1), '{}'::jsonb, 3);
  end if;
end $$;

-- gallery-performance (공연들)
do $$
declare
  v_page_id uuid;
begin
  select id into v_page_id from page_builder where slug = 'gallery-performance';
  if v_page_id is not null and not exists (select 1 from page_modules where page_id = v_page_id) then
    insert into page_modules (page_id, module_type, board_id, settings, sort_order) values
      (v_page_id, 'hero', null, '{"title":"공연들","subtitle":"살롱데상 · 갤러리","description":"공연들을 소개하는 스토리 게시판입니다.","breadcrumb":[{"label":"홈","href":"/"},{"label":"살롱데상"},{"label":"갤러리","href":"/gallery"},{"label":"공연들"}]}'::jsonb, 0),
      (v_page_id, 'quote', null, '{"text":"인용문을 입력하세요","author":""}'::jsonb, 1),
      (v_page_id, 'board', (select id from boards where category = 'performances' limit 1), '{"showThumbnail":true}'::jsonb, 2),
      (v_page_id, 'gallery', (select id from boards where category = 'performances' limit 1), '{}'::jsonb, 3);
  end if;
end $$;

-- gallery-visitors (운명의 방문자들)
do $$
declare
  v_page_id uuid;
begin
  select id into v_page_id from page_builder where slug = 'gallery-visitors';
  if v_page_id is not null and not exists (select 1 from page_modules where page_id = v_page_id) then
    insert into page_modules (page_id, module_type, board_id, settings, sort_order) values
      (v_page_id, 'hero', null, '{"title":"운명의 방문자들","subtitle":"살롱데상 · 갤러리","description":"운명의 방문자들을 소개하는 스토리 게시판입니다.","breadcrumb":[{"label":"홈","href":"/"},{"label":"살롱데상"},{"label":"갤러리","href":"/gallery"},{"label":"운명의 방문자들"}]}'::jsonb, 0),
      (v_page_id, 'quote', null, '{"text":"인용문을 입력하세요","author":""}'::jsonb, 1),
      (v_page_id, 'board', (select id from boards where category = 'gallery-visitors' limit 1), '{"showThumbnail":true}'::jsonb, 2),
      (v_page_id, 'gallery', (select id from boards where category = 'gallery-visitors' limit 1), '{}'::jsonb, 3);
  end if;
end $$;

-- salon-gallery-awards (시상식)
do $$
declare
  v_page_id uuid;
begin
  select id into v_page_id from page_builder where slug = 'salon-gallery-awards';
  if v_page_id is not null and not exists (select 1 from page_modules where page_id = v_page_id) then
    insert into page_modules (page_id, module_type, board_id, settings, sort_order) values
      (v_page_id, 'hero', null, '{"title":"시상식","subtitle":"살롱데상 · 갤러리","description":"시상식을 소개하는 스토리 게시판입니다.","breadcrumb":[{"label":"홈","href":"/"},{"label":"살롱데상"},{"label":"갤러리"},{"label":"시상식"}]}'::jsonb, 0),
      (v_page_id, 'quote', null, '{"text":"인용문을 입력하세요","author":""}'::jsonb, 1),
      (v_page_id, 'board', (select id from boards where category = 'awards' limit 1), '{"showThumbnail":true}'::jsonb, 2),
      (v_page_id, 'gallery', (select id from boards where category = 'awards' limit 1), '{}'::jsonb, 3);
  end if;
end $$;

-- salon-gallery-parties (파티)
do $$
declare
  v_page_id uuid;
begin
  select id into v_page_id from page_builder where slug = 'salon-gallery-parties';
  if v_page_id is not null and not exists (select 1 from page_modules where page_id = v_page_id) then
    insert into page_modules (page_id, module_type, board_id, settings, sort_order) values
      (v_page_id, 'hero', null, '{"title":"파티","subtitle":"살롱데상 · 갤러리","description":"파티를 소개하는 스토리 게시판입니다.","breadcrumb":[{"label":"홈","href":"/"},{"label":"살롱데상"},{"label":"갤러리"},{"label":"파티"}]}'::jsonb, 0),
      (v_page_id, 'quote', null, '{"text":"인용문을 입력하세요","author":""}'::jsonb, 1),
      (v_page_id, 'board', (select id from boards where category = 'parties' limit 1), '{"showThumbnail":true}'::jsonb, 2),
      (v_page_id, 'gallery', (select id from boards where category = 'parties' limit 1), '{}'::jsonb, 3);
  end if;
end $$;

-- salon-gallery-patrons (패트론들)
do $$
declare
  v_page_id uuid;
begin
  select id into v_page_id from page_builder where slug = 'salon-gallery-patrons';
  if v_page_id is not null and not exists (select 1 from page_modules where page_id = v_page_id) then
    insert into page_modules (page_id, module_type, board_id, settings, sort_order) values
      (v_page_id, 'hero', null, '{"title":"패트론들","subtitle":"살롱데상 · 갤러리","description":"패트론들을 소개하는 스토리 게시판입니다.","breadcrumb":[{"label":"홈","href":"/"},{"label":"살롱데상"},{"label":"갤러리"},{"label":"패트론들"}]}'::jsonb, 0),
      (v_page_id, 'quote', null, '{"text":"인용문을 입력하세요","author":""}'::jsonb, 1),
      (v_page_id, 'board', (select id from boards where category = 'patrons' limit 1), '{"showThumbnail":true}'::jsonb, 2),
      (v_page_id, 'gallery', (select id from boards where category = 'patrons' limit 1), '{}'::jsonb, 3);
  end if;
end $$;

-- salon-gallery-performances (공연들)
do $$
declare
  v_page_id uuid;
begin
  select id into v_page_id from page_builder where slug = 'salon-gallery-performances';
  if v_page_id is not null and not exists (select 1 from page_modules where page_id = v_page_id) then
    insert into page_modules (page_id, module_type, board_id, settings, sort_order) values
      (v_page_id, 'hero', null, '{"title":"공연들","subtitle":"살롱데상 · 갤러리","description":"공연들을 소개하는 스토리 게시판입니다.","breadcrumb":[{"label":"홈","href":"/"},{"label":"살롱데상"},{"label":"갤러리"},{"label":"공연들"}]}'::jsonb, 0),
      (v_page_id, 'quote', null, '{"text":"인용문을 입력하세요","author":""}'::jsonb, 1),
      (v_page_id, 'board', (select id from boards where category = 'performances' limit 1), '{"showThumbnail":true}'::jsonb, 2),
      (v_page_id, 'gallery', (select id from boards where category = 'performances' limit 1), '{}'::jsonb, 3);
  end if;
end $$;

-- salon-gallery-visitors (운명의 방문자들)
do $$
declare
  v_page_id uuid;
begin
  select id into v_page_id from page_builder where slug = 'salon-gallery-visitors';
  if v_page_id is not null and not exists (select 1 from page_modules where page_id = v_page_id) then
    insert into page_modules (page_id, module_type, board_id, settings, sort_order) values
      (v_page_id, 'hero', null, '{"title":"운명의 방문자들","subtitle":"살롱데상 · 갤러리","description":"운명의 방문자들을 소개하는 스토리 게시판입니다.","breadcrumb":[{"label":"홈","href":"/"},{"label":"살롱데상"},{"label":"갤러리"},{"label":"운명의 방문자들"}]}'::jsonb, 0),
      (v_page_id, 'quote', null, '{"text":"인용문을 입력하세요","author":""}'::jsonb, 1),
      (v_page_id, 'board', (select id from boards where category = 'gallery-visitors' limit 1), '{"showThumbnail":true}'::jsonb, 2),
      (v_page_id, 'gallery', (select id from boards where category = 'gallery-visitors' limit 1), '{}'::jsonb, 3);
  end if;
end $$;

-- archive (아카이브)
do $$
declare
  v_page_id uuid;
begin
  select id into v_page_id from page_builder where slug = 'archive';
  if v_page_id is not null and not exists (select 1 from page_modules where page_id = v_page_id) then
    insert into page_modules (page_id, module_type, board_id, settings, sort_order) values
      (v_page_id, 'hero', null, '{"title":"아카이브","subtitle":"살롱데상","description":"Archive 하위 게시판의 최신 글을 모아보는 허브입니다.","breadcrumb":[{"label":"홈","href":"/"},{"label":"살롱데상"},{"label":"아카이브"}]}'::jsonb, 0),
      (v_page_id, 'slide', (select id from boards where category = 'brochure' limit 1), '{"title":"소개지","sort":"latest"}'::jsonb, 1),
      (v_page_id, 'slide', (select id from boards where category = 'poster' limit 1), '{"title":"포스터","sort":"latest"}'::jsonb, 2),
      (v_page_id, 'slide', (select id from boards where category = 'timeline' limit 1), '{"title":"타임라인","sort":"latest"}'::jsonb, 3);
  end if;
end $$;

-- archive-brochure (소개지)
do $$
declare
  v_page_id uuid;
begin
  select id into v_page_id from page_builder where slug = 'archive-brochure';
  if v_page_id is not null and not exists (select 1 from page_modules where page_id = v_page_id) then
    insert into page_modules (page_id, module_type, board_id, settings, sort_order) values
      (v_page_id, 'hero', null, '{"title":"소개지","subtitle":"살롱데상 · 아카이브","description":"소개지를 아카이빙하는 스토리 게시판입니다.","breadcrumb":[{"label":"홈","href":"/"},{"label":"살롱데상"},{"label":"아카이브","href":"/archive"},{"label":"소개지"}]}'::jsonb, 0),
      (v_page_id, 'quote', null, '{"text":"인용문을 입력하세요","author":""}'::jsonb, 1),
      (v_page_id, 'board', (select id from boards where category = 'brochure' limit 1), '{"showThumbnail":true}'::jsonb, 2),
      (v_page_id, 'gallery', (select id from boards where category = 'brochure' limit 1), '{}'::jsonb, 3);
  end if;
end $$;

-- archive-posters (포스터)
do $$
declare
  v_page_id uuid;
begin
  select id into v_page_id from page_builder where slug = 'archive-posters';
  if v_page_id is not null and not exists (select 1 from page_modules where page_id = v_page_id) then
    insert into page_modules (page_id, module_type, board_id, settings, sort_order) values
      (v_page_id, 'hero', null, '{"title":"포스터","subtitle":"살롱데상 · 아카이브","description":"포스터를 아카이빙하는 스토리 게시판입니다.","breadcrumb":[{"label":"홈","href":"/"},{"label":"살롱데상"},{"label":"아카이브","href":"/archive"},{"label":"포스터"}]}'::jsonb, 0),
      (v_page_id, 'quote', null, '{"text":"인용문을 입력하세요","author":""}'::jsonb, 1),
      (v_page_id, 'board', (select id from boards where category = 'poster' limit 1), '{"showThumbnail":true}'::jsonb, 2),
      (v_page_id, 'gallery', (select id from boards where category = 'poster' limit 1), '{}'::jsonb, 3);
  end if;
end $$;

-- archive-timeline (타임라인)
do $$
declare
  v_page_id uuid;
begin
  select id into v_page_id from page_builder where slug = 'archive-timeline';
  if v_page_id is not null and not exists (select 1 from page_modules where page_id = v_page_id) then
    insert into page_modules (page_id, module_type, board_id, settings, sort_order) values
      (v_page_id, 'hero', null, '{"title":"타임라인","subtitle":"살롱데상 · 아카이브","description":"사일로상점과 살롱데상의 모든 이벤트를 연/월 순으로 보여주는 반응형 타임라인입니다.","breadcrumb":[{"label":"홈","href":"/"},{"label":"살롱데상"},{"label":"아카이브","href":"/archive"},{"label":"타임라인"}]}'::jsonb, 0),
      (v_page_id, 'timeline', (select id from boards where category = 'timeline' limit 1), '{}'::jsonb, 1);
  end if;
end $$;

-- ============================================================
-- 4) Nav fix: '입양신청서 라이브러리' currently points at /shop (known bug,
--    EPIC-063) — point it at its new dedicated page instead.
-- ============================================================

update site_navigations set href = '/shop-adoption-library'
where title = '입양신청서 라이브러리' and href = '/shop';

