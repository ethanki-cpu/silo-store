import { supabase } from "@/lib/supabaseClient";
import { fetchNavBranches, fetchBoardBranchMap, type NavBranchNode } from "@/lib/adminTreeGrouping";

// HOTFIX-163.1(사용자 지시 — /membership 캐러셀 카드 안에서 "이 등급으로 어느 카테고리의 어떤
// 게시판/페이지를 쓸 수 있는지"가 한눈에 보여야 한다): 사이트 메뉴(site_navigations) 트리를 기준으로
// 등급별 이용 가능 항목을 "카테고리 → 항목" 묶음으로 계산한다. 근거는 /admin/board-permissions에서
// 관리자가 정한 실제 값(boards.min_rank_to_read/view_post, page_builder.min_rank_to_read)이라
// 화면 안내와 실제 권한이 어긋나지 않는다(등급 누적형 — 높은 등급은 낮은 등급 것을 모두 포함).

export type BenefitItem = { name: string; isNew: boolean };
export type BenefitGroup = { root: string; title: string; items: BenefitItem[] };
export type TierCategoryAccess = { groups: BenefitGroup[]; total: number; newCount: number };

// 게시판이 아닌 기능(사일로 플레닛)의 등급 조건 — 실제 게이팅 코드와 동일하게 유지할 것:
// GET /api/silo-planet/planets (다른 회원 행성 열람 = rank>=1), POST 같은 파일 (내 행성 만들기 = rank>=3).
export const PLANET_FEATURES: { minRank: number; name: string }[] = [
  { minRank: 1, name: "다른 회원의 행성 구경·좋아요" },
  { minRank: 3, name: "나만의 행성 만들기" },
];

