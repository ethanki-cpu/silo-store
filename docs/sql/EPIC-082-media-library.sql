-- EPIC-082: Universal Media Library Schema
--
-- 플랫폼 전체(에디터/갤러리/히어로 위젯 등)가 공유하는 중앙 집권형 미디어
-- 메타데이터 테이블. 실제 이진 파일은 Cloudflare R2에 저장되고(Direct
-- Upload, src/app/api/media/presigned/route.ts), 이 테이블은 그 R2 객체를
-- 가리키는 메타데이터(URL/크기/치수/재생시간/alt 텍스트)만 관리한다 —
-- Supabase Storage와 달리 이 테이블 자체는 바이너리를 담지 않는다.
--
-- 이번 EPIC은 스키마와 업로드 파이프라인만 만든다 — 기존 Tiptap
-- 에디터/게시글 노드가 이 테이블을 실제로 참조하도록 배선하는 것은
-- 범위 밖(다음 EPIC, docs/media-architecture.md 참고).

create table media_library (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid references auth.users(id) on delete set null,
  file_url    text not null,                 -- R2 Public CDN Access URL
  file_name   text not null,
  mime_type   text not null,                 -- 예: 'image/png', 'video/mp4'
  size_bytes  bigint not null,
  width       integer,                       -- 이미지/영상 가로(px), 없으면 null
  height      integer,                       -- 이미지/영상 세로(px), 없으면 null
  duration    integer,                       -- 영상 길이(초), 이미지는 null
  alt_text    text,                          -- 접근성/SEO
  created_at  timestamptz not null default now()
);

create index idx_media_library_user on media_library(user_id);
create index idx_media_library_created_at on media_library(created_at desc);

alter table media_library enable row level security;

-- SELECT: 모든 유저(비로그인 포함) 조회 가능 — 게시글/위젯이 공개
-- 페이지에서 미디어를 보여줘야 하므로 다른 공개 테이블(boards/items 등)과
-- 동일한 패턴(CLAUDE.md "Public read" 참고).
create policy "media_library_select_all"
  on media_library for select
  using (true);

-- INSERT/UPDATE/DELETE: 본인(auth.uid() = user_id) 또는 관리자만.
-- members 테이블을 참조하는 admin 체크는 media_library 자신을
-- 참조하지 않으므로(자기 참조 재귀 문제, CLAUDE.md 기존 gotcha와 무관)
-- 일반 subquery로 충분히 안전하다.
create policy "media_library_insert_own_or_admin"
  on media_library for insert
  with check (
    auth.uid() = user_id
    or exists (
      select 1 from members
      where members.auth_user_id = auth.uid() and members.is_admin = true
    )
  );

create policy "media_library_update_own_or_admin"
  on media_library for update
  using (
    auth.uid() = user_id
    or exists (
      select 1 from members
      where members.auth_user_id = auth.uid() and members.is_admin = true
    )
  );

create policy "media_library_delete_own_or_admin"
  on media_library for delete
  using (
    auth.uid() = user_id
    or exists (
      select 1 from members
      where members.auth_user_id = auth.uid() and members.is_admin = true
    )
  );
