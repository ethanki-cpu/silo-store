-- EPIC-071: ethanki@silostore.net을 관리자로 승격 + 관리자 회원 관리
-- 페이지(/admin/members)가 모든 회원 행을 조회/수정할 수 있도록
-- members 테이블에 admin-bypass RLS 정책 추가.
--
-- 안전성: UPDATE는 email로 특정 1행만 매칭(멱등, 재실행해도 안전).
-- RLS는 기존 orders/reservations/page_builder 등과 동일한 admin-bypass
-- 패턴 — own-row 정책은 그대로 두고 admin용 정책을 추가만 한다(Postgres가
-- 같은 command의 복수 permissive 정책을 OR로 합침). 셀프 참조(subquery가
-- 정책 대상과 같은 members 테이블)라도, 그 subquery는 호출자 자신의
-- 행(auth_user_id = auth.uid())만 찾으므로 기존 own-row select 정책으로
-- 즉시 해소되어 무한 재귀로 이어지지 않는다.

-- 1. 관리자 승격
update members set is_admin = true where email = 'ethanki@silostore.net';

-- 2. RLS — 관리자는 모든 회원 행을 조회/수정 가능해야 한다.
alter table members enable row level security;

drop policy if exists "members_admin_select" on members;
create policy "members_admin_select" on members
  for select
  using (
    exists (
      select 1 from members
      where members.auth_user_id = auth.uid() and members.is_admin = true
    )
  );

drop policy if exists "members_admin_update" on members;
create policy "members_admin_update" on members
  for update
  using (
    exists (
      select 1 from members
      where members.auth_user_id = auth.uid() and members.is_admin = true
    )
  )
  with check (
    exists (
      select 1 from members
      where members.auth_user_id = auth.uid() and members.is_admin = true
    )
  );
