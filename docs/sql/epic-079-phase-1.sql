-- =====================================================================
-- EPIC-079-PHASE-1 — Tiptap Editor & Post CRUD Stabilization
-- Supabase SQL Editor에서 직접 실행 (Management API로도 실행 가능).
-- idempotent(재실행 안전)하게 작성했다.
--
-- 배경: 라이브 DB를 점검한 결과 docs/sql/epic-053-1.sql이 실제로는 한
-- 번도 적용되지 않은 상태였다(posts.body_json 등 전부 미존재, Storage
-- 버킷도 0개) — "임베드/이미지 업로드가 안 된다"는 증상 대부분이 여기서
-- 비롯됐다. 게다가 docs/database-schema.sql이 문서화한 posts.tags/
-- view_count/updated_at조차 라이브에는 없었다(별도 마이그레이션 파일도
-- 없었음 — EPIC-047 Board Engine 때 SQL Editor 적용이 누락된 것으로 보임).
-- 이 파일은 (1) epic-053-1.sql 전체 재적용 (2) 누락된 기본 컬럼 3개 보강
-- (3) EPIC-079 신규 컬럼(카테고리/썸네일 노출) (4) 글 수정이 실제로는
-- 한 번도 성공한 적 없었던 근본 원인(컬럼 UPDATE 권한 자체가 없었음)
-- 수정 (5) 글 삭제 RLS 정책 신설을 한 번에 담는다.
-- =====================================================================


-- =====================================================================
-- PART 0 — epic-053-1.sql 재적용 (원본 그대로, idempotent)
-- =====================================================================

create table if not exists member_bucket_list (
  id          uuid primary key default gen_random_uuid(),
  member_id   uuid not null references members(id) on delete cascade,
  year        int not null,
  title       text not null,
  is_done     boolean not null default false,
  created_at  timestamptz not null default now()
);

create index if not exists idx_member_bucket_list_member on member_bucket_list(member_id);

alter table member_bucket_list enable row level security;

drop policy if exists "member_bucket_list_select_own" on member_bucket_list;
create policy "member_bucket_list_select_own"
  on member_bucket_list for select
  using (member_id in (select id from members where auth_user_id = auth.uid()));

drop policy if exists "member_bucket_list_insert_own" on member_bucket_list;
create policy "member_bucket_list_insert_own"
  on member_bucket_list for insert
  with check (member_id in (select id from members where auth_user_id = auth.uid()));

drop policy if exists "member_bucket_list_update_own" on member_bucket_list;
create policy "member_bucket_list_update_own"
  on member_bucket_list for update
  using (member_id in (select id from members where auth_user_id = auth.uid()))
  with check (member_id in (select id from members where auth_user_id = auth.uid()));

drop policy if exists "member_bucket_list_delete_own" on member_bucket_list;
create policy "member_bucket_list_delete_own"
  on member_bucket_list for delete
  using (member_id in (select id from members where auth_user_id = auth.uid()));

alter table posts add column if not exists body_json jsonb;
alter table posts add column if not exists featured_image_url text;
alter table posts add column if not exists featured_image_path text;

comment on column posts.body_json is 'Tiptap(ProseMirror) JSON 문서 — EPIC-053.1부터 정본. body(HTML)는 이로부터 파생된 렌더링 캐시.';
comment on column posts.featured_image_url is '게시판 썸네일에 쓰이는 대표 이미지 public URL.';
comment on column posts.featured_image_path is '대표 이미지의 Storage path (교체/삭제 시 필요).';

alter table posts drop constraint if exists posts_visibility_check;
alter table posts add constraint posts_visibility_check
  check (visibility in ('public','private','friends','draft'));

create table if not exists image_cleanup_queue (
  id              uuid primary key default gen_random_uuid(),
  storage_bucket  text not null,
  storage_path    text not null,
  reason          text not null check (reason in ('post_deleted','image_replaced','post_edited_orphan')),
  related_post_id uuid references posts(id) on delete set null,
  created_at      timestamptz not null default now(),
  deleted_at      timestamptz
);

create index if not exists idx_image_cleanup_queue_pending
  on image_cleanup_queue(created_at) where deleted_at is null;

alter table image_cleanup_queue enable row level security;

drop policy if exists "image_cleanup_queue_insert_own_post" on image_cleanup_queue;
create policy "image_cleanup_queue_insert_own_post"
  on image_cleanup_queue for insert
  with check (
    related_post_id is null
    or exists (
      select 1 from posts
      where posts.id = related_post_id
        and posts.author_id in (select id from members where auth_user_id = auth.uid())
    )
  );

drop policy if exists "image_cleanup_queue_admin_select" on image_cleanup_queue;
create policy "image_cleanup_queue_admin_select"
  on image_cleanup_queue for select
  using (exists (select 1 from members where auth_user_id = auth.uid() and is_admin = true));

drop policy if exists "image_cleanup_queue_admin_update" on image_cleanup_queue;
create policy "image_cleanup_queue_admin_update"
  on image_cleanup_queue for update
  using (exists (select 1 from members where auth_user_id = auth.uid() and is_admin = true))
  with check (exists (select 1 from members where auth_user_id = auth.uid() and is_admin = true));

insert into storage.buckets (id, name, public)
values
  ('post-images', 'post-images', true),
  ('gallery', 'gallery', true),
  ('attachments', 'attachments', true)
on conflict (id) do update set public = true;

