"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import { useAuth } from "@/lib/AuthProvider";
import { INDIVIDUAL_BOARD_DEFINITIONS, type IndividualBoardSlug } from "@/lib/boardLayout";

// EPIC-161: 게시판별 멤버십 권한 매트릭스 — 행=게시판, 열=등급, 셀=태그(열람/
// 게시글열람/댓글/좋아요/북마크/글쓰기). 데이터는 boards의 min_rank_to_* 컬럼
// 6개(전부 "이 등급부터 가능" 단일 임계값, membership_tiers(rank) 참조, null=
// 게이트 없음)이고 기존 /api/admin/boards(GET)/[id](PATCH)를 그대로 쓴다 —
// EDITABLE_FIELDS에 신규 5개 컬럼만 추가했다(src/app/api/admin/boards/[id]/route.ts).
// "등급은 누적형"이라 특정 등급에서 켜면 그 등급 이상 전체에 자동 적용된다(min_rank_to_write
// 등 기존 컬럼과 동일한 모델) — 중간 등급만 끄고 위 등급은 유지하는 건 표현할 수 없다.

type BoardRow = {
  id: string;
  name: string;
  category: string | null;
  min_rank_to_read: number | null;
  min_rank_to_view_post: number | null;
  min_rank_to_comment: number | null;
  min_rank_to_like: number | null;
  min_rank_to_bookmark: number | null;
  min_rank_to_write: number | null;
  min_rank_to_propose: number | null;
  badge_min_rank: number | null;
  daily_view_limits: Record<string, number> | null;
};

type RankFieldKey =
  | "min_rank_to_read"
  | "min_rank_to_view_post"
  | "min_rank_to_comment"
  | "min_rank_to_like"
  | "min_rank_to_bookmark"
  | "min_rank_to_write"
  | "min_rank_to_propose";

const CAPS: { key: RankFieldKey; label: string }[] = [
  { key: "min_rank_to_read", label: "열람" },
  { key: "min_rank_to_view_post", label: "게시글열람" },
  { key: "min_rank_to_comment", label: "댓글" },
  { key: "min_rank_to_like", label: "좋아요" },
  { key: "min_rank_to_bookmark", label: "북마크" },
  { key: "min_rank_to_write", label: "글쓰기" },
  { key: "min_rank_to_propose", label: "제안" },
];

// 비회원은 저장값 null로 표현(다른 min_rank_to_* 컬럼과 동일 컨벤션) — "다음
// 등급"은 이 배열의 다음 rank, Lautrec(4) 다음은 membership_tiers에 실존하는
// 랭크 중 일반 5등급 사다리 밖인 99(Artist)를 "사실상 아무도 없음"으로 쓴다.
const TIERS: { rank: number | null; label: string }[] = [
  { rank: null, label: "비회원" },
  { rank: 0, label: "Silo Angel" },
  { rank: 1, label: "Alice" },
  { rank: 2, label: "Great Gatsby" },
  { rank: 3, label: "Patron" },
  { rank: 4, label: "Lautrec" },
];

function isGranted(minRank: number | null, tierRank: number | null): boolean {
  if (minRank == null) return true;
  if (tierRank == null) return false; // 비회원은 minRank가 null일 때만 통과
  return tierRank >= minRank;
}

function nextThreshold(tierRank: number | null): number | null {
  if (tierRank == null) return 0; // 비회원 다음 = Silo Angel
  if (tierRank === 4) return 99; // Lautrec 다음 = "사실상 아무도 없음"
  return tierRank + 1;
}

function toggle(minRank: number | null, tierRank: number | null): number | null {
  const granted = isGranted(minRank, tierRank);
  return granted ? nextThreshold(tierRank) : tierRank;
}

const BADGE_OPTIONS: { value: number | null; label: string }[] = [
  { value: null, label: "없음" },
  { value: 0, label: "Silo Angel부터" },
  { value: 1, label: "Alice부터" },
  { value: 2, label: "Great Gatsby부터" },
  { value: 3, label: "Patron부터" },
  { value: 4, label: "Lautrec부터" },
];

