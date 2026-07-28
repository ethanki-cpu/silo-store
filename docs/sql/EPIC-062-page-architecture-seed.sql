-- EPIC-062: Complete Page Architecture — Navigation -> Page -> Module -> Board.
-- 테이블/RLS는 EPIC-061에서 이미 생성되어 여기서는 INSERT만 한다(DDL 없음 —
-- 관리자 계정으로 로그인한 상태의 Supabase SQL Editor에서 실행 가능).
-- 재실행 안전: page_builder는 upsert, 각 페이지의 기존 모듈은 지우고 재삽입.

insert into page_builder (slug, title, description, status)
values

  ('community-topics-economy', '경제 클럽', '경제 클럽 게시판입니다.', 'published'),
  ('community-topics-art', '예술 클럽', '예술 클럽 게시판입니다.', 'published'),
  ('community-topics-world-history', '세계역사 클럽', '세계역사 클럽 게시판입니다.', 'published'),
  ('community-topics-science', '과학 클럽', '과학 클럽 게시판입니다.', 'published'),
  ('community-topics-comedy', '코메디 클럽', '코메디 클럽 게시판입니다.', 'published'),
  ('community-topics-literature', '문학 클럽', '문학 클럽 게시판입니다.', 'published'),
  ('community-topics-health', '건강 클럽', '건강 클럽 게시판입니다.', 'published'),
  ('community-topics-politics', '정치 클럽', '정치 클럽 게시판입니다.', 'published'),
  ('community-topics-movie', '영화 클럽', '영화 클럽 게시판입니다.', 'published'),
  ('community-topics-psychology', '심리 클럽', '심리 클럽 게시판입니다.', 'published'),
  ('community-topics-sports', '스포츠 클럽', '스포츠 클럽 게시판입니다.', 'published'),
  ('community-topics-pet-owners', '인간 집사들 클럽', '인간 집사들 클럽 게시판입니다.', 'published'),
  ('community-topics-warm-world', '따듯한 세상 클럽', '따듯한 세상 클럽 게시판입니다.', 'published'),
  ('community-weekday-monday', '월요반란 클럽 모임방', '월요반란 클럽 모임방 게시판입니다.', 'published'),
  ('community-weekday-book', '책 낭송 클럽 모임방', '책 낭송 클럽 모임방 게시판입니다.', 'published'),
  ('community-weekday-between-lines', '행간의 조각가 모임방', '행간의 조각가 모임방 게시판입니다.', 'published'),
  ('community-weekday-english-play', '놀아보자 영어클럽 모임방', '놀아보자 영어클럽 모임방 게시판입니다.', 'published'),
  ('community-weekday-before-sunrise', '비포 선라이즈 소셜클럽 모임방', '비포 선라이즈 소셜클럽 모임방 게시판입니다.', 'published'),
  ('community-weekday-anything-can-happen', '무슨일이든 일어날수있어 클럽 모임방', '무슨일이든 일어날수있어 클럽 모임방 게시판입니다.', 'published'),
  ('community-weekday-after-the-play', '연극이 끝나고 난 뒤 클럽 모임방', '연극이 끝나고 난 뒤 클럽 모임방 게시판입니다.', 'published'),
  ('docent-renaissance', 'Renaissance', '1350~1600 Renaissance 시대 온라인 도슨트 콘텐츠입니다.', 'published'),
  ('docent-baroque', 'Baroque', '1600~1750 Baroque 시대 온라인 도슨트 콘텐츠입니다.', 'published'),
  ('docent-rococo', 'Rococo', '1715~1780 Rococo 시대 온라인 도슨트 콘텐츠입니다.', 'published'),
  ('docent-neoclassicism', 'NeoClassicism', '1750~1850 NeoClassicism 시대 온라인 도슨트 콘텐츠입니다.', 'published'),
  ('docent-regency', 'Regency', '1795~1837 Regency 시대 온라인 도슨트 콘텐츠입니다.', 'published'),
  ('docent-victoria', 'Victoria', '1837~1901 Victoria 시대 온라인 도슨트 콘텐츠입니다.', 'published'),
  ('docent-art-nouveau', 'Art Nouveau', '1890~1920 Art Nouveau 시대 온라인 도슨트 콘텐츠입니다.', 'published'),
  ('docent-art-deco', 'Art Deco', '1920~1940 Art Deco 시대 온라인 도슨트 콘텐츠입니다.', 'published'),
  ('docent-beat-generation', 'Beat Generation', '1940~1960 Beat Generation 시대 온라인 도슨트 콘텐츠입니다.', 'published'),
  ('docent-counterculture', 'CounterCulture', '1960~1980 CounterCulture 시대 온라인 도슨트 콘텐츠입니다.', 'published'),
  ('docent-digital', 'Digital', '1960~1980 Digital 시대 온라인 도슨트 콘텐츠입니다.', 'published'),
  ('community-topics', '주제별 소통', '주제별 소통 게시판 목록입니다. 관심 있는 주제를 선택해 대화에 참여해 보세요.', 'published'),
  ('community-weekday', '요일별 모임', '요일별로 열리는 클럽 모임 목록입니다.', 'published'),
  ('treasures', '사일로 보물들', '사일로상점의 보물 목록과 분양 후 이야기를 모아보는 허브입니다.', 'published'),
  ('community-general', '자유게시판', '자유롭게 이야기 나누는 게시판입니다.', 'published'),
  ('community-qna', 'Q&A', '궁금한 점을 묻고 답하는 게시판입니다.', 'published'),
  ('community-performances', '공연 / 전시회 소개', '커뮤니티 회원들의 공연/전시회 소식을 소개합니다.', 'published'),
  ('attendance', '출석체크', '매일 출석하고 포인트를 적립하는 페이지입니다(기존 기능 유지, 메타데이터만 등록).', 'published'),
  ('polls', '설문', '회원 설문조사 페이지입니다(기존 기능 유지, 메타데이터만 등록).', 'published'),
  ('event-notices', '이벤트 공지', '이벤트 공지 페이지입니다(기존 기능 유지, 메타데이터만 등록).', 'published'),
  ('monthly-events', '월별 모임 (패트론의 살롱)', '월별 모임 안내 페이지입니다(기존 기능 유지, 메타데이터만 등록).', 'published')

