-- EPIC-161: 게시판별 멤버십 권한 매트릭스 — min_rank_to_read/write 2개뿐이던
-- 게이팅을 게시글 열람/댓글/좋아요/북마크까지 독립된 최소 등급으로 세분화하고,
-- 완독 뱃지 대상 등급을 지정할 수 있는 컬럼을 추가한다. 전부 nullable, 기본값
-- NULL = 게이트 없음(기존 동작 그대로) — 관리자가 /admin/board-permissions에서
-- 값을 채워 넣기 전까지는 아무 것도 바뀌지 않는다.

alter table boards
  add column if not exists min_rank_to_view_post integer references membership_tiers(rank),
  add column if not exists min_rank_to_comment integer references membership_tiers(rank),
  add column if not exists min_rank_to_like integer references membership_tiers(rank),
  add column if not exists min_rank_to_bookmark integer references membership_tiers(rank),
  add column if not exists badge_min_rank integer references membership_tiers(rank);
