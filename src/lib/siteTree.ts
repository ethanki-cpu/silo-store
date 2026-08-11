import { supabase } from "@/lib/supabaseClient";
import { hrefToSlug } from "@/lib/pageTemplates";
import type { BreadcrumbItem } from "@/components/PageHeader";

// EPIC-092(요구사항 8): site_navigations의 parent_id 자기참조 트리를
// 브레드크럼으로 역추적하는 공용 헬퍼. src/components/admin/CategoryTreeManager.tsx
// 에 이미 두 번(라인 88-95, 323-335 부근) 중복돼 있던 "부모 체인을 따라
// 올라가는" 패턴을 여기 하나로 뽑아 공유한다.

type NavRow = { id: string; title: string; href: string | null; parent_id: string | null };

async function fetchAllNavRows(): Promise<NavRow[]> {
  const { data } = await supabase.from("site_navigations").select("id, title, href, parent_id");
  return (data ?? []) as NavRow[];
}

// navId부터 parent_id를 따라 루트까지 올라가 "홈 > ... > navId" 순서의
// 브레드크럼 배열을 만든다.
export async function getAncestorChain(navId: string): Promise<BreadcrumbItem[]> {
  const rows = await fetchAllNavRows();
  const byId = new Map(rows.map((r) => [r.id, r]));
  const chain: NavRow[] = [];
  let current = byId.get(navId);
  while (current) {
    chain.unshift(current);
    current = current.parent_id ? byId.get(current.parent_id) : undefined;
  }
  return [{ label: "홈", href: "/" }, ...chain.map((r) => ({ label: r.title, href: r.href ?? undefined }))];
}

// pathname(예: "/community/general")과 site_navigations.href가 가리키는
// page_builder slug 관례(hrefToSlug)로 매칭되는 nav 행을 찾는다 — 일반
// Page Builder 페이지(카테고리 허브 등)용.
export async function findNavNodeByPathname(pathname: string): Promise<{ id: string } | null> {
  const rows = await fetchAllNavRows();
  const target = hrefToSlug(pathname);
  const match = rows.find((r) => r.href && hrefToSlug(r.href) === target);
  return match ? { id: match.id } : null;
}

// EPIC-092(요구사항 8): board_id → site_navigations 노드 역추적. boards에는
// site_navigations로의 직접 FK가 없다 — CategoryTreeManager.tsx의 "연결된
// 게시판" 메커니즘(약 1650-1730줄)과 정확히 반대 방향으로 체인을 탄다:
// page_modules(module_type='board', board_id=X) → page_id → page_builder.slug
// → 그 slug와 hrefToSlug(href)가 일치하는 site_navigations 행.
// HOTFIX-094: board_id -> 그 게시판을 "board" 위젯으로 담고 있는 전용
// page_builder 페이지의 slug. CategoryBranchPicker(BoardForm의 "Category
// (사이트 메뉴 위치)")로 게시판을 사이트 메뉴 분기에 배정하면
// ensurePageForSlug가 그 분기 전용 page_builder 행을 만들고 이 게시판을
// board 위젯으로 연결한다 - 그 결과를 역추적한다. 배정된 적이 없으면
// null이며, 호출부는 이 경우 "이 게시판 전용 페이지가 아직 없다"로 취급해야
// 한다 - 모든 게시판이 공유하는 대체 슬러그로 폴백하지 않는다(그러면
// 게시판마다 서로 다른 게시판의 "페이지 수정"/위젯 영역을 보게 되는
// 문제로 되돌아간다).
export async function getBoardPageSlug(boardId: string): Promise<string | null> {
  const { data: pm } = await supabase
    .from("page_modules")
    .select("page_id")
    .eq("board_id", boardId)
    .eq("module_type", "board")
    .order("sort_order", { ascending: true })
    .limit(1)
    .maybeSingle();
  const pageId = (pm as { page_id: string } | null)?.page_id;
  if (!pageId) return null;

  const { data: page } = await supabase.from("page_builder").select("slug").eq("id", pageId).maybeSingle();
  return (page as { slug: string } | null)?.slug ?? null;
}

export async function getNavNodeForBoardId(boardId: string): Promise<{ id: string } | null> {
  const slug = await getBoardPageSlug(boardId);
  if (!slug) return null;

  const rows = await fetchAllNavRows();
  const match = rows.find((r) => r.href && hrefToSlug(r.href) === slug);
  return match ? { id: match.id } : null;
}