on conflict (slug) do update set status = 'published', title = excluded.title, description = excluded.description, updated_at = now();


delete from page_modules where page_id in (select id from page_builder where slug in (
  'community-topics-economy', 'community-topics-art', 'community-topics-world-history', 'community-topics-science', 'community-topics-comedy', 'community-topics-literature', 'community-topics-health', 'community-topics-politics', 'community-topics-movie', 'community-topics-psychology', 'community-topics-sports', 'community-topics-pet-owners', 'community-topics-warm-world', 'community-weekday-monday', 'community-weekday-book', 'community-weekday-between-lines', 'community-weekday-english-play', 'community-weekday-before-sunrise', 'community-weekday-anything-can-happen', 'community-weekday-after-the-play', 'docent-renaissance', 'docent-baroque', 'docent-rococo', 'docent-neoclassicism', 'docent-regency', 'docent-victoria', 'docent-art-nouveau', 'docent-art-deco', 'docent-beat-generation', 'docent-counterculture', 'docent-digital', 'community-topics', 'community-weekday', 'treasures', 'community-general', 'community-qna', 'community-performances', 'attendance', 'polls', 'event-notices', 'monthly-events'
));

insert into page_modules (page_id, module_type, board_id, settings, sort_order) select id, 'hero', null, jsonb_build_object('title','경제 클럽','subtitle','살롱데상 · Community · 주제별 소통','description','경제 클럽 게시판입니다.','breadcrumb','[{"label":"홈","href":"/"},{"label":"살롱데상"},{"label":"Community","href":"/community"},{"label":"주제별 소통","href":"/community/topics"},{"label":"경제 클럽"}]'::jsonb), 0 from page_builder where slug = 'community-topics-economy';

insert into page_modules (page_id, module_type, board_id, settings, sort_order) select id, 'board', '6ad97043-0c75-4c9c-9f67-dd3f24f50e5e', '{}'::jsonb, 1 from page_builder where slug = 'community-topics-economy';

insert into page_modules (page_id, module_type, board_id, settings, sort_order) select id, 'hero', null, jsonb_build_object('title','예술 클럽','subtitle','살롱데상 · Community · 주제별 소통','description','예술 클럽 게시판입니다.','breadcrumb','[{"label":"홈","href":"/"},{"label":"살롱데상"},{"label":"Community","href":"/community"},{"label":"주제별 소통","href":"/community/topics"},{"label":"예술 클럽"}]'::jsonb), 0 from page_builder where slug = 'community-topics-art';

insert into page_modules (page_id, module_type, board_id, settings, sort_order) select id, 'board', '8a03b831-692c-40eb-b87d-97cf0294ce69', '{}'::jsonb, 1 from page_builder where slug = 'community-topics-art';

insert into page_modules (page_id, module_type, board_id, settings, sort_order) select id, 'hero', null, jsonb_build_object('title','세계역사 클럽','subtitle','살롱데상 · Community · 주제별 소통','description','세계역사 클럽 게시판입니다.','breadcrumb','[{"label":"홈","href":"/"},{"label":"살롱데상"},{"label":"Community","href":"/community"},{"label":"주제별 소통","href":"/community/topics"},{"label":"세계역사 클럽"}]'::jsonb), 0 from page_builder where slug = 'community-topics-world-history';

insert into page_modules (page_id, module_type, board_id, settings, sort_order) select id, 'board', '35d06411-6957-4e82-a144-3fe8651191e1', '{}'::jsonb, 1 from page_builder where slug = 'community-topics-world-history';

insert into page_modules (page_id, module_type, board_id, settings, sort_order) select id, 'hero', null, jsonb_build_object('title','과학 클럽','subtitle','살롱데상 · Community · 주제별 소통','description','과학 클럽 게시판입니다.','breadcrumb','[{"label":"홈","href":"/"},{"label":"살롱데상"},{"label":"Community","href":"/community"},{"label":"주제별 소통","href":"/community/topics"},{"label":"과학 클럽"}]'::jsonb), 0 from page_builder where slug = 'community-topics-science';

insert into page_modules (page_id, module_type, board_id, settings, sort_order) select id, 'board', '6152cbaa-c8d7-44a1-ac4c-a0a418aef5ce', '{}'::jsonb, 1 from page_builder where slug = 'community-topics-science';

