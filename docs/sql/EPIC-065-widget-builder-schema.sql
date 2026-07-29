-- EPIC-065: Visual Widget Builder — 스키마 변경 2건.
-- 사용자가 제공한 Supabase Management API 토큰으로 이미 직접 실행
-- 완료했다(2026-07-29) — 이 파일은 기록용이며, 재실행해도 안전하다
-- (drop constraint if exists / add column if not exists).

-- 1. module_type CHECK 제약 제거 — 위젯 종류가 23개로 늘어났고 앞으로도
--    늘어날 수 있어(팔레트 확장), 매번 마이그레이션이 필요한 고정 목록
--    대신 애플리케이션 코드(src/lib/widgetSchema.ts의 PAGE_MODULE_TYPES)가
--    유효성을 검증한다.
alter table page_modules drop constraint if exists page_modules_module_type_check;

-- 2. 위젯 "숨기기" 기능용 컬럼 — true면 공개 페이지(PageBuilderRenderer)에서
--    빠지고 관리자 화면(Live Preview)에서만 흐리게 계속 보인다.
alter table page_modules add column if not exists is_hidden boolean not null default false;
