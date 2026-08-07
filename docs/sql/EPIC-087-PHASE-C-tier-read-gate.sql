-- EPIC-087-PHASE-C: 페이지/게시판별 최소 열람 티어. 이미 있는
-- boards.min_rank_to_write(쓰기 게이트)의 읽기판 — null이면 게이트 없음
-- (기존과 동일하게 전체 공개). page_builder에는 이 개념 자체가 없었다.
-- 이미 Management API로 즉시 실행 완료(라이브 반영됨, 2026-08-07).

alter table boards
  add column if not exists min_rank_to_read int references membership_tiers(rank);

alter table page_builder
  add column if not exists min_rank_to_read int references membership_tiers(rank);