insert into page_modules (page_id, module_type, board_id, settings, sort_order) select id, 'hero', null, jsonb_build_object('title','코메디 클럽','subtitle','살롱데상 · Community · 주제별 소통','description','코메디 클럽 게시판입니다.','breadcrumb','[{"label":"홈","href":"/"},{"label":"살롱데상"},{"label":"Community","href":"/community"},{"label":"주제별 소통","href":"/community/topics"},{"label":"코메디 클럽"}]'::jsonb), 0 from page_builder where slug = 'community-topics-comedy';

insert into page_modules (page_id, module_type, board_id, settings, sort_order) select id, 'board', '77110fdd-18e3-4ce4-9c46-4a7dd2434ce4', '{}'::jsonb, 1 from page_builder where slug = 'community-topics-comedy';

insert into page_modules (page_id, module_type, board_id, settings, sort_order) select id, 'hero', null, jsonb_build_object('title','문학 클럽','subtitle','살롱데상 · Community · 주제별 소통','description','문학 클럽 게시판입니다.','breadcrumb','[{"label":"홈","href":"/"},{"label":"살롱데상"},{"label":"Community","href":"/community"},{"label":"주제별 소통","href":"/community/topics"},{"label":"문학 클럽"}]'::jsonb), 0 from page_builder where slug = 'community-topics-literature';

insert into page_modules (page_id, module_type, board_id, settings, sort_order) select id, 'board', '7d2fa3f8-1b52-42a7-88dd-2337b79f606b', '{}'::jsonb, 1 from page_builder where slug = 'community-topics-literature';

insert into page_modules (page_id, module_type, board_id, settings, sort_order) select id, 'hero', null, jsonb_build_object('title','건강 클럽','subtitle','살롱데상 · Community · 주제별 소통','description','건강 클럽 게시판입니다.','breadcrumb','[{"label":"홈","href":"/"},{"label":"살롱데상"},{"label":"Community","href":"/community"},{"label":"주제별 소통","href":"/community/topics"},{"label":"건강 클럽"}]'::jsonb), 0 from page_builder where slug = 'community-topics-health';

insert into page_modules (page_id, module_type, board_id, settings, sort_order) select id, 'board', 'bbaac6c2-ac4b-44ca-bdb0-e424231825e6', '{}'::jsonb, 1 from page_builder where slug = 'community-topics-health';

insert into page_modules (page_id, module_type, board_id, settings, sort_order) select id, 'hero', null, jsonb_build_object('title','정치 클럽','subtitle','살롱데상 · Community · 주제별 소통','description','정치 클럽 게시판입니다.','breadcrumb','[{"label":"홈","href":"/"},{"label":"살롱데상"},{"label":"Community","href":"/community"},{"label":"주제별 소통","href":"/community/topics"},{"label":"정치 클럽"}]'::jsonb), 0 from page_builder where slug = 'community-topics-politics';

insert into page_modules (page_id, module_type, board_id, settings, sort_order) select id, 'board', '19898353-7be7-4715-93fa-bd3a37051583', '{}'::jsonb, 1 from page_builder where slug = 'community-topics-politics';

insert into page_modules (page_id, module_type, board_id, settings, sort_order) select id, 'hero', null, jsonb_build_object('title','영화 클럽','subtitle','살롱데상 · Community · 주제별 소통','description','영화 클럽 게시판입니다.','breadcrumb','[{"label":"홈","href":"/"},{"label":"살롱데상"},{"label":"Community","href":"/community"},{"label":"주제별 소통","href":"/community/topics"},{"label":"영화 클럽"}]'::jsonb), 0 from page_builder where slug = 'community-topics-movie';

insert into page_modules (page_id, module_type, board_id, settings, sort_order) select id, 'board', 'e1ece7bb-81aa-4738-bfd5-b53bd57aeecd', '{}'::jsonb, 1 from page_builder where slug = 'community-topics-movie';

insert into page_modules (page_id, module_type, board_id, settings, sort_order) select id, 'hero', null, jsonb_build_object('title','심리 클럽','subtitle','살롱데상 · Community · 주제별 소통','description','심리 클럽 게시판입니다.','breadcrumb','[{"label":"홈","href":"/"},{"label":"살롱데상"},{"label":"Community","href":"/community"},{"label":"주제별 소통","href":"/community/topics"},{"label":"심리 클럽"}]'::jsonb), 0 from page_builder where slug = 'community-topics-psychology';

insert into page_modules (page_id, module_type, board_id, settings, sort_order) select id, 'board', '5b76ed4c-0f20-4175-8196-10197cbb2d1e', '{}'::jsonb, 1 from page_builder where slug = 'community-topics-psychology';

insert into page_modules (page_id, module_type, board_id, settings, sort_order) select id, 'hero', null, jsonb_build_object('title','스포츠 클럽','subtitle','살롱데상 · Community · 주제별 소통','description','스포츠 클럽 게시판입니다.','breadcrumb','[{"label":"홈","href":"/"},{"label":"살롱데상"},{"label":"Community","href":"/community"},{"label":"주제별 소통","href":"/community/topics"},{"label":"스포츠 클럽"}]'::jsonb), 0 from page_builder where slug = 'community-topics-sports';

insert into page_modules (page_id, module_type, board_id, settings, sort_order) select id, 'board', '36c5c652-2dd9-4b34-b3e6-58b3eafcb113', '{}'::jsonb, 1 from page_builder where slug = 'community-topics-sports';

