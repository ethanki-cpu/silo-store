-- EPIC-085: Frictionless Archiving — 원클릭 스크랩(북마크) 테이블.
--
-- 기존 post_bookmarks(EPIC-047 설계, member_id FK)는 애초에 라이브 DB에
-- 한 번도 마이그레이션되지 않아(/api/boards/[board_slug]/posts/[post_slug]/bookmark
-- 가 select 시도 시 항상 503) 실제로는 죽은 기능이었다 — 이 EPIC이 그
-- 자리를 user_scraps로 대체한다(PostActions.tsx의 "북마크" 버튼을
-- ScrapButton으로 교체, CHANGELOG.md EPIC-085 참고).
--
-- user_id는 members.id가 아니라 auth.users(id)를 직접 참조한다(요청 스펙의
-- "auth.uid() = user_id" RLS를 그대로 만족시키기 위함) — 이 프로젝트의
-- 다른 "본인 소유" 테이블 대부분은 member_id(members.id)를 쓰지만, 여기서는
-- getRequestMember()가 반환하는 userId(= auth.uid())를 그대로 저장한다.

create table if not exists user_scraps (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  post_id uuid not null references posts(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (user_id, post_id)
);

create index if not exists user_scraps_user_id_idx on user_scraps(user_id);
create index if not exists user_scraps_post_id_idx on user_scraps(post_id);

alter table user_scraps enable row level security;

-- 본인 스크랩만 조회/생성/삭제 가능 — 다른 테이블의 own-row 패턴과 동일하게
-- select/insert/delete 세 정책으로 분리한다(update는 이 테이블에 의미가
-- 없어 정책을 만들지 않음 — 토글은 항상 insert/delete로만 이루어짐).
create policy user_scraps_select_own
  on user_scraps for select
  using (auth.uid() = user_id);

create policy user_scraps_insert_own
  on user_scraps for insert
  with check (auth.uid() = user_id);

create policy user_scraps_delete_own
  on user_scraps for delete
  using (auth.uid() = user_id);
