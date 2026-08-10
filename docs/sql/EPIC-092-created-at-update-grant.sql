-- EPIC-092(요구사항 1): 관리자가 게시글의 "등록 날짜/시간"(posts.created_at)을
-- 직접 수정할 수 있게 됐는데, authenticated 역할에는 이 컬럼의 UPDATE 권한이
-- 한 번도 GRANT된 적이 없었다(created_at은 지금까지 INSERT 시점 DB 기본값
-- (now())으로만 채워지고 이후 절대 UPDATE되지 않는 컬럼이었음) — CLAUDE.md의
-- "Column-scoped write via GRANT, not just RLS" 패턴과 동일한 이유로,
-- RLS(row-level) 정책은 통과해도 컬럼 단위 GRANT가 없으면 Postgres가
-- "permission denied for column created_at"(42501)로 UPDATE 자체를 막는다.
-- 실사용 중 "글 수정에 실패했어요"로만 보이던 것을 Management API로 직접
-- 재현 확인(information_schema.column_privileges 조회 결과 created_at에만
-- UPDATE 권한이 빠져 있었음, title/body/tags 등 나머지 컬럼은 전부 있었음).

grant update (created_at) on public.posts to authenticated;
