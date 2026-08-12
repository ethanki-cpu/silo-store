import { supabase } from "@/lib/supabaseClient";
import { hrefToSlug } from "@/lib/pageTemplates";
import { type AdminDomain } from "@/lib/adminDomainGrouping";

// EPIC-072B: `/admin/navigation`(메뉴/카테고리 관리)처럼 상위-하위가 가지
// (Branch) 형태로 들여쓰기된 트리로 페이지/게시판/게시글을 보여달라는 요청.
// EPIC-072의 `adminDomainGrouping.ts`는 4대 도메인이라는 "대분류"만 키워드
// 추정으로 매겼는데, 이번엔 실제 `site_navigations` 트리 그 자체를 SSoT로
// 써서 각 항목이 정확히 어느 가지에 속하는지 계산한다(추정이 아니라 실제
// 구조 매칭) — 도메인(최상위 탭 4개) 판별만 4개 루트 행의 실제 id로 정확히
// 매핑하고, 그 아래 브랜치 트리는 site_navigations의 parent_id 그대로 쓴다.
//
// 매칭 규칙(정확한 것부터):
// - 페이지(`page_builder`): `hrefToSlug(nav.href) === page.slug` 완전 일치.
//   (138개 기존 slug 전부가 이 규칙으로 생성됐다 — pageTemplates.ts 참고)
// - 게시판(`boards`): 그 게시판을 board_id로 참조하는 `page_modules` 행을
//   찾아 그 페이지의 slug로 다시 위 규칙을 적용한다(게시판 자신은 nav에
//   직접 연결되지 않고, 페이지 위젯을 통해서만 연결되므로).
// - 게시글(`posts`): 별도 매칭 없음 — 자신이 속한 게시판의 브랜치를 그대로
//   물려받는다.
// - 위 규칙으로 브랜치를 찾지 못하면 "기타 / 미분류" 버킷(도메인 "common")
//   으로 모아 누락 없이 보여준다.

export type NavBranchNode = {
  id: string;
  title: string;
  href: string | null;
  slug: string | null;
  depth: number;
  parentId: string | null;
  domain: AdminDomain;
};

type RawNavRow = {
  id: string;
  title: string;
  href: string | null;
  parent_id: string | null;
  sort_order: number;
};

// EPIC-096 후속(사용자 신고): 라이브 최상위 탭 6개 실제 제목 그대로 매칭
// (EPIC-095가 Management API로 재조회해 확인한 값 — "About Silo", "온라인
// 도슨트 Online Docent" 등). "도슨트"를 "사일로"보다 먼저 검사해야 한다 —
// 순서를 바꾸면 "온라인 도슨트..."가 먼저 "사일로" 포함 여부를 체크당해
// 틀리진 않지만(포함 안 하므로 통과), 이후 실수로 다른 제목이 추가될 때도
// 안전하도록 더 구체적인 규칙(도슨트/About)을 먼저 둔다.
function classifyRootTitle(title: string): AdminDomain {
  if (title.includes("도슨트") || title.toLowerCase().includes("docent")) return "docent";
  if (title.toLowerCase().includes("about silo")) return "about_silo";
  if (title.includes("사일로")) return "silostore";
  if (title.includes("살롱")) return "salon";
  if (title.includes("스튜디오")) return "studio";
  if (title.includes("마이")) return "mypage";
  return "common";
}

// site_navigations 전체를 depth-first(형제는 sort_order 순)로 평평하게 펼친
// 배열로 반환한다 — 이 순서 그대로 렌더링하면 실제 사이트 내비게이션의
// 순서/들여쓰기와 일치한다(CategoryTreeManager.tsx의 트리와 동일 데이터).
export async function fetchNavBranches(): Promise<NavBranchNode[]> {
  const { data, error } = await supabase
    .from("site_navigations")
    .select("id, title, href, parent_id, sort_order")
    .eq("is_active", true)
    .order("sort_order", { ascending: true });

  if (error || !data) return [];

  const rows = data as RawNavRow[];
  const byParent = new Map<string | null, RawNavRow[]>();
  for (const row of rows) {
    const list = byParent.get(row.parent_id) ?? [];
    list.push(row);
    byParent.set(row.parent_id, list);
  }
  for (const list of byParent.values()) {
    list.sort((a, b) => a.sort_order - b.sort_order);
  }

  const result: NavBranchNode[] = [];

  function visit(parentId: string | null, depth: number, domain: AdminDomain | null) {
    for (const row of byParent.get(parentId) ?? []) {
      const rowDomain = domain ?? classifyRootTitle(row.title);
      result.push({
        id: row.id,
        title: row.title,
        href: row.href,
        slug: row.href ? hrefToSlug(row.href) : null,
        depth,
        parentId: row.parent_id,
        domain: rowDomain,
      });
      visit(row.id, depth + 1, rowDomain);
    }
  }

  visit(null, 0, null);
  return result;
}

// slug -> 브랜치 id. 페이지(page_builder.slug) 매칭에 쓴다.
export function buildSlugToBranchId(branches: NavBranchNode[]): Map<string, string> {
  const map = new Map<string, string>();
  for (const branch of branches) {
    if (branch.slug && !map.has(branch.slug)) map.set(branch.slug, branch.id);
  }
  return map;
}

