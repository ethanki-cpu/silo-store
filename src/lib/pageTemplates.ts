import { supabase } from "@/lib/supabaseClient";

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

// HOTFIX-152.18(사용자 지시 — "페이지가 만들어질때 craft 에디터를
// default로 깔아"): 새로 만들어지는 페이지는 이제 처음부터
// builder_type='craft'로 시작한다(DB 컬럼 기본값은 여전히 'native'라
// 여기서 명시해야 함) — CraftGenericRenderer/CraftGenericEditor(둘 다
// src/components/craft/generic/)가 화이트리스트(CRAFT_RENDERERS/
// CRAFT_EDITORS)에 없는 어떤 slug도 곧바로 받아 그려주므로, 코드 배포 없이
// DB에서 새 카테고리를 만들어도 즉시 Craft 에디터로 열린다. 기존 native
// 5-위젯 기본 템플릿(hero/quote/slide/board/gallery, DEFAULT_TEMPLATE_TYPES)
// 자동 생성은 이제 만들지 않는다 — craft가 기본이 되면 어차피 렌더링에
//안 쓰이고, HOTFIX-152.17에서 정리한 것처럼 "미연결 빈 위젯만 잔뜩 쌓인
// 페이지"가 새로 생길 이유가 없다. 관리자가 나중에 이 페이지를 다시
// native로 되돌리면(사이트 구성 관리) 그때부터 "+ 위젯 추가"로 직접
// 채우면 된다.
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

  if (existing?.id) return;

  await supabase
    .from("page_builder")
    .insert({ slug, title, description: description ?? "", status: "published", builder_type: "craft" });
}
