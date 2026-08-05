-- EPIC-079-PHASE-4: Unified Navigation Tree, Page Mapping & Edit Post Sync
--
-- 목적: site_navigations의 모든 노드(폴더로만 쓰이던 것 포함)가 반드시
-- page_builder 리소스를 갖도록 백필한다 — 관리자 UI가 "페이지 수정" 버튼을
-- 무조건 렌더링하도록 바뀌었는데(CategoryTreeManager.tsx), 그 버튼이 실제로
-- 가리킬 페이지가 없는 노드가 남아있으면 안 되기 때문. 이 스크립트는
-- src/lib/pageTemplates.ts의 ensurePageForSlug()가 하는 일(페이지 생성 +
-- 기본 위젯 5종 템플릿)을 기존 데이터에 대해 한 번에 적용하는 SQL 버전이다.
--
-- 재실행 안전: 1)은 href가 이미 있는 행은 건드리지 않고, 2)는
-- `on conflict (slug) do nothing`, 3)은 지금 막 새로 만든 페이지에만
-- (`newly_created` CTE) 위젯을 넣으므로 이미 위젯이 있던 기존 페이지는
-- 손대지 않는다 — 여러 번 실행해도 안전.

-- ============================================================
-- 1) href가 비어있는 노드에 고유 href를 채운다.
--    (CategoryTreeManager.tsx의 addChild()가 신규 생성 시 쓰는
--    `/c/{id}` 규칙과 동일 — hrefToSlug()가 이걸 "c-{id}" slug로 바꾼다.)
-- ============================================================
update site_navigations
set href = '/c/' || id::text
where href is null or btrim(href) = '';

-- ============================================================
-- 2) 각 노드의 href를 hrefToSlug()(src/lib/pageTemplates.ts)와 동일한
--    규칙으로 slug화해, 아직 없는 page_builder 행을 만든다.
--    JS 규칙: href.replace(/^\/+/, "").replace(/\/+$/, "").replace(/\//g, "-").toLowerCase() || "home"
-- ============================================================
with nav_slugs as (
  select
    n.id,
    n.title,
    n.description,
    coalesce(
      nullif(
        lower(regexp_replace(regexp_replace(regexp_replace(n.href, '^/+', ''), '/+$', ''), '/', '-', 'g')),
        ''
      ),
      'home'
    ) as slug
  from site_navigations n
),
distinct_new_slugs as (
  -- 같은 slug로 매핑되는 행이 여러 개면(href 충돌) 하나만 대표로 페이지를 만든다
  -- (page_builder.slug가 UNIQUE라 어차피 하나만 가능 — id 순으로 결정적 선택).
  select distinct on (slug) slug, title, description
  from nav_slugs
  where not exists (select 1 from page_builder pb where pb.slug = nav_slugs.slug)
  order by slug, id
)
insert into page_builder (slug, title, description, status)
select slug, title, coalesce(description, ''), 'published'
from distinct_new_slugs
on conflict (slug) do nothing;

-- ============================================================
-- 3) 방금 만든 페이지에만 기본 위젯 5종(hero/quote/slide/board/gallery)을
--    채운다 — ensurePageForSlug()의 DEFAULT_TEMPLATE_TYPES 순서/기본값과
--    동일. board_id는 전부 미연결(관리자가 나중에 "관리" 모달에서 연결).
-- ============================================================
with nav_slugs as (
  select
    n.id,
    n.title,
    n.description,
    coalesce(
      nullif(
        lower(regexp_replace(regexp_replace(regexp_replace(n.href, '^/+', ''), '/+$', ''), '/', '-', 'g')),
        ''
      ),
      'home'
    ) as slug
  from site_navigations n
),
newly_created as (
  select pb.id as page_id, pb.slug, pb.title, pb.description
  from page_builder pb
  join nav_slugs ns on ns.slug = pb.slug
  where not exists (select 1 from page_modules pm where pm.page_id = pb.id)
)
insert into page_modules (page_id, module_type, board_id, settings, sort_order, is_hidden)
select page_id, module_type, null, settings, sort_order, false
from (
  select
    page_id,
    'hero' as module_type,
    jsonb_build_object(
      'title', title,
      'subtitle', '',
      'description', coalesce(description, ''),
      'breadcrumb', jsonb_build_array(
        jsonb_build_object('label', '홈', 'href', '/'),
        jsonb_build_object('label', title)
      )
    ) as settings,
    0 as sort_order
  from newly_created
  union all
  select page_id, 'quote', jsonb_build_object('text', '인용문을 입력하세요', 'author', ''), 1
  from newly_created
  union all
  select page_id, 'slide', jsonb_build_object('title', '', 'sort', 'latest'), 2
  from newly_created
  union all
  select page_id, 'board', jsonb_build_object(
    'searchEnabled', true,
    'sortEnabled', true,
    'paginationEnabled', true,
    'pageSize', 10,
    'showThumbnail', true,
    'showWriteButton', true,
    'includeChildBoards', true
  ), 3
  from newly_created
  union all
  select page_id, 'gallery', '{}'::jsonb, 4
  from newly_created
) modules;

-- ============================================================
-- 4) 검증 — 0행이 나와야 정상(모든 노드가 페이지를 가짐).
-- ============================================================
select n.id, n.title, n.href
from site_navigations n
left join page_builder pb on pb.slug = coalesce(
  nullif(lower(regexp_replace(regexp_replace(regexp_replace(n.href, '^/+', ''), '/+$', ''), '/', '-', 'g')), ''),
  'home'
)
where pb.id is null;