// board_id -> 그 게시판을 참조하는 페이지의 슬러그로 매칭된 브랜치 id.
// 한 게시판이 여러 페이지에서 쓰이면(예: "예술 클럽" 게시판은 자기 자신의
// 전용 페이지 `community-topics-art`(board 위젯)뿐 아니라 상위 hub
// `community-topics`/`community`에도 미리보기(slide 위젯)로 얹혀있다) 이
// 게시판의 "진짜 집"은 `module_type === "board"`(전체 목록을 보여주는
// 그 게시판 전용 페이지)이지 상위 hub의 슬라이드 미리보기가 아니다 — 그래서
// board 타입 위젯을 최우선으로 찾고, 그것도 여러 개면 slug가 더 긴(더
// 구체적인, 즉 트리에서 더 깊은) 쪽을 고른다. board 타입 참조가 전혀 없으면
// (예: hub 페이지의 slide 미리보기로만 존재) 그중 가장 긴 slug로 대체한다.
export async function fetchBoardBranchMap(
  branches: NavBranchNode[],
): Promise<Map<string, string>> {
  const slugToBranchId = buildSlugToBranchId(branches);

  const { data, error } = await supabase
    .from("page_modules")
    .select("board_id, module_type, page_builder(slug)")
    .not("board_id", "is", null);

  if (error || !data) return new Map();

  type Row = { board_id: string | null; module_type: string; page_builder: { slug: string } | null };
  const bestByBoard = new Map<string, { slug: string; isBoardType: boolean }>();

  for (const row of data as unknown as Row[]) {
    if (!row.board_id) continue;
    const slug = row.page_builder?.slug;
    if (!slug) continue;
    const isBoardType = row.module_type === "board";
    const current = bestByBoard.get(row.board_id);
    if (
      !current ||
      (isBoardType && !current.isBoardType) ||
      (isBoardType === current.isBoardType && slug.length > current.slug.length)
    ) {
      bestByBoard.set(row.board_id, { slug, isBoardType });
    }
  }

  const map = new Map<string, string>();
  for (const [boardId, { slug }] of bestByBoard) {
    const branchId = slugToBranchId.get(slug);
    if (branchId) map.set(boardId, branchId);
  }
  return map;
}

export const UNASSIGNED_BRANCH_ID = "__unassigned__";
const UNASSIGNED_TITLE = "기타 / 미분류";

export type AdminTreeRow<T> =
  | { kind: "branch"; id: string; title: string; href: string | null; depth: number; parentId: string | null }
  | { kind: "item"; depth: number; item: T };

// 항목 배열(페이지/게시판/게시글)을 브랜치(가지) id로 묶어, 실제
// site_navigations 순서/깊이 그대로 들여쓰기된 렌더링용 행 목록으로
// 변환한다. 매칭되지 않는 항목은 맨 뒤 "기타 / 미분류" 버킷에 모은다.
// 도메인 필터가 "all"이 아니면 그 도메인에 속한 브랜치(및 domainFilter가
// "common"일 때의 미분류 버킷)만 남긴다.
export function buildAdminTree<T>(
  items: T[],
  getBranchId: (item: T) => string | null,
  branches: NavBranchNode[],
  domainFilter: AdminDomain | "all",
): AdminTreeRow<T>[] {
  const branchById = new Map(branches.map((b) => [b.id, b]));
  const itemsByBranch = new Map<string, T[]>();
  const unassigned: T[] = [];

  for (const item of items) {
    const branchId = getBranchId(item);
    const branch = branchId ? branchById.get(branchId) : undefined;
    if (!branch) {
      unassigned.push(item);
      continue;
    }
    const list = itemsByBranch.get(branch.id) ?? [];
    list.push(item);
    itemsByBranch.set(branch.id, list);
  }

  // 내용이 있는 브랜치와 그 조상 전부를 "표시 대상"으로 표시한다 — 자식이
  // 있는데 부모 가지가 안 보이면 들여쓰기 트리의 맥락이 끊기기 때문.
  const neededBranchIds = new Set<string>();
  for (const branchId of itemsByBranch.keys()) {
    let current: NavBranchNode | undefined = branchById.get(branchId);
    while (current) {
      neededBranchIds.add(current.id);
      current = current.parentId ? branchById.get(current.parentId) : undefined;
    }
  }

  const rows: AdminTreeRow<T>[] = [];
  for (const branch of branches) {
    if (domainFilter !== "all" && branch.domain !== domainFilter) continue;
    if (!neededBranchIds.has(branch.id)) continue;
    rows.push({
      kind: "branch",
      id: branch.id,
      title: branch.title,
      href: branch.href,
      depth: branch.depth,
      parentId: branch.parentId,
    });
    for (const item of itemsByBranch.get(branch.id) ?? []) {
      rows.push({ kind: "item", depth: branch.depth + 1, item });
    }
  }

  if (unassigned.length > 0 && (domainFilter === "all" || domainFilter === "common")) {
    rows.push({
      kind: "branch",
      id: UNASSIGNED_BRANCH_ID,
      title: UNASSIGNED_TITLE,
      href: null,
      depth: 0,
      parentId: null,
    });
    for (const item of unassigned) rows.push({ kind: "item", depth: 1, item });
  }

  return rows;
}
