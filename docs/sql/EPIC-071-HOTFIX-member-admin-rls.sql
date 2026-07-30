-- EPIC-071-HOTFIX: members 테이블에 직접 추가했던 admin-bypass RLS
-- 정책(members_admin_select/update)이 자기 자신(members)을 서브쿼리하는
-- 구조라 Postgres 무한 재귀(42P17)를 유발했다 — 사용자가 이미 아래 두
-- DROP은 긴급 조치로 먼저 실행 완료(사이트 복구됨):
--   drop policy if exists "members_admin_select" on members;
--   drop policy if exists "members_admin_update" on members;
--
-- 이 파일은 "관리자는 전체 회원 조회/수정 가능"을 재귀 없이 안전하게
-- 다시 구현한다 — CLAUDE.md에 이미 기록돼 있던 것과 동일한 종류의
-- gotcha(정책 대상과 같은 테이블을 서브쿼리하면 재귀)를 이번에 또
-- 밟았다. 표준 해법: SECURITY DEFINER 함수로 admin 여부를 확인하면,
-- 함수 내부 쿼리는 함수 소유자(테이블 소유자 = postgres, RLS 대상 아님)
-- 권한으로 실행되어 RLS를 타지 않으므로 재귀 고리 자체가 생기지 않는다.

-- 1. 재귀 없는 admin 확인 함수. search_path를 명시해 함수 하이재킹을
--    방지하고, STABLE로 표시해 같은 트랜잭션 내 재평가를 캐싱한다.
create or replace function is_current_user_admin()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select coalesce(
    (select is_admin from members where auth_user_id = auth.uid()),
    false
  );
$$;

grant execute on function is_current_user_admin() to authenticated;

-- 2. members 테이블 정책 — 이번엔 함수를 통해서만 admin 여부를 확인한다
--    (members를 직접 서브쿼리하지 않음).
drop policy if exists "members_admin_select" on members;
create policy "members_admin_select" on members
  for select
  using (is_current_user_admin());

drop policy if exists "members_admin_update" on members;
create policy "members_admin_update" on members
  for update
  using (is_current_user_admin())
  with check (is_current_user_admin());