// EPIC-161 Phase 4(사용자 지시 — "'사이트 구성관리'의 사이트 메뉴처럼 상하위
// 카테고리 순서대로 펼치고 닫을 수 있게"): boardLayout.ts의
// INDIVIDUAL_BOARD_DEFINITIONS가 이미 각 게시판의 parent/title_ko를 갖고
// 있어(사이트 메뉴 트리와 같은 근거) DB를 새로 조회하지 않고 이 코드 상의
// 계층을 그대로 재사용한다 — 실제 게시판 행이 없는 상위 카테고리(예:
// "Gallery" 허브 자체는 boards 행일 수도, 아닐 수도 있음)는 순수 폴더
// 헤더로만 표시한다.
type TreeNode = {
  key: string;
  title: string;
  board: BoardRow | null;
  children: TreeNode[];
};

function labelFor(slug: string): string {
  if (slug in INDIVIDUAL_BOARD_DEFINITIONS) {
    return INDIVIDUAL_BOARD_DEFINITIONS[slug as IndividualBoardSlug].title_ko;
  }
  return slug;
}

function parentOf(slug: string): string | null {
  if (slug in INDIVIDUAL_BOARD_DEFINITIONS) {
    return INDIVIDUAL_BOARD_DEFINITIONS[slug as IndividualBoardSlug].parent;
  }
  return null;
}

function buildTree(boards: BoardRow[]): { roots: TreeNode[]; unmatched: BoardRow[] } {
  const nodes = new Map<string, TreeNode>();
  const unmatched: BoardRow[] = [];

  function ensureNode(slug: string): TreeNode {
    let node = nodes.get(slug);
    if (!node) {
      node = { key: slug, title: labelFor(slug), board: null, children: [] };
      nodes.set(slug, node);
    }
    return node;
  }

  for (const board of boards) {
    const category = board.category;
    if (!category || !(category in INDIVIDUAL_BOARD_DEFINITIONS)) {
      unmatched.push(board);
      continue;
    }
    ensureNode(category).board = board;
  }

  // 모든 노드(게시판이 있는 것 + 순수 폴더)를 parent 체인 끝까지 만들어둔다.
  for (const slug of [...nodes.keys()]) {
    let cur: string | null = slug;
    while (cur) {
      const parent: string | null = parentOf(cur);
      if (!parent) break;
      ensureNode(parent);
      cur = parent;
    }
  }

  const roots: TreeNode[] = [];
  for (const [slug, node] of nodes) {
    const parent = parentOf(slug);
    if (parent && nodes.has(parent)) {
      nodes.get(parent)!.children.push(node);
    } else {
      roots.push(node);
    }
  }

  const sortByTitle = (a: TreeNode, b: TreeNode) => a.title.localeCompare(b.title, "ko");
  function sortTree(list: TreeNode[]) {
    list.sort(sortByTitle);
    for (const n of list) sortTree(n.children);
  }
  sortTree(roots);

  return { roots, unmatched };
}