insert into page_modules (page_id, module_type, board_id, settings, sort_order) select id, 'hero', null, jsonb_build_object('title','인간 집사들 클럽','subtitle','살롱데상 · Community · 주제별 소통','description','인간 집사들 클럽 게시판입니다.','breadcrumb','[{"label":"홈","href":"/"},{"label":"살롱데상"},{"label":"Community","href":"/community"},{"label":"주제별 소통","href":"/community/topics"},{"label":"인간 집사들 클럽"}]'::jsonb), 0 from page_builder where slug = 'community-topics-pet-owners';

insert into page_modules (page_id, module_type, board_id, settings, sort_order) select id, 'board', '7b7df043-292e-4808-999e-35b39412f02b', '{}'::jsonb, 1 from page_builder where slug = 'community-topics-pet-owners';

insert into page_modules (page_id, module_type, board_id, settings, sort_order) select id, 'hero', null, jsonb_build_object('title','따듯한 세상 클럽','subtitle','살롱데상 · Community · 주제별 소통','description','따듯한 세상 클럽 게시판입니다.','breadcrumb','[{"label":"홈","href":"/"},{"label":"살롱데상"},{"label":"Community","href":"/community"},{"label":"주제별 소통","href":"/community/topics"},{"label":"따듯한 세상 클럽"}]'::jsonb), 0 from page_builder where slug = 'community-topics-warm-world';

insert into page_modules (page_id, module_type, board_id, settings, sort_order) select id, 'board', '409f6463-1e32-4c93-af21-add36cde0ec7', '{}'::jsonb, 1 from page_builder where slug = 'community-topics-warm-world';

insert into page_modules (page_id, module_type, board_id, settings, sort_order) select id, 'hero', null, jsonb_build_object('title','월요반란 클럽 모임방','subtitle','살롱데상 · Community · 요일별 모임','description','월요반란 클럽 모임방 게시판입니다.','breadcrumb','[{"label":"홈","href":"/"},{"label":"살롱데상"},{"label":"Community","href":"/community"},{"label":"요일별 모임","href":"/community/weekday"},{"label":"월요반란 클럽 모임방"}]'::jsonb), 0 from page_builder where slug = 'community-weekday-monday';

insert into page_modules (page_id, module_type, board_id, settings, sort_order) select id, 'board', '60fac912-479b-43f7-9c9f-3fa430c2d290', '{}'::jsonb, 1 from page_builder where slug = 'community-weekday-monday';

insert into page_modules (page_id, module_type, board_id, settings, sort_order) select id, 'hero', null, jsonb_build_object('title','책 낭송 클럽 모임방','subtitle','살롱데상 · Community · 요일별 모임','description','책 낭송 클럽 모임방 게시판입니다.','breadcrumb','[{"label":"홈","href":"/"},{"label":"살롱데상"},{"label":"Community","href":"/community"},{"label":"요일별 모임","href":"/community/weekday"},{"label":"책 낭송 클럽 모임방"}]'::jsonb), 0 from page_builder where slug = 'community-weekday-book';

insert into page_modules (page_id, module_type, board_id, settings, sort_order) select id, 'board', '552c4a76-d360-4641-a2f5-52866ac6d8b7', '{}'::jsonb, 1 from page_builder where slug = 'community-weekday-book';

insert into page_modules (page_id, module_type, board_id, settings, sort_order) select id, 'hero', null, jsonb_build_object('title','행간의 조각가 모임방','subtitle','살롱데상 · Community · 요일별 모임','description','행간의 조각가 모임방 게시판입니다.','breadcrumb','[{"label":"홈","href":"/"},{"label":"살롱데상"},{"label":"Community","href":"/community"},{"label":"요일별 모임","href":"/community/weekday"},{"label":"행간의 조각가 모임방"}]'::jsonb), 0 from page_builder where slug = 'community-weekday-between-lines';

insert into page_modules (page_id, module_type, board_id, settings, sort_order) select id, 'board', '2852eafb-9d67-404f-a0ab-b20dde1f21f7', '{}'::jsonb, 1 from page_builder where slug = 'community-weekday-between-lines';

insert into page_modules (page_id, module_type, board_id, settings, sort_order) select id, 'hero', null, jsonb_build_object('title','놀아보자 영어클럽 모임방','subtitle','살롱데상 · Community · 요일별 모임','description','놀아보자 영어클럽 모임방 게시판입니다.','breadcrumb','[{"label":"홈","href":"/"},{"label":"살롱데상"},{"label":"Community","href":"/community"},{"label":"요일별 모임","href":"/community/weekday"},{"label":"놀아보자 영어클럽 모임방"}]'::jsonb), 0 from page_builder where slug = 'community-weekday-english-play';

insert into page_modules (page_id, module_type, board_id, settings, sort_order) select id, 'board', 'dfb601f3-f000-43f1-a1c6-71d32e80c92e', '{}'::jsonb, 1 from page_builder where slug = 'community-weekday-english-play';

insert into page_modules (page_id, module_type, board_id, settings, sort_order) select id, 'hero', null, jsonb_build_object('title','비포 선라이즈 소셜클럽 모임방','subtitle','살롱데상 · Community · 요일별 모임','description','비포 선라이즈 소셜클럽 모임방 게시판입니다.','breadcrumb','[{"label":"홈","href":"/"},{"label":"살롱데상"},{"label":"Community","href":"/community"},{"label":"요일별 모임","href":"/community/weekday"},{"label":"비포 선라이즈 소셜클럽 모임방"}]'::jsonb), 0 from page_builder where slug = 'community-weekday-before-sunrise';

