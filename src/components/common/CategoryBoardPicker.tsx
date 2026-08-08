"use client";

import { useEffect, useMemo, useState } from "react";
import type { NavBranchNode } from "@/lib/adminTreeGrouping";
import { ColumnList } from "@/components/common/MillerColumnList";

// EPIC-084-REVISED: "게시될 페이지 선택"/"위젯 설정 - 게시판 선택"에 쓰이던
// 단일 <select>(사람이 읽기 힘든 긴 들여쓰기 나열 + 일부 게시판은 slug가
// 없어 UUID 앞 8자리가 그대로 노출되는 문제)를 완전히 대체하는 3열
// Miller Columns 선택기. UUID는 절대 화면에 노출하지 않는다 — 항상
// title/name만 보여주고, 실제 값 전달은 board.slug(없으면 id, 내부적으로만
// 사용)로 한다.
//
// 데이터는 두 호출부(WriteBoardForm/글쓰기, admin 위젯 편집기)가 이미
// 각자의 방식(useBoardOptions 훅 / 직접 fetch)으로 branches+boardBranchMap+
// boards를 들고 있어, 여기서 다시 fetch하지 않고 그대로 props로 받는
// 순수 프레젠테이션 컴포넌트로 만든다(중복 조회 방지).

export type PickableBoard = { id: string; slug?: string | null; name: string; locked?: boolean };

const UNASSIGNED_ROOT_ID = "__unassigned_root__";

function isDescendantOrSelf(
  branchId: string,
  ancestorId: string,
  branchById: Map<string, NavBranchNode>,
): boolean {
  let current: NavBranchNode | undefined = branchById.get(branchId);
  while (current) {
    if (current.id === ancestorId) return true;
    current = current.parentId ? branchById.get(current.parentId) : undefined;
  }
  return false;
}

/** value(선택된 board slug/id)로부터 1열(root)/2열(mid) 초기 선택 상태를 역산한다. */
function computeInitialSelection(
  boardId: string | null,
  boardBranchMap: Map<string, string>,
  branchById: Map<string, NavBranchNode>,
): { rootId: string | null; midId: string | null } {
  if (!boardId) return { rootId: null, midId: null };
  const branchId = boardBranchMap.get(boardId);
  if (!branchId) return { rootId: UNASSIGNED_ROOT_ID, midId: null };

  const chain: NavBranchNode[] = [];
  let current: NavBranchNode | undefined = branchById.get(branchId);
  while (current) {
    chain.unshift(current);
    current = current.parentId ? branchById.get(current.parentId) : undefined;
  }
  return { rootId: chain[0]?.id ?? null, midId: chain[1]?.id ?? null };
}

export function CategoryBoardPicker({
  branches,
  boardBranchMap,
  boards,
  value,
  onChange,
  loading = false,
}: {
  branches: NavBranchNode[];
  boardBranchMap: Map<string, string>;
  boards: PickableBoard[];
  /** 현재 선택된 게시판의 slug(없으면 id) — 빈 문자열이면 선택 안 됨. */
  value: string;
  onChange: (value: string) => void;
  loading?: boolean;
}) {
  const branchById = useMemo(() => new Map(branches.map((b) => [b.id, b])), [branches]);
  // HOTFIX-090(요구사항: "게시판 선택의 게시판 순서도 사이트 메뉴의 카테고리
  // 정렬 순서와 같도록") — branches는 이미 fetchNavBranches()가 depth-first로
  // site_navigations.sort_order 그대로 펼친 배열이라, 그 배열 안 위치를 곧
  // "사이트 메뉴 순서"로 쓸 수 있다. 게시판을 자신이 속한 브랜치의 이 순서로
  // 정렬한다.
  const branchOrderIndex = useMemo(() => new Map(branches.map((b, i) => [b.id, i])), [branches]);
  const boardBySlugOrId = useMemo(() => {
    const map = new Map<string, PickableBoard>();
    for (const b of boards) map.set(b.slug ?? b.id, b);
    return map;
  }, [boards]);

  const initial = useMemo(() => {
    const board = value ? boardBySlugOrId.get(value) : undefined;
    return computeInitialSelection(board?.id ?? null, boardBranchMap, branchById);
  }, [value, boardBySlugOrId, boardBranchMap, branchById]);

  const [rootId, setRootId] = useState<string | null>(initial.rootId);
  const [midId, setMidId] = useState<string | null>(initial.midId);

  // value가 외부에서 바뀌면(예: ?boardId= 쿼리로 다시 진입) 선택 경로를 다시 맞춘다.
  useEffect(() => {
    setRootId(initial.rootId);
    setMidId(initial.midId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initial.rootId, initial.midId]);

  const unassignedBoards = useMemo(
    () => boards.filter((b) => !boardBranchMap.has(b.id)),
    [boards, boardBranchMap],
  );

  const rootItems = useMemo(() => {
    const items = branches
      .filter((b) => b.parentId === null)
      .map((b) => ({ id: b.id, label: b.title }));
    if (unassignedBoards.length > 0) {
      items.push({ id: UNASSIGNED_ROOT_ID, label: "기타 / 미분류" });
    }
    return items;
  }, [branches, unassignedBoards]);

  const midItems = useMemo(() => {
    if (!rootId || rootId === UNASSIGNED_ROOT_ID) return [];
    return branches
      .filter((b) => b.parentId === rootId)
      .map((b) => ({ id: b.id, label: b.title }));
  }, [branches, rootId]);

  const boardItems = useMemo(() => {
    if (!rootId) return [];
    if (rootId === UNASSIGNED_ROOT_ID) {
      return unassignedBoards
        .filter((b) => !b.locked)
        .map((b) => ({ id: b.slug ?? b.id, label: b.name }));
    }
    const anchorId = midId ?? rootId;
    return boards
      .filter((b) => !b.locked)
      .filter((b) => {
        const branchId = boardBranchMap.get(b.id);
        return branchId ? isDescendantOrSelf(branchId, anchorId, branchById) : false;
      })
      .sort((a, b) => {
        const aOrder = branchOrderIndex.get(boardBranchMap.get(a.id) ?? "") ?? Number.MAX_SAFE_INTEGER;
        const bOrder = branchOrderIndex.get(boardBranchMap.get(b.id) ?? "") ?? Number.MAX_SAFE_INTEGER;
        return aOrder - bOrder;
      })
      .map((b) => ({ id: b.slug ?? b.id, label: b.name }));
  }, [rootId, midId, boards, boardBranchMap, branchById, branchOrderIndex, unassignedBoards]);

  if (loading) {
    return <p className="text-sm text-gray-500">게시판 목록을 불러오는 중...</p>;
  }

  return (
    <div className="grid grid-cols-3 gap-2">
      <ColumnList
        items={rootItems}
        selectedId={rootId}
        onSelect={(id) => {
          setRootId(id);
          setMidId(null);
        }}
        emptyLabel="카테고리 없음"
      />
      <ColumnList
        items={midItems}
        selectedId={midId}
        onSelect={(id) => setMidId(id)}
        emptyLabel={rootId ? "하위 카테고리 없음" : "먼저 왼쪽에서 선택하세요"}
      />
      <ColumnList
        items={boardItems}
        selectedId={value || null}
        onSelect={(id) => onChange(id)}
        emptyLabel={rootId ? "게시판 없음" : "먼저 카테고리를 선택하세요"}
      />
    </div>
  );
}
