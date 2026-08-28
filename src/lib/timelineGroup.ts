import { supabase } from "@/lib/supabaseClient";

// HOTFIX-147.5(사용자 지시 — "혁명~제국 타임라인에는 신고전주의/리전시/
// 빅토리안/인상파 이 네가지의 '페이지'가 들어와야 하는거야, 게시글이
// 아니라"): HOTFIX-147.3에서 만든 "group" 모드는 하위 게시판 전체의
// 게시글을 전부 끌어모아 게시글 단위로 보여줬는데, 사용자가 원한 건 그게
// 아니라 "이 그룹 바로 아래 카테고리(페이지) 하나당 슬라이드 하나"였다 —
// 게시글 집계가 아니라 카테고리 디렉토리다. site_navigations의 각 카테고리
// 제목이 이미 "1750~1850 신고전주의 NeoClassicism"처럼 연대 접두사를
// 달고 있어 그 연대를 그대로 타임라인 start/end date로 파싱해 쓴다.

type NavRow = {
  id: string;
  parent_id: string | null;
  title: string;
  href: string | null;
  thumbnail_url: string | null;
  description: string | null;
};

export type NavChildInfo = {
  id: string;
  title: string;
  href: string;
  thumbnailUrl: string | null;
  description: string | null;
};

export type NavGroupInfo = {
  id: string;
  title: string;
  thumbnailUrl: string | null;
  description: string | null;
  children: NavChildInfo[];
};

/** groupHref(예: "/online-docent/revolution-empire") 노드 자신의 정보와
 * 바로 아래 직계 자식(카테고리) 목록을 가져온다. 손자 항목까지 내려가지
 * 않는다 — "이 그룹 바로 하위 페이지들"만 슬라이드가 된다. */
export async function fetchNavGroup(groupHref: string): Promise<NavGroupInfo | null> {
  const { data: root } = await supabase
    .from("site_navigations")
    .select("id, parent_id, title, href, thumbnail_url, description")
    .eq("href", groupHref)
    .maybeSingle();
  if (!root) return null;
  const rootRow = root as NavRow;

  const { data: children } = await supabase
    .from("site_navigations")
    .select("id, parent_id, title, href, thumbnail_url, description")
    .eq("parent_id", rootRow.id)
    .order("sort_order", { ascending: true });

  return {
    id: rootRow.id,
    title: rootRow.title,
    thumbnailUrl: rootRow.thumbnail_url,
    description: rootRow.description,
    children: ((children ?? []) as NavRow[])
      .filter((c): c is NavRow & { href: string } => !!c.href)
      .map((c) => ({ id: c.id, title: c.title, href: c.href, thumbnailUrl: c.thumbnail_url, description: c.description })),
  };
}

export function lastPathSegment(href: string): string {
  const parts = href.split("/").filter(Boolean);
  return parts[parts.length - 1] ?? "";
}

// "BC 1100~146 그리스 Greeks" / "1750~1850 신고전주의 NeoClassicism" 같은
// 제목에서 연대 접두사를 뽑아 TL3 날짜로 쓰고, 나머지를 headline으로 쓴다.
// BC면 더 큰 숫자가 더 이전(더 음수)이라 그대로 부호만 뒤집으면 시간순이
// 맞는다. 접두사가 없는 제목(관례를 안 지킨 예외적인 경우)은 연대 없이
// headline만 반환한다 — 호출부가 순번 기반 fallback 날짜를 부여한다.
// HOTFIX-151.3(사용자 신고 — "로마제국 BC 146~AD 476"/"비잔틴 제국 AD
// 476~1453"의 연대가 타임라인에 엉뚱하게(2000년대로) 나옴): 기존 정규식은
// 시작 연도 앞에만 "BC "를 허용했다 — "BC 146~AD 476"처럼 끝 연도에 별도로
// "AD "가 붙어 BC→AD 경계를 넘는 제목은 매치 자체가 실패해(끝 연도 자리에
// 숫자가 아닌 "AD"가 와서) null로 폴백, 호출부가 2000+순번으로 대체하고
// 있었다. 시작/끝 연도 각각에 독립적으로 BC/AD 접두사를 허용하도록 고치되,
// 끝 연도에 접두사가 없으면 기존과 동일하게 시작 연도의 시대를 물려받는다
// (예: "BC 1100~146 그리스"는 여전히 둘 다 BC로 동작 — 기존 저장 제목과
// 100% 하위 호환).
export function parseCategoryTitle(title: string): { startYear: number | null; endYear: number | null; headline: string } {
  const trimmed = title.trim();
  const match = trimmed.match(/^(BC\s+|AD\s+)?(\d{1,4})\s*~\s*(BC\s+|AD\s+)?(\d{1,4})\s*(.*)$/i);
  if (!match) return { startYear: null, endYear: null, headline: trimmed };
  const startIsBC = /^BC/i.test(match[1] ?? "");
  const endIsBC = match[3] ? /^BC/i.test(match[3]) : startIsBC;
  const start = parseInt(match[2], 10);
  const end = parseInt(match[4], 10);
  const headline = match[5].trim() || trimmed;
  return { startYear: startIsBC ? -start : start, endYear: endIsBC ? -end : end, headline };
}

/** 대표 이미지가 nav 항목에 없을 때, 그 카테고리에 매칭되는 게시판의 첫
 * (공개, 썸네일 노출) 게시글 이미지로 대체한다 — 완전히 빈 슬라이드보다는
 * 낫다는 절충(다른 폴백 이미지 패턴들과 동일한 관례). */
export async function fallbackThumbnailForHref(href: string): Promise<string | null> {
  const slug = lastPathSegment(href);
  if (!slug) return null;
  const { data: board } = await supabase.from("boards").select("id").eq("slug", slug).maybeSingle();
  if (!board) return null;
  const { data: posts } = await supabase
    .from("posts")
    .select("featured_image_url, thumbnail_visible")
    .eq("board_id", (board as { id: string }).id)
    .eq("visibility", "public")
    .order("created_at", { ascending: true })
    .limit(5);
  const withImage = ((posts ?? []) as { featured_image_url: string | null; thumbnail_visible: boolean | null }[]).find(
    (p) => p.thumbnail_visible !== false && p.featured_image_url,
  );
  return withImage?.featured_image_url ?? null;
}