drop policy if exists "block_editor_buckets_public_read" on storage.objects;
create policy "block_editor_buckets_public_read"
  on storage.objects for select
  using (bucket_id in ('post-images', 'gallery', 'attachments'));

drop policy if exists "block_editor_buckets_authenticated_upload" on storage.objects;
create policy "block_editor_buckets_authenticated_upload"
  on storage.objects for insert
  with check (
    bucket_id in ('post-images', 'gallery', 'attachments')
    and auth.role() = 'authenticated'
  );

drop policy if exists "block_editor_buckets_admin_delete" on storage.objects;
create policy "block_editor_buckets_admin_delete"
  on storage.objects for delete
  using (
    bucket_id in ('post-images', 'gallery', 'attachments')
    and exists (select 1 from members where auth_user_id = auth.uid() and is_admin = true)
  );

drop policy if exists "block_editor_buckets_owner_delete" on storage.objects;
create policy "block_editor_buckets_owner_delete"
  on storage.objects for delete
  using (
    bucket_id in ('post-images', 'gallery', 'attachments')
    and owner = auth.uid()
  );


-- =====================================================================
-- PART 1 — docs/database-schema.sql가 이미 문서화했지만 라이브에는 없던
-- 기본 컬럼 3개 보강 (tags/view_count/updated_at) — 별도 마이그레이션
-- 파일이 없었던 것으로 보아 EPIC-047 Board Engine 적용 시 SQL Editor
-- 실행이 누락된 것으로 추정.
-- =====================================================================

alter table posts add column if not exists tags text[] not null default '{}'::text[];
alter table posts add column if not exists view_count int not null default 0;
alter table posts add column if not exists updated_at timestamptz not null default now();


-- =====================================================================
-- PART 2 — EPIC-079 신규 컬럼: 썸네일 노출 토글 / 카테고리
-- =====================================================================

alter table posts add column if not exists thumbnail_visible boolean not null default true;
alter table posts add column if not exists category text;

comment on column posts.thumbnail_visible is 'EPIC-079: 목록/카드에서 대표 이미지를 보여줄지 여부 — false면 featured_image_url이 있어도 썸네일을 렌더링하지 않는다.';
comment on column posts.category is 'EPIC-079: 게시판별 고정 카테고리 목록(src/lib/boardLayout.ts) 중 하나 — 정규화 테이블 없이 자유 텍스트로 저장.';


-- =====================================================================
-- PART 3 — posts UPDATE 권한 보강 + 소유자 보호
--
-- 라이브 DB의 기존 GRANT는 authenticated에게 like_count/is_best 두
-- 컬럼만 UPDATE를 허용하고 있었다 — title/body 등은 애초에 권한
-- 자체가 없어 "글 수정이 안 됨" 버그의 실제 원인이었다(코드 버그가
-- 아니라 인프라 누락). 아래에서 필요한 컬럼에 GRANT를 추가한다.
--
-- 다만 posts의 기존 UPDATE 정책("posts update like fields")은
-- using(true)/with_check(true)로, 좋아요 기능을 위해 의도적으로 모든
-- 사용자가 모든 글을 "행 단위로는" 건드릴 수 있게 열려 있다(라이브
-- 확인 완료). RLS는 permissive 정책들을 OR로 합치므로, 이 정책이 있는
-- 한 title/body 등에 GRANT만 추가하면 "행 접근"은 이미 true라서 다른
-- 소유자 전용 정책을 별도로 추가해도 행 단위로는 막을 수 없다(Postgres
-- RLS는 컬럼별이 아니라 명령문 전체에 대해 행 가시성을 판정) — 즉
-- GRANT만으로는 "본인 글만 제목/본문 수정 가능"을 강제할 수 없다.
--
-- 따라서 컬럼별 진짜 소유권 검증은 BEFORE UPDATE 트리거로 수행한다
-- (CLAUDE.md의 is_current_user_admin() SECURITY DEFINER 패턴과 동일한
-- 이유로 SECURITY DEFINER 사용 — members 자기 참조 재귀 방지).
-- =====================================================================

grant update (
  title, body, body_json, featured_image_url, featured_image_path,
  is_docent_post, tags, updated_at, category, thumbnail_visible
) on posts to authenticated;

-- view_count는 로그인 여부와 무관하게(비로그인 방문자 포함) 조회 시마다
-- 증가해야 하므로 anon에도 grant한다 — like_count/is_best와 동일하게
-- "누구나 이 컬럼만은 건드릴 수 있음" 그룹에 속한다.
grant update (view_count) on posts to authenticated, anon;

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
  then
    raise exception 'permission denied: only the post author or an admin can edit this content';
  end if;

  return new;
end;
$$;

drop trigger if exists posts_protect_content_columns_trg on posts;
create trigger posts_protect_content_columns_trg
  before update on posts
  for each row
  execute function posts_protect_content_columns();


-- =====================================================================
-- PART 4 — 글 삭제 RLS 정책 (지금까지 DELETE 정책이 아예 없어 전면 차단
-- 상태였다 — DELETE 권한(GRANT) 자체는 이미 authenticated에 존재).
-- comments/likes는 FK ON DELETE CASCADE로 이미 함께 삭제된다(확인 완료).
-- =====================================================================

drop policy if exists "posts_delete_own_or_admin" on posts;
create policy "posts_delete_own_or_admin"
  on posts for delete
  using (
    author_id in (select id from members where auth_user_id = auth.uid())
    or exists (select 1 from members where auth_user_id = auth.uid() and is_admin = true)
  );