insert into page_modules (page_id, module_type, board_id, settings, sort_order) select id, 'board', 'f4721f4b-96cf-4452-abe1-6ed0dbe26b15', '{}'::jsonb, 1 from page_builder where slug = 'community-weekday-before-sunrise';

insert into page_modules (page_id, module_type, board_id, settings, sort_order) select id, 'hero', null, jsonb_build_object('title','무슨일이든 일어날수있어 클럽 모임방','subtitle','살롱데상 · Community · 요일별 모임','description','무슨일이든 일어날수있어 클럽 모임방 게시판입니다.','breadcrumb','[{"label":"홈","href":"/"},{"label":"살롱데상"},{"label":"Community","href":"/community"},{"label":"요일별 모임","href":"/community/weekday"},{"label":"무슨일이든 일어날수있어 클럽 모임방"}]'::jsonb), 0 from page_builder where slug = 'community-weekday-anything-can-happen';

insert into page_modules (page_id, module_type, board_id, settings, sort_order) select id, 'board', '0292cdf6-2fe4-40a7-be34-27544f7a3cd9', '{}'::jsonb, 1 from page_builder where slug = 'community-weekday-anything-can-happen';

insert into page_modules (page_id, module_type, board_id, settings, sort_order) select id, 'hero', null, jsonb_build_object('title','연극이 끝나고 난 뒤 클럽 모임방','subtitle','살롱데상 · Community · 요일별 모임','description','연극이 끝나고 난 뒤 클럽 모임방 게시판입니다.','breadcrumb','[{"label":"홈","href":"/"},{"label":"살롱데상"},{"label":"Community","href":"/community"},{"label":"요일별 모임","href":"/community/weekday"},{"label":"연극이 끝나고 난 뒤 클럽 모임방"}]'::jsonb), 0 from page_builder where slug = 'community-weekday-after-the-play';

insert into page_modules (page_id, module_type, board_id, settings, sort_order) select id, 'board', '841ec465-a34f-4bd5-8ecc-13a8912e3a3c', '{}'::jsonb, 1 from page_builder where slug = 'community-weekday-after-the-play';

insert into page_modules (page_id, module_type, board_id, settings, sort_order) select id, 'hero', null, jsonb_build_object('title','Renaissance','subtitle','사일로상점 · Online Docent','description','1350~1600 Renaissance 시대 온라인 도슨트 콘텐츠입니다.','breadcrumb','[{"label":"홈","href":"/"},{"label":"사일로상점"},{"label":"Online Docent","href":"/docent"},{"label":"Renaissance"}]'::jsonb), 0 from page_builder where slug = 'docent-renaissance';

insert into page_modules (page_id, module_type, board_id, settings, sort_order) select id, 'text', null, jsonb_build_object('text', 'Renaissance(1350~1600) 시대의 큐레이션 콘텐츠가 이 자리에 곧 추가됩니다.'), 1 from page_builder where slug = 'docent-renaissance';

insert into page_modules (page_id, module_type, board_id, settings, sort_order) select id, 'hero', null, jsonb_build_object('title','Baroque','subtitle','사일로상점 · Online Docent','description','1600~1750 Baroque 시대 온라인 도슨트 콘텐츠입니다.','breadcrumb','[{"label":"홈","href":"/"},{"label":"사일로상점"},{"label":"Online Docent","href":"/docent"},{"label":"Baroque"}]'::jsonb), 0 from page_builder where slug = 'docent-baroque';

insert into page_modules (page_id, module_type, board_id, settings, sort_order) select id, 'text', null, jsonb_build_object('text', 'Baroque(1600~1750) 시대의 큐레이션 콘텐츠가 이 자리에 곧 추가됩니다.'), 1 from page_builder where slug = 'docent-baroque';

insert into page_modules (page_id, module_type, board_id, settings, sort_order) select id, 'hero', null, jsonb_build_object('title','Rococo','subtitle','사일로상점 · Online Docent','description','1715~1780 Rococo 시대 온라인 도슨트 콘텐츠입니다.','breadcrumb','[{"label":"홈","href":"/"},{"label":"사일로상점"},{"label":"Online Docent","href":"/docent"},{"label":"Rococo"}]'::jsonb), 0 from page_builder where slug = 'docent-rococo';

insert into page_modules (page_id, module_type, board_id, settings, sort_order) select id, 'text', null, jsonb_build_object('text', 'Rococo(1715~1780) 시대의 큐레이션 콘텐츠가 이 자리에 곧 추가됩니다.'), 1 from page_builder where slug = 'docent-rococo';

insert into page_modules (page_id, module_type, board_id, settings, sort_order) select id, 'hero', null, jsonb_build_object('title','NeoClassicism','subtitle','사일로상점 · Online Docent','description','1750~1850 NeoClassicism 시대 온라인 도슨트 콘텐츠입니다.','breadcrumb','[{"label":"홈","href":"/"},{"label":"사일로상점"},{"label":"Online Docent","href":"/docent"},{"label":"NeoClassicism"}]'::jsonb), 0 from page_builder where slug = 'docent-neoclassicism';

