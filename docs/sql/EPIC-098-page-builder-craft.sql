-- EPIC-098: 홈페이지 전용 Craft.js 빌더(Two-Track) — page_builder에 엔진 분기
-- 플래그와 Craft.js 직렬화 상태 컬럼을 추가한다. 기존 모든 페이지는
-- builder_type 기본값 'native'라 코드 경로가 전혀 바뀌지 않는다(회귀 없음).
-- craft_state는 Craft.js query.serialize()가 만드는 JSON 문자열을 그대로
-- jsonb에 저장 — 관리자가 아직 한 번도 저장하지 않은 페이지는 null(공개/
-- 관리자 렌더러 둘 다 Default State 스켈레톤으로 폴백). 이미 Management
-- API로 즉시 실행 완료(라이브 반영됨, 2026-08-13).

alter table page_builder add column if not exists builder_type text not null default 'native'
  check (builder_type in ('native', 'craft'));

alter table page_builder add column if not exists craft_state jsonb;

-- page_builder에 slug='home' 행이 지금까지 아예 없었다(src/app/page.tsx의
-- fetchPublishedPageBySlug("home")가 null을 돌려받아 항상 조용히 폴백하고
-- 있었음 — 홈페이지에 Page Builder 모듈을 붙인 적이 실제로는 한 번도 없었다).
-- EPIC-098부터 홈페이지가 Craft 엔진을 쓰므로 이 시점에 처음 행을 만든다.
insert into page_builder (slug, title, description, status, builder_type)
  select 'home', '홈', '사일로 스토어 홈페이지 (Craft.js 에디토리얼 빌더)', 'published', 'craft'
  where not exists (select 1 from page_builder where slug = 'home');
