-- =====================================================================
-- EPIC-053.1 — Block Editor 완성 작업용 스키마/Storage SQL
-- Supabase SQL Editor에서 직접 실행 (Management API 불필요).
-- 이 저장소는 마이그레이션 파일을 쓰지 않고 SQL Editor에 ad hoc으로
-- 적용하는 방식을 쓴다 (CLAUDE.md "Verifying/changing the DB schema" 참고).
-- 모든 문장은 idempotent(재실행 안전)하게 작성했다.
-- =====================================================================


-- ---------------------------------------------------------------------
-- 1. member_bucket_list (EPIC-052에서 테이블만 문서화되고 라이브 DB에는
--    미적용 상태였음 — 이번 세션에서 Management API 토큰이 없어 직접
--    실행은 못 했고, 아래 SQL을 사용자가 SQL Editor에서 실행해야 한다).
--    member_collections/wishlists와 동일한 own-row 전용 패턴.
-- ---------------------------------------------------------------------

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


-- ---------------------------------------------------------------------
-- 2. posts — Block Editor JSON 원본 저장 + 대표 이미지 컬럼 추가
--    (EPIC-053.1). body(HTML)는 삭제하지 않고 목록/검색/레거시 렌더링용
--    파생 캐시로 계속 둔다 — body_json이 정본(source of truth).
-- ---------------------------------------------------------------------

alter table posts add column if not exists body_json jsonb;
alter table posts add column if not exists featured_image_url text;
alter table posts add column if not exists featured_image_path text;

comment on column posts.body_json is 'Tiptap(ProseMirror) JSON 문서 — EPIC-053.1부터 정본. body(HTML)는 이로부터 파생된 렌더링 캐시.';
comment on column posts.featured_image_url is '게시판 썸네일에 쓰이는 대표 이미지 public URL.';
comment on column posts.featured_image_path is '대표 이미지의 Storage path (교체/삭제 시 필요).';

-- 임시저장(POST /api/boards/[id]/drafts)이 posts.visibility='draft'로 insert를
-- 시도하는데, 기존 CHECK 제약이 public/private/friends만 허용해 실제로는
-- 항상 23514 위반으로 실패하는 상태였다(운영 리뷰에서 발견, P1 참고).
-- 이 라우트를 실제로 쓰게 되는 시점에 대비해 제약만 넓혀둔다.
alter table posts drop constraint if exists posts_visibility_check;
alter table posts add constraint posts_visibility_check
  check (visibility in ('public','private','friends','draft'));


-- ---------------------------------------------------------------------
-- 3. 이미지 Garbage Collection 큐 (즉시 삭제 대신 큐에 적재 → 별도
--    Cleanup Job이 나중에 처리하는 구조 — EPIC-053.1 9번 항목).
-- ---------------------------------------------------------------------

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

-- 큐는 서버(Route Handler)에서 글쓴이 본인의 scopedClient로 적재하고,
-- 실제 삭제 처리는 관리자 전용 Cleanup 라우트에서 수행한다 — 이 앱은
-- service-role 키를 쓰지 않으므로(RLS 우회 없음) 관리자 조회/처리도
-- is_admin 기반 정책을 통과해야 한다.
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


-- ---------------------------------------------------------------------
-- 4. Storage Buckets — post-images / gallery / attachments
--    (src/lib/storage.ts STORAGE_BUCKETS와 1:1 대응)
-- ---------------------------------------------------------------------

insert into storage.buckets (id, name, public)
values
  ('post-images', 'post-images', true),
  ('gallery', 'gallery', true),
  ('attachments', 'attachments', true)
on conflict (id) do update set public = true;


-- ---------------------------------------------------------------------
-- 5. Storage Policies — 공개 읽기 + 로그인 사용자 업로드 + 관리자만 삭제.
--    이 앱은 service-role 키를 쓰지 않아(CLAUDE.md), Cleanup Job도 반드시
--    관리자 세션으로 도는 Route Handler를 통해서만 실제 삭제가 가능하다.
-- ---------------------------------------------------------------------

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

-- 업로드한 본인이 즉시 교체/삭제할 수 있어야 하는 UX(에디터에서 "삭제"
-- 버튼)를 위해, 위 관리자 전용 정책과 별도로 "본인이 방금 올린 파일"
-- 삭제를 허용하는 정책을 추가한다. Storage는 파일 소유자를 owner
-- 컬럼(auth.uid())으로 자동 기록하므로 이를 사용한다.
drop policy if exists "block_editor_buckets_owner_delete" on storage.objects;
create policy "block_editor_buckets_owner_delete"
  on storage.objects for delete
  using (
    bucket_id in ('post-images', 'gallery', 'attachments')
    and owner = auth.uid()
  );