// "My Story 나의 이야기" / "1350~1600 르네상스 Renaissance" → 한글 이름만 남긴다(앞·뒤 영문 병기 제거).
// 한 글자짜리(주제별 클럽 게시판 A/B의 A·B)와 "수미의 good n book n"처럼 고유 이름 자체가 영문 섞인 경우는 그대로 둔다.
export function shortKoreanTitle(title: string): string {
  const hasHangul = (s: string) => /[가-힣]/.test(s);
  if (!hasHangul(title)) return title.trim();
  const isWord = (s: string) => /^[A-Za-z][A-Za-z'&.~]+$/.test(s);
  const isGlue = (s: string) => /^[~&\-/]$/.test(s);
  const tokens = title.trim().split(/\s+/);
  let lead = 0;
  while (lead < tokens.length && isWord(tokens[lead])) lead++;
  if (lead > 0 && lead < tokens.length && hasHangul(tokens[lead])) tokens.splice(0, lead);
  let end = tokens.length;
  while (end > 1 && (isWord(tokens[end - 1]) || isGlue(tokens[end - 1]))) end--;
  const kept = tokens.slice(0, end);
  const stripped = tokens.length - end;
  const single = kept.length === 1 && kept[0].endsWith("의");
  if (stripped >= 2 && single) return tokens.join(" ");
  return (kept.length > 0 && hasHangul(kept.join(" ")) ? kept : tokens).join(" ");
}

type BoardGate = { id: string; min_rank_to_read: number | null; min_rank_to_view_post: number | null };

const passes = (min: number | null, rank: number) => min == null || rank >= min;

// ranks: 계산할 등급들(오름차순). 이전 등급 대비 새로 열리는 항목에 isNew를 표시한다.
export async function computeTierCategoryAccess(ranks: number[]): Promise<Map<number, TierCategoryAccess>> {
  const branches: NavBranchNode[] = await fetchNavBranches();
  const [boardBranchMap, boardsRes, pagesRes, timelineRes] = await Promise.all([
    fetchBoardBranchMap(branches),
    supabase.from("boards").select("id, min_rank_to_read, min_rank_to_view_post"),
    supabase.from("page_builder").select("slug, min_rank_to_read"),
    supabase.from("page_modules").select("page_builder(slug)").eq("module_type", "timeline"),
  ]);

  const boardById = new Map(((boardsRes.data ?? []) as BoardGate[]).map((b) => [b.id, b]));
  const pageMin = new Map(((pagesRes.data ?? []) as { slug: string; min_rank_to_read: number | null }[]).map((p) => [p.slug, p.min_rank_to_read]));
  const timelineSlugs = new Set(
    ((timelineRes.data ?? []) as unknown as { page_builder: { slug: string } | null }[]).map((r) => r.page_builder?.slug).filter((s): s is string => !!s),
  );

  const branchById = new Map(branches.map((b) => [b.id, b]));
  const boardsByBranch = new Map<string, BoardGate[]>();
  for (const [boardId, branchId] of boardBranchMap) {
    const board = boardById.get(boardId);
    if (!board) continue;
    const list = boardsByBranch.get(branchId) ?? [];
    list.push(board);
    boardsByBranch.set(branchId, list);
  }
  const childrenOf = new Map<string, NavBranchNode[]>();
  for (const b of branches) {
    if (!b.parentId) continue;
    const list = childrenOf.get(b.parentId) ?? [];
    list.push(b);
    childrenOf.set(b.parentId, list);
  }

  const pageOk = (b: NavBranchNode, rank: number) => passes(b.slug ? (pageMin.get(b.slug) ?? null) : null, rank);
  const chainOk = (b: NavBranchNode, rank: number): boolean => {
    for (let cur: NavBranchNode | undefined = b; cur; cur = cur.parentId ? branchById.get(cur.parentId) : undefined) {
      if (!pageOk(cur, rank)) return false;
    }
    return true;
  };
  // 콘텐츠가 있는 가지 = 등급이 통과하는 게시판이 있거나, 타임라인 페이지.
  const hasContent = (b: NavBranchNode, rank: number) => {
    if (!chainOk(b, rank)) return false;
    const boards = boardsByBranch.get(b.id);
    if (boards && boards.length > 0) return boards.some((x) => passes(x.min_rank_to_read, rank) && passes(x.min_rank_to_view_post, rank));
    return !!b.slug && timelineSlugs.has(b.slug);
  };

  // 등급별 "이용 가능한 잎(leaf) 가지" 집합. 자손 중에 이용 가능한 게 있으면 그 가지는 항목이 아니라 카테고리 제목이 된다.
  const leafSet = (rank: number): Set<string> => {
    const memo = new Map<string, boolean>();
    const anyBelow = (b: NavBranchNode): boolean => {
      const cached = memo.get(b.id);
      if (cached !== undefined) return cached;
      const v = hasContent(b, rank) || (childrenOf.get(b.id) ?? []).some(anyBelow);
      memo.set(b.id, v);
      return v;
    };
    const out = new Set<string>();
    for (const b of branches) {
      if (!hasContent(b, rank)) continue;
      const childHas = (childrenOf.get(b.id) ?? []).some(anyBelow);
      if (!childHas) out.add(b.id);
    }
    return out;
  };

  const rootTitle = (b: NavBranchNode): string => {
    let cur = b;
    while (cur.parentId) {
      const p = branchById.get(cur.parentId);
      if (!p) break;
      cur = p;
    }
    return shortKoreanTitle(cur.title);
  };

  const result = new Map<number, TierCategoryAccess>();
  let prevLeaves: Set<string> | null = null;
  let prevRank: number | null = null;
  for (const rank of ranks) {
    const leaves = leafSet(rank);
    const groups: BenefitGroup[] = [];
    const groupByKey = new Map<string, BenefitGroup>();
    let total = 0;
    let newCount = 0;
    for (const b of branches) {
      if (!leaves.has(b.id)) continue;
      const parent = b.parentId ? branchById.get(b.parentId) : undefined;
      const key = parent?.id ?? b.id;
      let g = groupByKey.get(key);
      if (!g) {
        g = { root: rootTitle(b), title: shortKoreanTitle((parent ?? b).title), items: [] };
        groupByKey.set(key, g);
        groups.push(g);
      }
      const isNew = prevLeaves ? !prevLeaves.has(b.id) : true;
      g.items.push({ name: shortKoreanTitle(b.title), isNew });
      total++;
      if (isNew) newCount++;
    }
    const planet = PLANET_FEATURES.filter((f) => rank >= f.minRank);
    if (planet.length > 0) {
      groups.push({
        root: "사일로 플레닛",
        title: "사일로 플레닛",
        items: planet.map((f) => ({ name: f.name, isNew: prevRank == null || prevRank < f.minRank })),
      });
      total += planet.length;
      newCount += groups[groups.length - 1].items.filter((i) => i.isNew).length;
    }
    result.set(rank, { groups, total, newCount });
    prevLeaves = leaves;
    prevRank = rank;
  }
  return result;
}
