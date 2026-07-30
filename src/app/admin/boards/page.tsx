"use client";

import { Suspense, useEffect, useMemo, useState, type ReactNode } from "react";
import Link from "next/link";
import {
  DndContext,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import { SortableContext, useSortable, verticalListSortingStrategy, arrayMove } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useAuth } from "@/lib/AuthProvider";
import { GROUP_OPTIONS, RENDER_TYPE_OPTIONS } from "@/components/admin/BoardForm";
import { ConfirmModal } from "@/components/admin/ConfirmModal";
import { AdminDomainTabs, useAdminDomainFilter } from "@/components/admin/AdminDomainTabs";
import { type AdminDomain } from "@/lib/adminDomainGrouping";
import {
  fetchNavBranches,
  fetchBoardBranchMap,
  buildAdminTree,
  type NavBranchNode,
} from "@/lib/adminTreeGrouping";
import { computeAdminTreeSections, buildSiblingMap } from "@/lib/adminTreeSections";

type BoardRow = {
  id: string;
  name: string;
  category: string | null;
  is_public?: boolean;
  group_key?: string | null;
  render_type?: string | null;
  // EPIC-075: 관리자 트리 화면의 드래그앤드롭 순서.
  sort_order?: number;
};

const GROUP_LABEL = Object.fromEntries(GROUP_OPTIONS.map((o) => [o.value, o.label]));
const RENDER_TYPE_LABEL = Object.fromEntries(RENDER_TYPE_OPTIONS.map((o) => [o.value, o.label]));

// EPIC-066: 게시판 관리 목록 — is_admin 가드는 src/app/admin/layout.tsx가
// 이미 처리한다. 게시판 수가 ~90개 수준이라(요구사항 ⑬) 검색/필터는 서버
// 라운드트립 없이 클라이언트에서 처리한다.
// EPIC-072: 도메인 필터 탭이 useSearchParams를 쓰므로 Suspense로 감싼다.
export default function AdminBoardsPage() {
  return (
    <Suspense fallback={<main className="flex-1 px-8 pb-8 max-w-5xl mx-auto w-full" />}>
      <AdminBoardsPageContent />
    </Suspense>
  );
}