insert into page_modules (page_id, module_type, board_id, settings, sort_order) select id, 'text', null, jsonb_build_object('text', 'NeoClassicism(1750~1850) 시대의 큐레이션 콘텐츠가 이 자리에 곧 추가됩니다.'), 1 from page_builder where slug = 'docent-neoclassicism';

insert into page_modules (page_id, module_type, board_id, settings, sort_order) select id, 'hero', null, jsonb_build_object('title','Regency','subtitle','사일로상점 · Online Docent','description','1795~1837 Regency 시대 온라인 도슨트 콘텐츠입니다.','breadcrumb','[{"label":"홈","href":"/"},{"label":"사일로상점"},{"label":"Online Docent","href":"/docent"},{"label":"Regency"}]'::jsonb), 0 from page_builder where slug = 'docent-regency';

insert into page_modules (page_id, module_type, board_id, settings, sort_order) select id, 'text', null, jsonb_build_object('text', 'Regency(1795~1837) 시대의 큐레이션 콘텐츠가 이 자리에 곧 추가됩니다.'), 1 from page_builder where slug = 'docent-regency';

insert into page_modules (page_id, module_type, board_id, settings, sort_order) select id, 'hero', null, jsonb_build_object('title','Victoria','subtitle','사일로상점 · Online Docent','description','1837~1901 Victoria 시대 온라인 도슨트 콘텐츠입니다.','breadcrumb','[{"label":"홈","href":"/"},{"label":"사일로상점"},{"label":"Online Docent","href":"/docent"},{"label":"Victoria"}]'::jsonb), 0 from page_builder where slug = 'docent-victoria';

insert into page_modules (page_id, module_type, board_id, settings, sort_order) select id, 'text', null, jsonb_build_object('text', 'Victoria(1837~1901) 시대의 큐레이션 콘텐츠가 이 자리에 곧 추가됩니다.'), 1 from page_builder where slug = 'docent-victoria';

insert into page_modules (page_id, module_type, board_id, settings, sort_order) select id, 'hero', null, jsonb_build_object('title','Art Nouveau','subtitle','사일로상점 · Online Docent','description','1890~1920 Art Nouveau 시대 온라인 도슨트 콘텐츠입니다.','breadcrumb','[{"label":"홈","href":"/"},{"label":"사일로상점"},{"label":"Online Docent","href":"/docent"},{"label":"Art Nouveau"}]'::jsonb), 0 from page_builder where slug = 'docent-art-nouveau';

insert into page_modules (page_id, module_type, board_id, settings, sort_order) select id, 'text', null, jsonb_build_object('text', 'Art Nouveau(1890~1920) 시대의 큐레이션 콘텐츠가 이 자리에 곧 추가됩니다.'), 1 from page_builder where slug = 'docent-art-nouveau';

insert into page_modules (page_id, module_type, board_id, settings, sort_order) select id, 'hero', null, jsonb_build_object('title','Art Deco','subtitle','사일로상점 · Online Docent','description','1920~1940 Art Deco 시대 온라인 도슨트 콘텐츠입니다.','breadcrumb','[{"label":"홈","href":"/"},{"label":"사일로상점"},{"label":"Online Docent","href":"/docent"},{"label":"Art Deco"}]'::jsonb), 0 from page_builder where slug = 'docent-art-deco';

insert into page_modules (page_id, module_type, board_id, settings, sort_order) select id, 'text', null, jsonb_build_object('text', 'Art Deco(1920~1940) 시대의 큐레이션 콘텐츠가 이 자리에 곧 추가됩니다.'), 1 from page_builder where slug = 'docent-art-deco';

insert into page_modules (page_id, module_type, board_id, settings, sort_order) select id, 'hero', null, jsonb_build_object('title','Beat Generation','subtitle','사일로상점 · Online Docent','description','1940~1960 Beat Generation 시대 온라인 도슨트 콘텐츠입니다.','breadcrumb','[{"label":"홈","href":"/"},{"label":"사일로상점"},{"label":"Online Docent","href":"/docent"},{"label":"Beat Generation"}]'::jsonb), 0 from page_builder where slug = 'docent-beat-generation';

insert into page_modules (page_id, module_type, board_id, settings, sort_order) select id, 'text', null, jsonb_build_object('text', 'Beat Generation(1940~1960) 시대의 큐레이션 콘텐츠가 이 자리에 곧 추가됩니다.'), 1 from page_builder where slug = 'docent-beat-generation';

insert into page_modules (page_id, module_type, board_id, settings, sort_order) select id, 'hero', null, jsonb_build_object('title','CounterCulture','subtitle','사일로상점 · Online Docent','description','1960~1980 CounterCulture 시대 온라인 도슨트 콘텐츠입니다.','breadcrumb','[{"label":"홈","href":"/"},{"label":"사일로상점"},{"label":"Online Docent","href":"/docent"},{"label":"CounterCulture"}]'::jsonb), 0 from page_builder where slug = 'docent-counterculture';

insert into page_modules (page_id, module_type, board_id, settings, sort_order) select id, 'text', null, jsonb_build_object('text', 'CounterCulture(1960~1980) 시대의 큐레이션 콘텐츠가 이 자리에 곧 추가됩니다.'), 1 from page_builder where slug = 'docent-counterculture';

