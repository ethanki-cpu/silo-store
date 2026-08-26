import { supabase } from "@/lib/supabaseClient";

// HOTFIX-147.3(사용자 지시 — "온라인 도슨트의 2단계 카테고리 페이지(혁명~
// 제국 등)에도 타임라인을 넣어달라, 그 하위 3단계 카테고리들이 보일 수
// 있도록"): site_navigations 트리에서 주어진 branch(href)의 모든 자손
// 노드를 찾고, 그 href의 마지막 경로 세그먼트를 boards.slug로 매칭해 실제
// 게시판 id 목록을 뽑는다. leaf board의 href 마지막 세그먼트가 곧 그
// 게시판의 slug라는 관례는 이미 이 세션에서 여러 번 확인됨(예: "대중문화"
// 게시판 slug를 pop-culture로 맞춘 것도 이 관례를 따른 것).
type NavRow = { id: string; parent_id: string | null; href: string | null };

async function fetchDescendantHrefs(groupHref: string): Promise<string[]> {
  const { data: root } = await supabase
    .from("site_navigations")
    .select("id, parent_id, href")
    .eq("href", groupHref)
    .maybeSingle();
  if (!root) return [];

  const hrefs: string[] = [];
  let frontier: string[] = [(root as NavRow).id];
  // 3단계 트리라 3-4번이면 충분하지만, 혹시 더 깊어져도 무한루프는 방지.
  for (let depth = 0; depth < 6 && frontier.length > 0; depth++) {
    const { data: children } = await supabase
      .from("site_navigations")
      .select("id, parent_id, href")
      .in("parent_id", frontier);
    const rows = (children ?? []) as NavRow[];
    if (rows.length === 0) break;
    for (const row of rows) {
      if (row.href) hrefs.push(row.href);
    }
    frontier = rows.map((r) => r.id);
  }
  return hrefs;
}

function lastSegment(href: string): string {
  const parts = href.split("/").filter(Boolean);
  return parts[parts.length - 1] ?? "";
}

/** groupHref(예: "/online-docent/revolution-empire") 아래 모든 하위
 * 카테고리에 대응하는 실제 boards.id 목록을 돌려준다. 매칭되는 게시판이
 * 없으면 빈 배열. */
export async function resolveGroupBoardIds(groupHref: string): Promise<string[]> {
  const descendantHrefs = await fetchDescendantHrefs(groupHref);
  if (descendantHrefs.length === 0) return [];

  const slugs = [...new Set(descendantHrefs.map(lastSegment).filter(Boolean))];
  const { data: boards } = await supabase.from("boards").select("id, slug").in("slug", slugs);
  return (boards ?? []).map((b) => (b as { id: string }).id);
}