export default function BoardPermissionsPage() {
  const { session, member, loading, memberLoading } = useAuth();
  const [boards, setBoards] = useState<BoardRow[] | null>(null);
  const [drafts, setDrafts] = useState<Record<string, BoardRow>>({});
  const [saving, setSaving] = useState<string | null>(null);
  const [savedAt, setSavedAt] = useState<Record<string, number>>({});
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState("");

  useEffect(() => {
    if (loading || memberLoading || !session || !member?.is_admin) return;
    let cancelled = false;
    fetch("/api/admin/boards", {
      headers: { Authorization: `Bearer ${session.access_token}` },
    })
      .then((res) => res.json())
      .then((data: BoardRow[]) => {
        if (cancelled) return;
        setBoards(data);
        const initial: Record<string, BoardRow> = {};
        for (const b of data) initial[b.id] = b;
        setDrafts(initial);
      })
      .catch(() => {
        if (!cancelled) setError("게시판 목록을 불러오지 못했어요.");
      });
    return () => {
      cancelled = true;
    };
  }, [session, member, loading, memberLoading]);

  const filtered = useMemo(() => {
    if (!boards) return [];
    const q = filter.trim().toLowerCase();
    if (!q) return boards;
    return boards.filter(
      (b) => b.name?.toLowerCase().includes(q) || b.category?.toLowerCase().includes(q),
    );
  }, [boards, filter]);

  const { roots, unmatched } = useMemo(() => buildTree(boards ?? []), [boards]);

  // 기본은 전부 펼친 상태(매트릭스를 훑어보는 화면이라 접혀 있으면 오히려
  // 불편) — 이 Set에 들어있는 키만 접힌 것으로 취급한다.
  const [collapsedKeys, setCollapsedKeys] = useState<Set<string>>(new Set());
  function toggleCollapsed(key: string) {
    setCollapsedKeys((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  function updateDraft(boardId: string, patch: Partial<BoardRow>) {
    setDrafts((prev) => ({ ...prev, [boardId]: { ...prev[boardId], ...patch } }));
  }

  function isDirty(boardId: string): boolean {
    const original = boards?.find((b) => b.id === boardId);
    const draft = drafts[boardId];
    if (!original || !draft) return false;
    if ([...CAPS.map((c) => c.key), "badge_min_rank" as const].some((key) => original[key] !== draft[key])) {
      return true;
    }
    return JSON.stringify(original.daily_view_limits ?? {}) !== JSON.stringify(draft.daily_view_limits ?? {});
  }

  function updateDailyLimit(boardId: string, tierRank: number, raw: string) {
    const draft = drafts[boardId];
    const next = { ...(draft.daily_view_limits ?? {}) };
    if (raw.trim() === "") {
      delete next[String(tierRank)];
    } else {
      const n = Number(raw);
      if (Number.isFinite(n) && n >= 0) next[String(tierRank)] = n;
    }
    updateDraft(boardId, { daily_view_limits: next });
  }

  async function save(boardId: string) {
    if (!session) return;
    const draft = drafts[boardId];
    setSaving(boardId);
    setError(null);
    const patch: Record<string, number | null | Record<string, number> | null> = {};
    for (const cap of CAPS) patch[cap.key] = draft[cap.key] as number | null;
    patch.badge_min_rank = draft.badge_min_rank;
    patch.daily_view_limits =
      draft.daily_view_limits && Object.keys(draft.daily_view_limits).length > 0 ? draft.daily_view_limits : null;

    const res = await fetch(`/api/admin/boards/${boardId}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session.access_token}`,
      },
      body: JSON.stringify(patch),
    });
    setSaving(null);

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "저장에 실패했어요.");
      return;
    }

    setBoards((prev) => prev?.map((b) => (b.id === boardId ? { ...b, ...draft } : b)) ?? prev);
    setSavedAt((prev) => ({ ...prev, [boardId]: Date.now() }));
  }

  if (loading || memberLoading) {
    return <main className="flex-1 p-8">불러오는 중...</main>;
  }

  if (!session || !member?.is_admin) {
    return (
      <main className="flex-1 p-8">
        <p className="text-red-600">관리자만 접근할 수 있어요.</p>
      </main>
    );
  }

  return (
    <main className="flex-1 p-6">
      <h1 className="text-xl font-bold mb-1">멤버십 권한</h1>
      <p className="text-sm text-gray-500 mb-4">
        게시판마다 등급별로 열람/게시글열람/댓글/좋아요/북마크/글쓰기 가능 여부를 정합니다. 태그를 클릭하면 켜고 끌 수 있어요 — 등급은
        누적형이라 특정 등급에서 켜면 그 등급 이상은 전부 자동으로 켜져요(중간만 끄고 위 등급만 유지할 수는 없어요). 행마다 따로
        저장해야 반영돼요.
      </p>

      <input
        value={filter}
        onChange={(e) => setFilter(e.target.value)}
        placeholder="게시판 이름/슬러그 검색"
        className="mb-4 w-full max-w-sm rounded-md border border-gray-300 px-3 py-1.5 text-sm"
      />

      {error && <p className="mb-3 text-sm text-red-600">{error}</p>}

      {!boards ? (
        <p className="text-sm text-gray-500">불러오는 중...</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full border-collapse text-xs">
            <thead>
              <tr className="border-b border-gray-300 text-left">
                <th className="sticky left-0 bg-white p-2 pr-4 font-semibold">게시판</th>
                {TIERS.map((t) => (
                  <th key={t.label} className="p-2 font-semibold whitespace-nowrap">
                    {t.label}
                  </th>
                ))}
                <th className="p-2 font-semibold whitespace-nowrap">뱃지 대상</th>
                <th className="p-2" />
              </tr>
            </thead>
            <tbody>
              {filter.trim() ? (
                filtered.map((board) => (
                  <BoardEditorRow
                    key={board.id}
                    board={board}
                    depth={0}
                    draft={drafts[board.id] ?? board}
                    dirty={isDirty(board.id)}
                    saving={saving === board.id}
                    savedAt={!!savedAt[board.id]}
                    onUpdate={updateDraft}
                    onUpdateDailyLimit={updateDailyLimit}
                    onSave={save}
                  />
                ))
              ) : (
                <TreeRows
                  nodes={roots}
                  depth={0}
                  collapsedKeys={collapsedKeys}
                  onToggleCollapsed={toggleCollapsed}
                  drafts={drafts}
                  saving={saving}
                  savedAt={savedAt}
                  onUpdate={updateDraft}
                  onUpdateDailyLimit={updateDailyLimit}
                  onSave={save}
                  isDirty={isDirty}
                />
              )}
              {!filter.trim() &&
                unmatched.map((board) => (
                  <BoardEditorRow
                    key={board.id}
                    board={board}
                    depth={0}
                    draft={drafts[board.id] ?? board}
                    dirty={isDirty(board.id)}
                    saving={saving === board.id}
                    savedAt={!!savedAt[board.id]}
                    onUpdate={updateDraft}
                    onUpdateDailyLimit={updateDailyLimit}
                    onSave={save}
                  />
                ))}
            </tbody>
          </table>
          {!filter.trim() && unmatched.length > 0 && (
            <p className="mt-2 text-[11px] text-gray-400">
              위 {unmatched.length}개는 사이트 메뉴 카테고리 체계에 없는 게시판이라 미분류로 맨 아래 표시했어요.
            </p>
          )}
        </div>
      )}
    </main>
  );
}