insert into page_modules (page_id, module_type, board_id, settings, sort_order) select id, 'hero', null, jsonb_build_object('title','Digital','subtitle','사일로상점 · Online Docent','description','1960~1980 Digital 시대 온라인 도슨트 콘텐츠입니다.','breadcrumb','[{"label":"홈","href":"/"},{"label":"사일로상점"},{"label":"Online Docent","href":"/docent"},{"label":"Digital"}]'::jsonb), 0 from page_builder where slug = 'docent-digital';

insert into page_modules (page_id, module_type, board_id, settings, sort_order) select id, 'text', null, jsonb_build_object('text', 'Digital(1960~1980) 시대의 큐레이션 콘텐츠가 이 자리에 곧 추가됩니다.'), 1 from page_builder where slug = 'docent-digital';

insert into page_modules (page_id, module_type, board_id, settings, sort_order) select id, 'hero', null, jsonb_build_object('title','주제별 소통','subtitle','살롱데상 · Community','description','주제별 소통 게시판 목록입니다. 관심 있는 주제를 선택해 대화에 참여해 보세요.','breadcrumb','[{"label":"홈","href":"/"},{"label":"살롱데상"},{"label":"Community","href":"/community"},{"label":"주제별 소통"}]'::jsonb), 0 from page_builder where slug = 'community-topics';

insert into page_modules (page_id, module_type, board_id, settings, sort_order) select id, 'application', null, jsonb_build_object('actions', jsonb_build_array(jsonb_build_object('label','경제 클럽','href','/community/topics/economy'))), 1 from page_builder where slug = 'community-topics';

insert into page_modules (page_id, module_type, board_id, settings, sort_order) select id, 'application', null, jsonb_build_object('actions', jsonb_build_array(jsonb_build_object('label','예술 클럽','href','/community/topics/art'))), 2 from page_builder where slug = 'community-topics';

insert into page_modules (page_id, module_type, board_id, settings, sort_order) select id, 'application', null, jsonb_build_object('actions', jsonb_build_array(jsonb_build_object('label','세계역사 클럽','href','/community/topics/world-history'))), 3 from page_builder where slug = 'community-topics';

insert into page_modules (page_id, module_type, board_id, settings, sort_order) select id, 'application', null, jsonb_build_object('actions', jsonb_build_array(jsonb_build_object('label','과학 클럽','href','/community/topics/science'))), 4 from page_builder where slug = 'community-topics';

insert into page_modules (page_id, module_type, board_id, settings, sort_order) select id, 'application', null, jsonb_build_object('actions', jsonb_build_array(jsonb_build_object('label','코메디 클럽','href','/community/topics/comedy'))), 5 from page_builder where slug = 'community-topics';

insert into page_modules (page_id, module_type, board_id, settings, sort_order) select id, 'application', null, jsonb_build_object('actions', jsonb_build_array(jsonb_build_object('label','문학 클럽','href','/community/topics/literature'))), 6 from page_builder where slug = 'community-topics';

insert into page_modules (page_id, module_type, board_id, settings, sort_order) select id, 'application', null, jsonb_build_object('actions', jsonb_build_array(jsonb_build_object('label','건강 클럽','href','/community/topics/health'))), 7 from page_builder where slug = 'community-topics';

insert into page_modules (page_id, module_type, board_id, settings, sort_order) select id, 'application', null, jsonb_build_object('actions', jsonb_build_array(jsonb_build_object('label','정치 클럽','href','/community/topics/politics'))), 8 from page_builder where slug = 'community-topics';

insert into page_modules (page_id, module_type, board_id, settings, sort_order) select id, 'application', null, jsonb_build_object('actions', jsonb_build_array(jsonb_build_object('label','영화 클럽','href','/community/topics/movie'))), 9 from page_builder where slug = 'community-topics';

insert into page_modules (page_id, module_type, board_id, settings, sort_order) select id, 'application', null, jsonb_build_object('actions', jsonb_build_array(jsonb_build_object('label','심리 클럽','href','/community/topics/psychology'))), 10 from page_builder where slug = 'community-topics';

insert into page_modules (page_id, module_type, board_id, settings, sort_order) select id, 'application', null, jsonb_build_object('actions', jsonb_build_array(jsonb_build_object('label','스포츠 클럽','href','/community/topics/sports'))), 11 from page_builder where slug = 'community-topics';

insert into page_modules (page_id, module_type, board_id, settings, sort_order) select id, 'application', null, jsonb_build_object('actions', jsonb_build_array(jsonb_build_object('label','인간 집사들 클럽','href','/community/topics/pet-owners'))), 12 from page_builder where slug = 'community-topics';

insert into page_modules (page_id, module_type, board_id, settings, sort_order) select id, 'application', null, jsonb_build_object('actions', jsonb_build_array(jsonb_build_object('label','따듯한 세상 클럽','href','/community/topics/warm-world'))), 13 from page_builder where slug = 'community-topics';

insert into page_modules (page_id, module_type, board_id, settings, sort_order) select id, 'hero', null, jsonb_build_object('title','요일별 모임','subtitle','살롱데상 · Community','description','요일별로 열리는 클럽 모임 목록입니다.','breadcrumb','[{"label":"홈","href":"/"},{"label":"살롱데상"},{"label":"Community","href":"/community"},{"label":"요일별 모임"}]'::jsonb), 0 from page_builder where slug = 'community-weekday';

