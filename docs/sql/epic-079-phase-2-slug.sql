-- =====================================================================
-- EPIC-079-PHASE-2 — Slug 기반 게시판/게시글 라우팅
-- Supabase SQL Editor에서 직접 실행 (Management API로도 실행 가능).
-- idempotent(재실행 안전)하게 작성했다.
--
-- 배경: `/boards/7a84e647.../9edbcf50...` 형태의 UUID URL을
-- `/boards/[board_slug]/[post_slug]`로 바꾸기 위해 boards/posts에 각각
-- slug 컬럼을 추가하고 기존 행을 백필한다.
--
-- 설계:
--   - boards.slug: 전역 UNIQUE, NOT NULL. 기존 boards.category가 이미
--     resolveBoardDefinition()의 조회 키(사실상 slug 역할)로 쓰이고
--     있었지만 nullable/자유 텍스트라 그대로 라우팅 키로 승격하기엔
--     불안정해(중복/null 존재) 별도 컬럼으로 분리한다. category는 건드리지
--     않는다(BOARD_DEFINITIONS 매칭에 계속 쓰임).
--   - posts.slug: (board_id, slug) 복합 UNIQUE — 게시판마다 독립된
--     네임스페이스(같은 slug라도 다른 게시판이면 허용).
--   - 한글 제목 등 라틴 알파벳/숫자가 없는 경우 slugify 결과가 빈
--     문자열이 될 수 있어, 그 경우 id 앞 8자리로 폴백한다.
-- =====================================================================


-- =====================================================================
-- PART 0 — slugify 헬퍼 함수 (마이그레이션 백필 + 필요 시 애플리케이션에서도
-- 재사용 가능하도록 DB 함수로 둔다. STABLE — 부작용 없음)
-- =====================================================================

create or replace function slugify(input text)
returns text
language sql
immutable
as $$
  select trim(both '-' from regexp_replace(lower(coalesce(input, '')), '[^a-z0-9]+', '-', 'g'));
$$;


-- =====================================================================
-- PART 1 — boards.slug
-- =====================================================================

alter table boards add column if not exists slug text;

comment on column boards.slug is 'EPIC-079-PHASE-2: URL 라우팅 키(/boards/[slug]) — 전역 UNIQUE. category와 달리 항상 값이 있다.';

-- 백필: category가 이미 slug 형태로 쓰이고 있었으면 그대로(slugify만 적용),
-- 아니면 name을 slugify. 결과가 비면(한글 등) id 앞 8자리로 폴백한다.
-- 같은 값이 여러 행에서 나오면 뒤에 -2, -3 ... 을 붙여 유일하게 만든다.
do $$
declare
  r record;
  base text;
  candidate text;
  suffix int;
begin
  for r in
    select id, name, category
    from boards
    where slug is null
    order by id
  loop
    base := nullif(slugify(coalesce(r.category, r.name)), '');
    if base is null then
      base := left(r.id::text, 8);
    end if;

    candidate := base;
    suffix := 1;
    while exists (select 1 from boards where slug = candidate and id <> r.id) loop
      suffix := suffix + 1;
      candidate := base || '-' || suffix;
    end loop;

    update boards set slug = candidate where id = r.id;
  end loop;
end $$;

alter table boards alter column slug set not null;

drop index if exists boards_slug_unique_idx;
create unique index boards_slug_unique_idx on boards(slug);


-- =====================================================================
-- PART 2 — posts.slug
-- =====================================================================

alter table posts add column if not exists slug text;

comment on column posts.slug is 'EPIC-079-PHASE-2: URL 라우팅 키(/boards/[board_slug]/[slug]) — 같은 board_id 내에서 UNIQUE. 제목 slugify + 충돌 시 -2, -3... 접미사, 그래도 비면(한글 제목 등) id 앞 8자리로 폴백.';

do $$
declare
  r record;
  base text;
  candidate text;
  suffix int;
begin
  for r in
    select id, board_id, title
    from posts
    where slug is null
    order by created_at nulls last, id
  loop
    base := nullif(slugify(r.title), '');
    if base is null then
      base := left(r.id::text, 8);
    end if;

    candidate := base;
    suffix := 1;
    while exists (
      select 1 from posts
      where board_id = r.board_id and slug = candidate and id <> r.id
    ) loop
      suffix := suffix + 1;
      candidate := base || '-' || suffix;
    end loop;

    update posts set slug = candidate where id = r.id;
  end loop;
end $$;

alter table posts alter column slug set not null;

drop index if exists posts_board_slug_unique_idx;
create unique index posts_board_slug_unique_idx on posts(board_id, slug);


-- =====================================================================
-- PART 3 — posts.slug 쓰기 권한 + 소유자 보호(epic-079-phase-1.sql의
-- posts_protect_content_columns 트리거/GRANT와 동일한 패턴에 slug를 추가)
-- =====================================================================

grant update (slug) on posts to authenticated;

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
     or new.slug is distinct from old.slug
  then
    raise exception 'permission denied: only the post author or an admin can edit this content';
  end if;

  return new;
end;
$$;

-- 트리거 자체는 epic-079-phase-1.sql에서 이미 생성됨(함수만 교체하면
-- 트리거는 그대로 새 함수 본문을 사용한다) — 여기서 재생성할 필요 없음.