function AdminBoardsPageContent() {
  const { session } = useAuth();
  const domainFilter = useAdminDomainFilter();

  const [boards, setBoards] = useState<BoardRow[]>([]);
  const [branches, setBranches] = useState<NavBranchNode[]>([]);
  const [boardBranchMap, setBoardBranchMap] = useState<Map<string, string>>(new Map());
  const [fetching, setFetching] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [q, setQ] = useState("");
  const [groupFilter, setGroupFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [duplicatingId, setDuplicatingId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<BoardRow | null>(null);
  const [deleting, setDeleting] = useState(false);

  async function load() {
    if (!session) return;
    setFetching(true);
    const res = await fetch("/api/admin/boards", {
      headers: { Authorization: `Bearer ${session.access_token}` },
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error ?? "게시판 목록을 불러오지 못했어요.");
      setFetching(false);
      return;
    }
    const navBranches = await fetchNavBranches();
    const branchMap = await fetchBoardBranchMap(navBranches);
    setBranches(navBranches);
    setBoardBranchMap(branchMap);
    setError(null);
    setBoards(Array.isArray(data) ? data : []);
    setFetching(false);
  }

  useEffect(() => {
    if (session) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session]);

  const branchById = useMemo(() => new Map(branches.map((b) => [b.id, b])), [branches]);

  function domainOfBoard(board: BoardRow): AdminDomain {
    const branchId = boardBranchMap.get(board.id);
    return branchId ? (branchById.get(branchId)?.domain ?? "common") : "common";
  }

  const filtered = useMemo(() => {
    const query = q.trim().toLowerCase();
    return boards.filter((b) => {
      if (domainFilter !== "all" && domainOfBoard(b) !== domainFilter) return false;
      if (groupFilter !== "all" && (b.group_key ?? "") !== groupFilter) return false;
      if (typeFilter !== "all" && (b.render_type ?? "") !== typeFilter) return false;
      if (!query) return true;
      return (
        b.name.toLowerCase().includes(query) ||
        (b.category ?? "").toLowerCase().includes(query)
      );
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [boards, q, groupFilter, typeFilter, domainFilter, boardBranchMap, branchById]);

  const domainCounts = useMemo(() => {
    const c: Partial<Record<AdminDomain | "all", number>> = { all: boards.length };
    for (const b of boards) {
      const d = domainOfBoard(b);
      c[d] = (c[d] ?? 0) + 1;
    }
    return c;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [boards, boardBranchMap, branchById]);

  // 사이트 내비게이션 트리 그대로 들여쓰기된 행 목록 — 매칭 안 되는
  // 게시판은 맨 끝 "기타 / 미분류"로 모인다. 검색/필터(q/groupFilter/
  // typeFilter)는 이미 걸러진 filtered 배열에 대해 적용한다.
  const treeRows = useMemo(
    () => buildAdminTree(filtered, (b) => boardBranchMap.get(b.id) ?? null, branches, domainFilter),
    [filtered, boardBranchMap, branches, domainFilter],
  );

  // EPIC-075: 드래그앤드롭 순서 변경 — 같은 브랜치(형제 그룹) 안에서만
  // 허용한다(다른 브랜치로 옮기는 재분류는 /admin/navigation 담당). 검색/
  // 필터가 걸려 있으면 그 필터링된 부분집합 안에서만 순서를 바꾸게 된다 —
  // 필터를 끄면 전체 순서 중 그 결과다.
  const sections = useMemo(() => computeAdminTreeSections(treeRows), [treeRows]);
  const siblingMap = useMemo(() => buildSiblingMap(sections), [sections]);
  const sensors = useSensors(useSensor(PointerSensor));

  async function handleDragEnd(e: DragEndEvent) {
    if (!session) return;
    const { active, over } = e;
    if (!over || active.id === over.id) return;

    const activeId = String(active.id);
    const overId = String(over.id);
    const siblings = siblingMap.get(activeId);
    if (!siblings || !siblings.includes(overId)) return; // 다른 브랜치로는 드롭 불가

    const reordered = arrayMove(siblings, siblings.indexOf(activeId), siblings.indexOf(overId));

    // 낙관적 업데이트: 로컬 boards 배열도 같은 순서로 재배치해 즉시 반영.
    setBoards((prev) => {
      const byId = new Map(prev.map((b) => [b.id, b]));
      const reorderedBoards = reordered.map((id) => byId.get(id)).filter((b): b is BoardRow => !!b);
      const reorderedSet = new Set(reordered);
      let cursor = 0;
      return prev.map((b) => (reorderedSet.has(b.id) ? reorderedBoards[cursor++] : b));
    });

    await Promise.all(
      reordered.map((id, index) =>
        fetch(`/api/admin/boards/${id}`, {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({ sort_order: index }),
        }),
      ),
    );
  }

  async function handleDuplicate(board: BoardRow) {
    if (!session) return;
    setDuplicatingId(board.id);
    const res = await fetch(`/api/admin/boards/${board.id}/duplicate`, {
      method: "POST",
      headers: { Authorization: `Bearer ${session.access_token}` },
    });
    const data = await res.json();
    setDuplicatingId(null);
    if (!res.ok) {
      setError(data.error ?? "복제에 실패했어요.");
      return;
    }
    await load();
  }

  async function handleDelete() {
    if (!session || !deleteTarget) return;
    setDeleting(true);
    const res = await fetch(`/api/admin/boards/${deleteTarget.id}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${session.access_token}` },
    });
    const data = await res.json();
    setDeleting(false);
    if (!res.ok) {
      setError(data.error ?? "삭제에 실패했어요.");
      setDeleteTarget(null);
      return;
    }
    setDeleteTarget(null);
    setBoards((rows) => rows.filter((r) => r.id !== deleteTarget.id));
  }

  return (
    <main className="flex-1 px-8 pb-8 max-w-5xl mx-auto w-full">
      <div className="flex items-center justify-between mb-6 pt-2">
        <h1 className="text-2xl font-bold">게시판 관리</h1>
        <Link
          href="/admin/boards/new"
          className="rounded-md bg-gray-900 px-4 py-2 text-sm text-white hover:bg-gray-800"
        >
          + 새 게시판
        </Link>
      </div>

      <AdminDomainTabs counts={domainCounts} />

      <div className="flex flex-wrap gap-2 mb-4">
        <input
          type="text"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="제목 또는 슬러그 검색"
          className="rounded-md border border-gray-300 px-3 py-1.5 text-sm w-64"
        />
        <select
          value={groupFilter}
          onChange={(e) => setGroupFilter(e.target.value)}
          className="rounded-md border border-gray-300 px-2 py-1.5 text-sm"
        >
          <option value="all">전체 Category</option>
          {GROUP_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
          className="rounded-md border border-gray-300 px-2 py-1.5 text-sm"
        >
          <option value="all">전체 Board Type</option>
          {RENDER_TYPE_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </div>

      {error && (
        <div className="rounded-lg border border-red-300 bg-red-50 p-3 text-sm text-red-700 mb-4">
          {error}
        </div>
      )}

      {fetching ? (
        <p className="text-gray-500">불러오는 중...</p>
      ) : filtered.length === 0 ? (
        <p className="text-gray-500">표시할 게시판이 없어요.</p>
      ) : (
        <div className="overflow-x-auto">
          <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="text-left text-gray-500 border-b border-gray-200">
                  <th className="py-2 pr-1 w-6"></th>
                  <th className="py-2 pr-3">제목</th>
                  <th className="py-2 pr-3">슬러그</th>
                  <th className="py-2 pr-3">Category</th>
                  <th className="py-2 pr-3">Board Type</th>
                  <th className="py-2 pr-3">공개 여부</th>
                  <th className="py-2 pr-3"></th>
                </tr>
              </thead>
              <tbody>
                {renderBoardTreeRows(treeRows, sections, {
                  onDuplicate: handleDuplicate,
                  onDelete: setDeleteTarget,
                  duplicatingId,
                })}
              </tbody>
            </table>
          </DndContext>
        </div>
      )}

      <ConfirmModal
        open={!!deleteTarget}
        title="게시판 삭제"
        message={`"${deleteTarget?.name ?? ""}" 게시판을 정말 삭제하시겠습니까?`}
        confirmLabel={deleting ? "삭제 중..." : "삭제"}
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </main>
  );
}

// EPIC-075: treeRows(브랜치 헤더 + 항목이 섞인 평평한 배열)를 순회하며, 항목이
// 연속되는 구간마다 sections[i]의 id 목록으로 SortableContext를 열어준다 —
// admin/pages/page.tsx의 renderTreeRows와 동일한 패턴(테이블 행 버전).
function renderBoardTreeRows(
  treeRows: ReturnType<typeof buildAdminTree<BoardRow>>,
  sections: ReturnType<typeof computeAdminTreeSections<BoardRow>>,
  actions: {
    onDuplicate: (board: BoardRow) => void;
    onDelete: (board: BoardRow) => void;
    duplicatingId: string | null;
  },
) {
  const elements: ReactNode[] = [];
  let sectionIndex = -1;
  let i = 0;

  while (i < treeRows.length) {
    const row = treeRows[i];
    if (row.kind === "branch") {
      sectionIndex++;
      elements.push(
        <tr key={`branch-${row.id}`}>
          <td
            colSpan={7}
            style={{ paddingLeft: row.depth * 20 }}
            className="pt-4 pb-1 text-xs font-semibold uppercase tracking-wide text-gray-400"
          >
            📂 {row.title}
          </td>
        </tr>,
      );
      i++;
      continue;
    }

    const itemIds = sections[sectionIndex]?.itemIds ?? [];
    const runStart = i;
    while (i < treeRows.length && treeRows[i].kind === "item") i++;
    const itemRows = treeRows.slice(runStart, i) as Extract<
      (typeof treeRows)[number],
      { kind: "item" }
    >[];

    elements.push(
      <SortableContext key={`section-${sectionIndex}`} items={itemIds} strategy={verticalListSortingStrategy}>
        {itemRows.map((r) => (
          <SortableBoardRow key={r.item.id} row={r} actions={actions} />
        ))}
      </SortableContext>,
    );
  }

  return elements;
}

function SortableBoardRow({
  row,
  actions,
}: {
  row: { depth: number; item: BoardRow };
  actions: {
    onDuplicate: (board: BoardRow) => void;
    onDelete: (board: BoardRow) => void;
    duplicatingId: string | null;
  };
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: row.item.id,
  });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  };

  return (
    <tr ref={setNodeRef} style={style} className="border-b border-gray-100 bg-white">
      <td className="py-2 pr-1">
        <button
          type="button"
          {...attributes}
          {...listeners}
          aria-label="드래그해서 순서 변경"
          className="cursor-grab text-gray-400 select-none touch-none"
        >
          ⠿
        </button>
      </td>
      <td className="py-2 pr-3" style={{ paddingLeft: row.depth * 20 }}>
        <Link href={`/admin/boards/${row.item.id}`} className="hover:underline font-medium">
          📄 {row.item.name}
        </Link>
      </td>
      <td className="py-2 pr-3 text-gray-500">{row.item.category ?? "-"}</td>
      <td className="py-2 pr-3 text-gray-500">
        {row.item.group_key ? GROUP_LABEL[row.item.group_key] ?? row.item.group_key : "-"}
      </td>
      <td className="py-2 pr-3 text-gray-500">
        {row.item.render_type ? RENDER_TYPE_LABEL[row.item.render_type] ?? row.item.render_type : "-"}
      </td>
      <td className="py-2 pr-3">
        {row.item.is_public === false ? (
          <span className="px-2 py-0.5 rounded text-xs bg-amber-100 text-amber-700">비공개</span>
        ) : (
          <span className="px-2 py-0.5 rounded text-xs bg-green-100 text-green-700">공개</span>
        )}
      </td>
      <td className="py-2 pr-3">
        <div className="flex gap-2">
          <Link
            href={`/admin/boards/${row.item.id}`}
            className="rounded-md border border-gray-300 px-2 py-1 text-xs hover:bg-gray-50"
          >
            수정
          </Link>
          <button
            type="button"
            onClick={() => actions.onDuplicate(row.item)}
            disabled={actions.duplicatingId === row.item.id}
            className="rounded-md border border-gray-300 px-2 py-1 text-xs hover:bg-gray-50 disabled:opacity-50"
          >
            복제
          </button>
          <button
            type="button"
            onClick={() => actions.onDelete(row.item)}
            className="rounded-md border border-gray-300 px-2 py-1 text-xs text-red-600 hover:bg-red-50"
          >
            삭제
          </button>
        </div>
      </td>
    </tr>
  );
}
