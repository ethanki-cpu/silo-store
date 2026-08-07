-- EPIC-087-PHASE-D: 회원관리 화면의 "티어별 접근 권한 매트릭스"가
-- membership_tiers의 기존 boolean 플래그(board_write_scope 등)를 직접
-- supabase.from("membership_tiers").update(...)로 편집할 수 있어야 하는데,
-- 이 테이블은 지금까지 공개 SELECT 정책만 있고 쓰기 정책이 전혀 없었다
-- (CLAUDE.md의 boards_admin_write와 동일한 관례로 admin bypass 추가).
-- 이미 Management API로 즉시 실행 완료(라이브 반영됨, 2026-08-07).

create policy "membership_tiers_admin_write" on membership_tiers for update
  using (exists (select 1 from members where auth_user_id = auth.uid() and is_admin = true))
  with check (exists (select 1 from members where auth_user_id = auth.uid() and is_admin = true));
