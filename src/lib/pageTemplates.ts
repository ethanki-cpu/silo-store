import { supabase } from "@/lib/supabaseClient";
import { WIDGET_DEFAULT_SETTINGS, type PageModuleType } from "@/lib/widgetSchema";

// EPIC-068: 카테고리(site_navigations)를 만들 때 page_builder/page_modules를
// 자동으로 함께 만들어 "페이지가 없다"는 상태 자체를 없앤다 — 관리자가
// "+ 위젯 추가"를 5번 눌러 만드는 것과 동일한 기본 템플릿(제목/설명 Hero +
// 인용 + 최근 글(Slide) + 게시판(Board) + 갤러리, board_id는 전부 미연결)을
// 자동 생성한다. 이미 page_builder 행이 있으면 title/description/status는
// 건드리지 않고(관리자가 Page Builder에서 따로 편집했을 수 있음), 이미
// 위젯이 하나라도 있으면 모듈도 손대지 않는다 — 항상 "없을 때만 채운다".
const DEFAULT_TEMPLATE_TYPES: PageModuleType[] = ["hero", "quote", "slide", "board", "gallery"];

// site_navigations.href("/community/general" 등)를 기존 page_builder.slug
// 관례("community-general")로 변환한다 — 이 프로젝트의 138개 기존 slug 전부가
// 이 규칙(선행 슬래시 제거 + 나머지 슬래시를 대시로)을 따른다.
export function hrefToSlug(href: string): string {
  const trimmed = href
    .replace(/^\/+/, "")
    .replace(/\/+$/, "")
    .replace(/\//g, "-")
    .toLowerCase();
  return trimmed || "home";
}

export async function ensurePageForSlug(
  slug: string,
  title: string,
  description?: string | null,
): Promise<void> {
  const { data: existing } = await supabase
    .from("page_builder")
    .select("id")
    .eq("slug", slug)
    .maybeSingle();

  let pageId = existing?.id as string | undefined;

  if (!pageId) {
    const { data: inserted, error: insertError } = await supabase
      .from("page_builder")
      .insert({ slug, title, description: description ?? "", status: "published" })
      .select("id")
      .single();
    if (insertError || !inserted) return;
    pageId = inserted.id as string;
  }

  const { count } = await supabase
    .from("page_modules")
    .select("id", { count: "exact", head: true })
    .eq("page_id", pageId);

  if (count && count > 0) return;

  await supabase.from("page_modules").insert(
    DEFAULT_TEMPLATE_TYPES.map((type, i) => ({
      page_id: pageId,
      module_type: type,
      board_id: null,
      settings:
        type === "hero"
          ? { ...WIDGET_DEFAULT_SETTINGS.hero, title, description: description ?? "" }
          : WIDGET_DEFAULT_SETTINGS[type],
      sort_order: i,
      is_hidden: false,
    })),
  );
}
