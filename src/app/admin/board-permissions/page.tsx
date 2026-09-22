"use client";

import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/lib/AuthProvider";
import {
  fetchNavBranches,
  fetchBoardBranchMap,
  buildAdminTree,
  type NavBranchNode,
  type AdminTreeRow,
} from "@/lib/adminTreeGrouping";

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

// HOTFIX-161.6(사용자 신고 — "여전히 내가 원하는 스크린샷의 상위 카테고리와
// 그 아래 하위 카테고리가 아니야"): EPIC-161 Phase 4가 만든 트리는
// boardLayout.ts의 INDIVIDUAL_BOARD_DEFINITIONS(코드에 하드코딩된 parent/
// title_ko)를 근거로 삼았는데, 이건 "/admin/site-structure"(사이트 메뉴,
// 사용자가 원하는 실제 기준 화면)가 보여주는 실제 site_navigations 트리와
// 다른 별개의 분류 체계였다 — 그래서 상위/하위 카테고리가 실제 사이트
// 메뉴와 안 맞았다. adminTreeGrouping.ts(fetchNavBranches/fetchBoardBranchMap/
// buildAdminTree)가 이미 "전체 글 관리"(AdminPostsBoardView.tsx)에서 같은
// 문제(게시글을 실제 site_navigations 트리 기준으로 보여주기)를 정확히
// 풀어둔 공용 유틸이다 — 새로 만들지 않고 그대로 재사용한다: 게시판의
// "진짜 소속"은 그 게시판을 board 위젯으로 연결한 페이지가 site_navigations
// 트리의 어느 가지에 있는지로 정확히 계산되고(카테고리 문자열 매칭이
// 아니라 실제 연결 관계), 매칭 안 되는 게시판은 "기타 / 미분류" 버킷으로
// (buildAdminTree가 자동으로) 모인다.

export default function BoardPermissionsPage() {
  const { session, member, loading, memberLoading } = useAuth();
  const [boards, setBoards] = useState<BoardRow[] | null>(null);
  const [drafts, setDrafts] = useState<Record<string, BoardRow>>({});
  const [saving, setSaving] = useState<string | null>(null);
  const [savedAt, setSavedAt] = useState<Record<string, number>>({});
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState("");

  // HOTFIX-161.6: 게시판 목록과 나란히, 실제 site_navigations 트리(branches)
  // + "이 게시판이 그 트리의 어느 가지에 연결됐는지"(boardBranchMap)를
  // 함께 불러온다 — /admin/site-structure(사이트 메뉴)와 완전히 같은
  // 근거 데이터라 거기 보이는 상위/하위 구조가 여기서도 그대로 재현된다.
  const [branches, setBranches] = useState<NavBranchNode[]>([]);
  const [boardBranchMap, setBoardBranchMap] = useState<Map<string, string>>(new Map());

  useEffect(() => {
    if (loading || memberLoading || !session || !member?.is_admin) return;
    let cancelled = false;
    (async () => {
      try {
        const [res, navBranches] = await Promise.all([
          fetch("/api/admin/boards", {
            headers: { Authorization: `Bearer ${session.access_token}` },
          }),
          fetchNavBranches(),
        ]);
        const data: BoardRow[] = await res.json();
        if (cancelled) return;
        if (!res.ok) {
          setError("게시판 목록을 불러오지 못했어요.");
          return;
        }
        const branchMap = await fetchBoardBranchMap(navBranches);
        if (cancelled) return;
        setBranches(navBranches);
        setBoardBranchMap(branchMap);
        setBoards(data);
        const initial: Record<string, BoardRow> = {};
        for (const b of data) initial[b.id] = b;
        setDrafts(initial);
      } catch {
        if (!cancelled) setError("게시판 목록을 불러오지 못했어요.");
      }
    })();
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

  const treeRows = useMemo(
    () => buildAdminTree(boards ?? [], (b) => boardBranchMap.get(b.id) ?? null, branches, "all"),
    [boards, boardBranchMap, branches],
  );

  // 기본은 전부 펼친 상태(매트릭스를 훑어보는 화면이라 접혀 있으면 오히려
  // 불편) — 이 Set에 들어있는 브랜치 id만 접힌 것으로 취급한다.
  const [collapsedKeys, setCollapsedKeys] = useState<Set<string>>(new Set());
  function toggleCollapsed(key: string) {
    setCollapsedKeys((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  // buildAdminTree는 항상 "펼친" 평면 목록을 주므로, 접힌 브랜치의 자손
  // (더 깊은 depth의 뒤따르는 행들)을 걸러내는 건 이 화면에서 처리한다 —
  // depth-first로 순회하다 접힌 브랜치를 만나면 그보다 깊은 행을 다음에
  // depth가 그 이하로 돌아올 때까지 스킵한다.
  const visibleRows = useMemo(() => {
    const rows: AdminTreeRow<BoardRow>[] = [];
    let hideDeeperThan: number | null = null;
    for (const row of treeRows) {
      if (hideDeeperThan !== null) {
        if (row.depth > hideDeeperThan) continue;
        hideDeeperThan = null;
      }
      rows.push(row);
      if (row.kind === "branch" && collapsedKeys.has(row.id)) {
        hideDeeperThan = row.depth;
      }
    }
    return rows;
  }, [treeRows, collapsedKeys]);

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
              {filter.trim()
                ? filtered.map((board) => (
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
                : visibleRows.map((row) =>
                    row.kind === "branch" ? (
                      <FolderHeaderRow
                        key={`branch-${row.id}`}
                        title={row.title}
                        depth={row.depth}
                        collapsed={collapsedKeys.has(row.id)}
                        onToggle={() => toggleCollapsed(row.id)}
                      />
                    ) : (
                      <BoardEditorRow
                        key={row.item.id}
                        board={row.item}
                        depth={row.depth}
                        draft={drafts[row.item.id] ?? row.item}
                        dirty={isDirty(row.item.id)}
                        saving={saving === row.item.id}
                        savedAt={!!savedAt[row.item.id]}
                        onUpdate={updateDraft}
                        onUpdateDailyLimit={updateDailyLimit}
                        onSave={save}
                      />
                    ),
                  )}
            </tbody>
          </table>
        </div>
      )}
    </main>
  );
}

// HOTFIX-161.6: buildAdminTree가 이미 펼친 평면 목록(branch/item)을 주므로
// 재귀 렌더링 컴포넌트가 더 필요 없다 — 폴더 헤더 하나만 남았다.
function FolderHeaderRow({
  title,
  depth,
  collapsed,
  onToggle,
}: {
  title: string;
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
          📁 {title}
        </button>
      </td>
    </tr>
  );
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