function FolderHeaderRow({
  node,
  depth,
  collapsed,
  onToggle,
}: {
  node: TreeNode;
  depth: number;
  collapsed: boolean;
  onToggle: () => void;
}) {
  return (
    <tr className="border-b border-gray-100 bg-gray-50">
      <td colSpan={TIERS.length + 3} className="sticky left-0 bg-gray-50 p-2">
        <button
          type="button"
          onClick={onToggle}
          style={{ paddingLeft: depth * 16 }}
          className="flex items-center gap-1.5 font-semibold text-gray-700"
        >
          <span className="inline-block w-3 text-gray-400">{collapsed ? "▶" : "▼"}</span>
          📁 {node.title}
        </button>
      </td>
    </tr>
  );
}

function TreeRows({
  nodes,
  depth,
  collapsedKeys,
  onToggleCollapsed,
  drafts,
  saving,
  savedAt,
  onUpdate,
  onUpdateDailyLimit,
  onSave,
  isDirty,
}: {
  nodes: TreeNode[];
  depth: number;
  collapsedKeys: Set<string>;
  onToggleCollapsed: (key: string) => void;
  drafts: Record<string, BoardRow>;
  saving: string | null;
  savedAt: Record<string, number>;
  onUpdate: (boardId: string, patch: Partial<BoardRow>) => void;
  onUpdateDailyLimit: (boardId: string, tierRank: number, raw: string) => void;
  onSave: (boardId: string) => void;
  isDirty: (boardId: string) => boolean;
}) {
  return (
    <>
      {nodes.map((node) => {
        const hasChildren = node.children.length > 0;
        const collapsed = collapsedKeys.has(node.key);
        return (
          <FragmentNode key={node.key}>
            {hasChildren && (
              <FolderHeaderRow node={node} depth={depth} collapsed={collapsed} onToggle={() => onToggleCollapsed(node.key)} />
            )}
            {(!hasChildren || !collapsed) && node.board && (
              <BoardEditorRow
                board={node.board}
                depth={hasChildren ? depth + 1 : depth}
                draft={drafts[node.board.id] ?? node.board}
                dirty={isDirty(node.board.id)}
                saving={saving === node.board.id}
                savedAt={!!savedAt[node.board.id]}
                onUpdate={onUpdate}
                onUpdateDailyLimit={onUpdateDailyLimit}
                onSave={onSave}
              />
            )}
            {hasChildren && !collapsed && (
              <TreeRows
                nodes={node.children}
                depth={depth + 1}
                collapsedKeys={collapsedKeys}
                onToggleCollapsed={onToggleCollapsed}
                drafts={drafts}
                saving={saving}
                savedAt={savedAt}
                onUpdate={onUpdate}
                onUpdateDailyLimit={onUpdateDailyLimit}
                onSave={onSave}
                isDirty={isDirty}
              />
            )}
          </FragmentNode>
        );
      })}
    </>
  );
}

