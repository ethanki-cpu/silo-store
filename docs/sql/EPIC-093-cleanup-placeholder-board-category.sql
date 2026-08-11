-- EPIC-093(요구사항 1.4): "+ 새 게시판 추가"(src/app/admin/pages/[id]/page.tsx)가
-- 관리자가 이름을 정하기 전 임시로 채워 넣는 category 값(`new-board-<8자리>`)이
-- 정식 카테고리로 남아 게시글 태그로 그대로 노출되던 문제의 DB측 정리.
--
-- 프론트엔드는 src/lib/boardLayout.ts의 isRealBoardCategory()로 이미 이 패턴을
-- 걸러내도록 수정됐다(같은 커밋) — 이 스크립트는 DB에 남은 잔재 자체를
-- 청소해 admin 화면(예: /admin/site-structure)에서도 지저분한 값이 안 보이게
-- 한다. board_type이 이미 "topic"이고 category만 임시값인 8개 게시판을
-- 확인함(이름은 전부 정상적으로 바뀌어 있었음, name="새 게시판" 기본값으로
-- 남은 것은 없었음) — category만 NULL로 되돌린다(resolveBoardDefinition은
-- category가 null이어도 topic으로 안전하게 폴백하므로 동작 영향 없음).
--
-- 2026-08-11, Claude Code 자동 write가 세션의 안전 classifier에 의해
-- 차단되어(파괴적 UPDATE로 분류) 실행하지 못함 — 사용자가 Supabase SQL
-- Editor 또는 Management API로 직접 실행 필요.
--
-- 추가로(요구사항 1.3 Clean URL) — boards.slug도 처음 만들어질 때 이
-- 임시 category 값을 그대로 물려받아(`new-board-<8자리>`) URL
-- (/boards/[board_slug])에 그대로 노출되고 있었다(예:
-- /boards/new-board-5e95b289). 이름은 이미 다들 제대로 바뀌어 있으므로
-- name 기준으로 slug를 다시 만든다 — 라틴 문자가 전혀 없는 순수 한글
-- 이름은 slugify가 빈 문자열을 반환하므로(기존 EPIC-079-PHASE-2 백필과
-- 동일한 계약) id 앞 8자리로 폴백한다(완전히 안 예쁘진 않지만 최소한
-- 더 이상 "new-board-"로 시작하는 임시값은 아니다). 8개 전부 기존
-- slug 목록과 충돌하지 않음을 조회로 확인했다.

update boards set category = null, slug = '138f9bdf' where id = '138f9bdf-af7d-4f2f-bf4f-88bb9ad652d3'; -- 사일로 타임라인
update boards set category = null, slug = 'silo-s-exhibition' where id = '4b95e493-baec-45c7-8476-846cbb012137'; -- 사일로의 전시 Silo's Exhibition
update boards set category = null, slug = 'last-photos' where id = '59b5924f-8748-4c11-9786-6831599fb70c'; -- 보내기 전 마지막 사진들 last photos
update boards set category = null, slug = 'ethan-s-bluenotes' where id = '7380f325-3886-4c01-9b55-93b50da0c86f'; -- Ethan's Bluenotes 에단의 블루노트들
update boards set category = null, slug = 'af06e86e' where id = 'af06e86e-595a-4421-a271-9af70b7023fb'; -- 사일로의 운명적 만남들
update boards set category = null, slug = 'impressionism-club' where id = 'bc85cc32-23d7-43e1-bfa7-990cafa7597a'; -- 인상파 impressionism (plain "impressionism"은 나중을 위해 비워둠)
update boards set category = null, slug = 'silo-daily' where id = 'cec162a4-4bc3-409c-8f2e-737d9986abe6'; -- silo-daily
update boards set category = null, slug = 'silo-story' where id = 'eaabc9f6-1ecd-4b50-a12e-24db9d04a6a8'; -- Silo Story 사일로 이야기

-- 검증: 아래는 0행이어야 한다.
select id, name, slug, category from boards where slug ~ '^new-board-' or category ~ '^new-board-';
