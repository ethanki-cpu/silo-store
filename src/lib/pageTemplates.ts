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

// HOTFIX-152.16(사용자 신고 — "'사이트메뉴'에서 수정을 했더니, '수정'이
// 아니라, 아예 새로운 페이지가 생겨버리는데 아주 불편해 죽겠다"): 카테고리의
// href를 바꾸면(예: "온라인 도슨트 > 제국~군주"의 슬러그를 손보다가) 여기
// 정의된 hrefToSlug 규칙상 page_builder.slug도 통째로 달라진다 — 지금까지
// updateRow는 새 slug에 대해 ensurePageForSlug만 불러 "그 자리에 페이지가
// 없으면 새로 만든다"만 했지, 원래 그 카테고리가 쓰던 옛 slug의 기존 페이지
// (Craft 캔버스/타임라인 등 실제 콘텐츠가 들어있는)를 새 자리로 옮기지는
// 않았다 — 그 결과 관리자 눈에는 "수정"이지만 실제로는 원래 페이지가
// 아무도 안 가리키는 고아로 남고, 새 slug 자리엔 빈 기본 템플릿이 새로
// 생기는 것으로 보였다(실제 사례: online-docent-ancient-monarchy에 있던
// 타임라인 Craft 페이지가 href 수정 한 번으로 완전히 안 보이게 됨). href가
// 바뀔 때 옛 slug의 페이지를 "옮기는" 이 함수를 ensurePageForSlug보다
// 먼저 호출해 실제로 "수정"(같은 페이지가 새 위치로 이동)이 되게 한다 —
// 새 slug 자리에 이미 다른(무관한) 페이지가 있으면 안전하게 건드리지
// 않는다(그 경우 어느 쪽이 "진짜" 페이지인지 코드가 판단할 수 없어
// 자동으로 덮어쓰면 오히려 다른 사고를 낼 수 있다).
export async function renamePageSlugIfPossible(oldSlug: string, newSlug: string): Promise<void> {
  if (!oldSlug || !newSlug || oldSlug === newSlug) return;
  const { data: existingAtOld } = await supabase
    .from("page_builder")
    .select("id")
    .eq("slug", oldSlug)
    .maybeSingle();
  if (!existingAtOld) return;
  const { data: conflictAtNew } = await supabase
    .from("page_builder")
    .select("id")
    .eq("slug", newSlug)
    .maybeSingle();
  if (conflictAtNew) return;
  await supabase.from("page_builder").update({ slug: newSlug }).eq("id", existingAtOld.id);
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
