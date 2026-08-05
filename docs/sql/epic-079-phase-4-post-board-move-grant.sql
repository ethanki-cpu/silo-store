-- EPIC-079-PHASE-4: 글 수정 폼에서 "게시될 페이지 선택"으로 다른
-- 게시판을 골라 글을 옮길 수 있게 됐다(src/app/api/boards/[board_slug]/
-- posts/[post_slug]/route.ts PATCH, targetBoardSlug) — 그런데 실제로
-- 시도해보니 500 "permission denied for table posts"로 실패했다.
--
-- 원인: docs/sql/epic-079-phase-1.sql의 PART 3에서 posts UPDATE 권한을
-- 컬럼 단위로 GRANT했는데(title/body/... 목록), 그 목록에 board_id가
-- 없다 — 지금까지 board_id는 INSERT 시점에만 정해지고 UPDATE로 바뀐 적이
-- 없었으니 당연히 빠져 있었다. 이 파일은 그 GRANT 목록에 board_id를
-- 추가하고, 소유자 검증 트리거(posts_protect_content_columns)의 보호 대상
-- 컬럼 목록에도 board_id를 추가한다 — 트리거에 추가하지 않으면 GRANT만
-- 열어준 순간 "본인 글이 아니어도 board_id만 바꾸는 건 걸리지 않는" 구멍이
-- 생긴다(트리거는 "보호 목록에 있는 컬럼이 바뀌었는지"로만 소유자를
-- 검사하므로).
--
-- 재실행 안전: grant는 누적 적용이라 여러 번 실행해도 안전하고,
-- create or replace function으로 트리거 함수도 안전하게 재적용된다.

grant update (board_id) on posts to authenticated;

create or replace function posts_protect_content_columns()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  is_owner boolean;
  is_admin_user boolean;
begin
  select exists(
    select 1 from members
    where auth_user_id = auth.uid() and id = new.author_id
  ) into is_owner;

  select exists(
    select 1 from members
    where auth_user_id = auth.uid() and is_admin = true
  ) into is_admin_user;

  if is_owner or is_admin_user then
    return new;
  end if;

  if new.title is distinct from old.title
     or new.body is distinct from old.body
     or new.body_json is distinct from old.body_json
     or new.featured_image_url is distinct from old.featured_image_url
     or new.featured_image_path is distinct from old.featured_image_path
     or new.is_docent_post is distinct from old.is_docent_post
     or new.tags is distinct from old.tags
     or new.category is distinct from old.category
     or new.thumbnail_visible is distinct from old.thumbnail_visible
     or new.board_id is distinct from old.board_id
  then
    raise exception 'permission denied: only the post author or an admin can edit this content';
  end if;

  return new;
end;
$$;

-- 함수 본문만 바뀌었을 뿐 트리거 자체(대상 테이블/시점/이름)는 그대로라
-- 재생성이 필수는 아니지만, epic-079-phase-1.sql과 동일한 패턴을 유지한다.
drop trigger if exists posts_protect_content_columns_trg on posts;
create trigger posts_protect_content_columns_trg
  before update on posts
  for each row
  execute function posts_protect_content_columns();
