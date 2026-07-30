import { supabase } from "@/lib/supabaseClient";
import {
  PAGE_MODULE_TYPES,
  PAGE_MODULE_LABELS,
  PAGE_MODULE_ICONS,
  WIDGET_GROUPS,
  BOARD_LINKED_MODULE_TYPES,
  WIDGET_FIELDS,
  WIDGET_DEFAULT_SETTINGS,
  type PageModuleType,
} from "@/lib/widgetSchema";

// EPIC-060: Page Builder CMS — Page(page_builder) → Module(page_modules,
// board_id로 기존 Board System을 "끼워 쓰는" 모듈 포함) → Board → Post
// 구조의 타입/조회 계층. 테이블 정의는 docs/sql/EPIC-060-page-builder.sql
// 참고(관리자가 Supabase에서 직접 실행해야 실제로 생긴다) — 테이블이 아직
// 없어도 아래 조회 함수들은 에러를 그대로 삼키고 null/[]을 반환해, 이
// 기능을 쓰는 화면이 깨지지 않고 기존 하드코딩 렌더링으로 자연스럽게
// 대체(fallback)되도록 한다.
//
// EPIC-065: 위젯 타입/라벨/아이콘/필드 스키마는 src/lib/widgetSchema.ts로
// 옮기고 여기서는 재노출(re-export)만 한다 — 기존
// `import { PageModuleType, PAGE_MODULE_TYPES, ... } from "@/lib/pageBuilder"`
// 호출부를 전부 고치지 않기 위함(하위 호환).
export {
  PAGE_MODULE_TYPES,
  PAGE_MODULE_LABELS,
  PAGE_MODULE_ICONS,
  WIDGET_GROUPS,
  BOARD_LINKED_MODULE_TYPES,
  WIDGET_FIELDS,
  WIDGET_DEFAULT_SETTINGS,
};
export type { PageModuleType };

export type PageBuilderRow = {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  status: "draft" | "published";
  layout: string;
  created_at: string;
  updated_at: string;
  // EPIC-075: 관리자 트리 화면의 드래그앤드롭 순서 — `docs/sql/EPIC-075-tree-sort-order.sql`
  // 실행 전 라이브 DB에는 이 컬럼이 없을 수 있어 옵셔널(아래 fetchAllPagesForAdmin의
  // 42703 폴백 참고).
  sort_order?: number;
};

export type PageModuleRow = {
  id: string;
  page_id: string;
  module_type: PageModuleType;
  board_id: string | null;
  settings: Record<string, unknown>;
  sort_order: number;
  // EPIC-065: Widget Builder의 "숨기기" — true면 공개 페이지(PageBuilderRenderer)
  // 에서는 안 보이고 관리자 화면에서만 흐리게 계속 보인다.
  is_hidden: boolean;
};

// 공개 페이지(Community/Gallery/... page.tsx)가 쓰는 조회 — status가
// 'published'인 행만 RLS가 통과시킨다(로그인 여부 무관, anon도 조회 가능).
// 테이블이 아직 없으면(EPIC-060 SQL 미실행) error가 나므로 null을 돌려주고,
// 호출부가 기존 하드코딩 PageTemplate 렌더링으로 fallback한다.
export async function fetchPublishedPageBySlug(
  slug: string,
): Promise<{ page: PageBuilderRow; modules: PageModuleRow[] } | null> {
  const { data: page, error: pageError } = await supabase
    .from("page_builder")
    .select("*")
    .eq("slug", slug)
    .eq("status", "published")
    .maybeSingle();

  if (pageError || !page) return null;

  const { data: modules, error: modulesError } = await supabase
    .from("page_modules")
    .select("*")
    .eq("page_id", page.id)
    .order("sort_order", { ascending: true });

  if (modulesError) return null;

  return { page: page as PageBuilderRow, modules: (modules ?? []) as PageModuleRow[] };
}

// 관리자 화면(/admin/pages)이 쓰는 조회 — draft 포함 전체. is_admin이
// 아니면 RLS가 draft 행을 숨기므로(정책 참고), 관리자가 아닌데 이 함수를
// 호출해도 draft는 보이지 않는다.
export async function fetchAllPagesForAdmin(): Promise<PageBuilderRow[] | null> {
  // EPIC-075: sort_order로 정렬해야 관리자 트리 화면의 드래그앤드롭 순서가
  // 실제로 반영된다 — 마이그레이션(docs/sql/EPIC-075-tree-sort-order.sql)
  // 전 라이브 DB에는 이 컬럼이 없을 수 있어(42703), 그 경우 기존 created_at
  // 정렬로 조용히 폴백한다(다른 라우트들의 rich/legacy 필드 폴백과 동일 패턴).
  let { data, error } = await supabase
    .from("page_builder")
    .select("*")
    .order("sort_order", { ascending: true });

  if (error) {
    ({ data, error } = await supabase
      .from("page_builder")
      .select("*")
      .order("created_at", { ascending: true }));
  }

  if (error) return null;
  return (data ?? []) as PageBuilderRow[];
}

export async function fetchPageForAdmin(
  id: string,
): Promise<{ page: PageBuilderRow; modules: PageModuleRow[] } | null> {
  const { data: page, error: pageError } = await supabase
    .from("page_builder")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (pageError || !page) return null;

  const { data: modules, error: modulesError } = await supabase
    .from("page_modules")
    .select("*")
    .eq("page_id", id)
    .order("sort_order", { ascending: true });

  if (modulesError) return null;

  return { page: page as PageBuilderRow, modules: (modules ?? []) as PageModuleRow[] };
}

// "테이블이 아직 없다"를 구분하는 용도 — Postgres가 정의되지 않은 테이블
// 조회 시 돌려주는 에러 코드(42P01)를 확인해, /admin/pages가 "테이블 없음"
// 상태를 일반 조회 실패와 구분된 안내 문구로 보여줄 수 있게 한다.
export async function isPageBuilderTableMissing(): Promise<boolean> {
  const { error } = await supabase.from("page_builder").select("id").limit(1);
  return error?.code === "42P01" || error?.code === "PGRST205";
}