// <tbody> 안에서는 React.Fragment 대신 실제 태그가 필요 없는 경우에도
// key가 있는 감싸개가 필요해 별도 헬퍼로 뺐다(<>...</> 는 key를 못 받음).
function FragmentNode({ children }: { children: ReactNode }) {
  return <>{children}</>;
}

function BoardEditorRow({
  board,
  depth,
  draft,
  dirty,
  saving,
  savedAt,
  onUpdate,
  onUpdateDailyLimit,
  onSave,
}: {
  board: BoardRow;
  depth: number;
  draft: BoardRow;
  dirty: boolean;
  saving: boolean;
  savedAt: boolean;
  onUpdate: (boardId: string, patch: Partial<BoardRow>) => void;
  onUpdateDailyLimit: (boardId: string, tierRank: number, raw: string) => void;
  onSave: (boardId: string) => void;
}) {
  return (
    <tr className="border-b border-gray-100 align-top">
      <td className="sticky left-0 bg-white p-2 pr-4" style={{ paddingLeft: 8 + depth * 16 }}>
        <div className="font-medium text-gray-900">{board.name}</div>
        <div className="text-gray-400">{board.category}</div>
      </td>
      {TIERS.map((tier) => (
        <td key={tier.label} className="p-2">
          <div className="flex flex-wrap gap-1">
            {CAPS.map((cap) => {
              const granted = isGranted(draft[cap.key] as number | null, tier.rank);
              return (
                <button
                  key={cap.key}
                  type="button"
                  onClick={() =>
                    onUpdate(board.id, {
                      [cap.key]: toggle(draft[cap.key] as number | null, tier.rank),
                    } as Partial<BoardRow>)
                  }
                  className={`rounded-full border px-1.5 py-0.5 whitespace-nowrap ${
                    granted ? "border-gray-800 bg-gray-800 text-white" : "border-gray-200 bg-white text-gray-300"
                  }`}
                >
                  {cap.label}
                </button>
              );
            })}
          </div>
          {tier.rank != null && (
            <div className="mt-1 flex items-center gap-1 text-gray-400">
              <span>일일</span>
              <input
                type="number"
                min={0}
                value={draft.daily_view_limits?.[String(tier.rank)] ?? ""}
                onChange={(e) => onUpdateDailyLimit(board.id, tier.rank as number, e.target.value)}
                placeholder="무제한"
                className="w-14 rounded border border-gray-200 px-1 py-0.5 text-gray-700"
              />
            </div>
          )}
        </td>
      ))}
      <td className="p-2">
        <select
          value={draft.badge_min_rank ?? ""}
          onChange={(e) => onUpdate(board.id, { badge_min_rank: e.target.value === "" ? null : Number(e.target.value) })}
          className="rounded-md border border-gray-300 px-1.5 py-1"
        >
          {BADGE_OPTIONS.map((opt) => (
            <option key={opt.label} value={opt.value ?? ""}>
              {opt.label}
            </option>
          ))}
        </select>
      </td>
      <td className="p-2">
        <button
          type="button"
          onClick={() => onSave(board.id)}
          disabled={!dirty || saving}
          className="rounded-md bg-gray-900 px-3 py-1 text-white disabled:opacity-40"
        >
          {saving ? "저장 중..." : "저장"}
        </button>
        {!dirty && savedAt && <span className="ml-2 text-green-600">저장됨</span>}
      </td>
    </tr>
  );
}
