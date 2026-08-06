-- EPIC-083: Admin이 업로드한 커스텀 폰트(.woff2/.ttf 등) 메타데이터.
--
-- 실제 폰트 파일은 EPIC-082의 R2 Direct Upload 파이프라인
-- (POST /api/media/presigned)을 통해 Cloudflare R2에 저장되고, 이 테이블은
-- 그 R2 CDN URL만 가리킨다(media_library와 동일한 사고방식 — 이 테이블
-- 자체는 바이너리를 담지 않는다). 에디터/글 상세 페이지는 이 테이블의
-- 행 목록을 읽어 브라우저에 @font-face 규칙을 동적으로 주입한다
-- (src/lib/useCustomFonts.ts).

create table custom_fonts (
  id          uuid primary key default gen_random_uuid(),
  font_name   text not null,          -- font-family로 쓸 이름 (예: "MyBrandFont")
  font_url    text not null,          -- R2 Public CDN URL
  file_format text not null,          -- 'woff2' | 'woff' | 'ttf' | 'otf' (@font-face format() 힌트)
  created_at  timestamptz not null default now()
);

create unique index idx_custom_fonts_font_name on custom_fonts(font_name);

alter table custom_fonts enable row level security;

-- SELECT: 모든 유저(비로그인 포함) 조회 가능 — 에디터 폰트 드롭다운과 글
-- 상세 페이지 렌더링(@font-face 주입) 둘 다 공개 페이지에서 동작해야 한다
-- (media_library와 동일한 패턴, CLAUDE.md "Public read" 참고).
create policy "custom_fonts_select_all"
  on custom_fonts for select
  using (true);

-- INSERT/UPDATE/DELETE: 관리자만 — 폰트 업로드는 Admin 전용 기능이라
-- media_library(본인 or 관리자)와 달리 "본인" 경로가 없다. members 테이블을
-- 참조하는 이 subquery는 custom_fonts 자신을 참조하지 않으므로(자기 참조
-- 재귀 문제, CLAUDE.md 기존 gotcha와 무관) 일반 subquery로 충분히 안전하다.
create policy "custom_fonts_insert_admin"
  on custom_fonts for insert
  with check (
    exists (
      select 1 from members
      where members.auth_user_id = auth.uid() and members.is_admin = true
    )
  );

create policy "custom_fonts_update_admin"
  on custom_fonts for update
  using (
    exists (
      select 1 from members
      where members.auth_user_id = auth.uid() and members.is_admin = true
    )
  );

create policy "custom_fonts_delete_admin"
  on custom_fonts for delete
  using (
    exists (
      select 1 from members
      where members.auth_user_id = auth.uid() and members.is_admin = true
    )
  );
