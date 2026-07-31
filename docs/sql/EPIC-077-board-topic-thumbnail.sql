-- EPIC-077: "사이트 구성 관리" 통합 트리의 게시판 관리 모달에서, 게시판
-- 자체의 topic(주제/태그)/thumbnail_url(대표 이미지)을 연결된 site_navigations
-- 행의 동일 필드와 별개로 편집할 수 있게 한다(사용자 결정: nav 필드를
-- 재사용하지 않고 boards에 독립 컬럼을 둔다) — site_navigations.topic/
-- thumbnail_url과 동일한 타입으로 미러링.
--
-- 실행 방법: Supabase SQL Editor(또는 Management API)에서 그대로 실행
-- (재실행해도 안전 — `add column if not exists`).

alter table boards
  add column if not exists topic varchar,
  add column if not exists thumbnail_url text;
