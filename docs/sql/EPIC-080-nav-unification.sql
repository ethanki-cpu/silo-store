-- EPIC-080: Navigation Dual-Structure Unification
--
-- 1) 할머니/할아버지 nav 링크를 "준비 중" 정적 placeholder(이번에 삭제된
--    /shop/heritage/grandma·grandpa, next.config.ts에서 301 리다이렉트 처리됨)
--    대신 실제 게시판에 연결된 Page Builder 페이지로 갱신한다.
update site_navigations set href = '/heritage/grandmas' where id = '88ecbd7b-e700-4a24-941d-53a3b6e72038';
update site_navigations set href = '/heritage/grandpas' where id = '37f2b93e-15ed-43ce-a3c8-66dc1801f9d8';

-- 2) 과거 dual-nav 혼선으로 site_navigations의 "미분류 페이지" 버킷에
--    남아있던 그림자 항목(is_active=false) 17개 삭제 — 전부 위 1)이나
--    기존에 이미 활성 상태인 다른 nav 항목(/salon/*, /downloads 등)과
--    내용이 겹치는 정적 placeholder였다(대응하는 page.tsx 파일은 이미
--    삭제 완료, redirects()로 301 처리됨). 삭제해도 page_builder 테이블의
--    실제 콘텐츠 행은 건드리지 않는다(site_navigations는 별도 nav-tree
--    북마크 테이블일 뿐).
delete from site_navigations where id in (
  '8ce53df9-0fe8-4a50-a546-0469f92c5914', -- Archive Brochure (/archive-brochure)
  '6ae66fed-a9a6-4307-93a8-bbdaecf1bb45', -- Archive Posters (/archive-posters)
  'f54d65fc-dcfd-4c39-8ea2-7fedac07148e', -- Community Club Name (/community-club-name, 동적 라우트 삭제됨)
  '463ec9b8-8dbe-4382-8b96-0b1c1b22a573', -- Gallery Awards (/gallery-awards)
  'd5eb96f8-b872-4412-8fac-a029177a4d3d', -- Gallery Parties (/gallery-parties)
  '4ba7cd51-22d0-46cd-a01d-d0acfacb2792', -- Gallery Patrons (/gallery-patrons)
  'c1a6e24c-7456-4731-8d8c-f8638efc6984', -- Gallery Performance (/gallery-performance)
  'bac5a942-49e2-415b-93e7-bd0bbae4245f', -- Gallery Visitors (/gallery-visitors)
  'd3214c7c-f1b3-4d30-8f6e-26e1d9d4d179', -- Heritage Grandma Name (/heritage-grandma-name, 동적 라우트 삭제됨)
  '028adc86-49ce-456f-a92a-eeb4fa6f7e79', -- Heritage Grandmas (/heritage-grandmas, dash-form 중복 — 실제 목적지는 /heritage/grandmas)
  '2490d757-06e6-4c02-acdb-cd54e36804f4', -- Heritage Grandpa Name (/heritage-grandpa-name, 동적 라우트 삭제됨)
  '467e2571-106b-4786-bd69-8d4dc3e12b88', -- Heritage Grandpas (/heritage-grandpas, dash-form 중복)
  'b7b24fc1-196e-421c-a3d5-cd0b648c835b', -- Membership Artist Intro (/membership-artist-intro)
  '2fefa419-6fa5-472e-9413-0e494dc16425', -- Membership Mind Diary (/membership-mind-diary)
  'f31fd12a-9c01-4b2e-996a-237608e1aa5e', -- Membership My Treasures (/membership-my-treasures)
  '55641568-87d7-4fc2-8ae5-f2f0309abed2', -- Membership One Sentence Novel (/membership-one-sentence-novel)
  '0272da0a-8b7f-463b-8ede-778021048751'  -- Membership Secret Room (/membership-secret-room)
);

-- 검증 쿼리 (실행 후 결과가 0행이어야 정상):
-- select id, title, href from site_navigations where href in (
--   '/shop/heritage/grandma','/shop/heritage/grandpa','/archive-brochure','/archive-posters',
--   '/community-club-name','/gallery-awards','/gallery-parties','/gallery-patrons',
--   '/gallery-performance','/gallery-visitors','/heritage-grandma-name','/heritage-grandmas',
--   '/heritage-grandpa-name','/heritage-grandpas','/membership-artist-intro','/membership-mind-diary',
--   '/membership-my-treasures','/membership-one-sentence-novel','/membership-secret-room'
-- );