insert into page_modules (page_id, module_type, board_id, settings, sort_order) select id, 'application', null, jsonb_build_object('actions', jsonb_build_array(jsonb_build_object('label','월요반란 클럽 모임방','href','/community/weekday/monday'))), 1 from page_builder where slug = 'community-weekday';

insert into page_modules (page_id, module_type, board_id, settings, sort_order) select id, 'application', null, jsonb_build_object('actions', jsonb_build_array(jsonb_build_object('label','책 낭송 클럽 모임방','href','/community/weekday/book'))), 2 from page_builder where slug = 'community-weekday';

insert into page_modules (page_id, module_type, board_id, settings, sort_order) select id, 'application', null, jsonb_build_object('actions', jsonb_build_array(jsonb_build_object('label','행간의 조각가 모임방','href','/community/weekday/between-lines'))), 3 from page_builder where slug = 'community-weekday';

insert into page_modules (page_id, module_type, board_id, settings, sort_order) select id, 'application', null, jsonb_build_object('actions', jsonb_build_array(jsonb_build_object('label','놀아보자 영어클럽 모임방','href','/community/weekday/english-play'))), 4 from page_builder where slug = 'community-weekday';

insert into page_modules (page_id, module_type, board_id, settings, sort_order) select id, 'application', null, jsonb_build_object('actions', jsonb_build_array(jsonb_build_object('label','비포 선라이즈 소셜클럽 모임방','href','/community/weekday/before-sunrise'))), 5 from page_builder where slug = 'community-weekday';

insert into page_modules (page_id, module_type, board_id, settings, sort_order) select id, 'application', null, jsonb_build_object('actions', jsonb_build_array(jsonb_build_object('label','무슨일이든 일어날수있어 클럽 모임방','href','/community/weekday/anything-can-happen'))), 6 from page_builder where slug = 'community-weekday';

insert into page_modules (page_id, module_type, board_id, settings, sort_order) select id, 'application', null, jsonb_build_object('actions', jsonb_build_array(jsonb_build_object('label','연극이 끝나고 난 뒤 클럽 모임방','href','/community/weekday/after-the-play'))), 7 from page_builder where slug = 'community-weekday';

insert into page_modules (page_id, module_type, board_id, settings, sort_order) select id, 'hero', null, jsonb_build_object('title','사일로 보물들','subtitle','사일로상점','description','사일로상점의 보물 목록과 분양 후 이야기를 모아보는 허브입니다.','breadcrumb','[{"label":"홈","href":"/"},{"label":"사일로상점"},{"label":"사일로 보물들"}]'::jsonb), 0 from page_builder where slug = 'treasures';

insert into page_modules (page_id, module_type, board_id, settings, sort_order) select id, 'application', null, jsonb_build_object('actions', jsonb_build_array(jsonb_build_object('label','보물 목록','href','/shop'))), 1 from page_builder where slug = 'treasures';

insert into page_modules (page_id, module_type, board_id, settings, sort_order) select id, 'board', '9645e2c9-fb60-423a-a024-a4e56d41dd68', '{}'::jsonb, 2 from page_builder where slug = 'treasures';

insert into page_modules (page_id, module_type, board_id, settings, sort_order) select id, 'hero', null, jsonb_build_object('title','자유게시판','subtitle','살롱데상 · Community','description','자유롭게 이야기 나누는 게시판입니다.','breadcrumb','[{"label":"홈","href":"/"},{"label":"살롱데상"},{"label":"Community","href":"/community"},{"label":"자유게시판"}]'::jsonb), 0 from page_builder where slug = 'community-general';

insert into page_modules (page_id, module_type, board_id, settings, sort_order) select id, 'board', 'b0f009f3-6982-4d3c-959a-76e5386b9c34', '{}'::jsonb, 1 from page_builder where slug = 'community-general';

insert into page_modules (page_id, module_type, board_id, settings, sort_order) select id, 'hero', null, jsonb_build_object('title','Q&A','subtitle','살롱데상 · Community','description','궁금한 점을 묻고 답하는 게시판입니다.','breadcrumb','[{"label":"홈","href":"/"},{"label":"살롱데상"},{"label":"Community","href":"/community"},{"label":"Q&A"}]'::jsonb), 0 from page_builder where slug = 'community-qna';

insert into page_modules (page_id, module_type, board_id, settings, sort_order) select id, 'board', '2af851de-05d2-4150-8005-238cfe11147a', '{}'::jsonb, 1 from page_builder where slug = 'community-qna';

insert into page_modules (page_id, module_type, board_id, settings, sort_order) select id, 'hero', null, jsonb_build_object('title','공연 / 전시회 소개','subtitle','살롱데상 · Community','description','커뮤니티 회원들의 공연/전시회 소식을 소개합니다.','breadcrumb','[{"label":"홈","href":"/"},{"label":"살롱데상"},{"label":"Community","href":"/community"},{"label":"공연 / 전시회 소개"}]'::jsonb), 0 from page_builder where slug = 'community-performances';

insert into page_modules (page_id, module_type, board_id, settings, sort_order) select id, 'text', null, jsonb_build_object('text', '공연/전시회 소식이 이 자리에 곧 추가됩니다.'), 1 from page_builder where slug = 'community-performances';

