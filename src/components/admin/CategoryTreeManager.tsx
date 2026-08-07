"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabaseClient";
import { ensurePageForSlug, hrefToSlug } from "@/lib/pageTemplates";
import { WIDGET_DEFAULT_SETTINGS } from "@/lib/pageBuilder";
import { fetchNavBranches, fetchBoardBranchMap } from "@/lib/adminTreeGrouping";
import { RENDER_TYPE_OPTIONS, RANK_OPTIONS } from "@/components/admin/BoardForm";

// EPIC-035: 티스토리 스타일 드래그앤드롭 카테고리(site_navigations) 관리
// 컴포넌트. 상단 탭/좌측 사이드바/우측 사이드바 3개 관리 화면(각각
// src/app/admin/navigation/{top-tabs,sidebar-left,sidebar-right}/page.tsx)에서
// 지금까지 써온 정적 NavNodeEditor(EPIC-023/027)를 대체하는 것이 아니라,
// 이번 EPIC의 수정 대상 파일이 admin/navigation/page.tsx로 한정되어 있어
// 새 통합 관리 화면으로 별도 제공한다(NEXT_TASK.md 참고 — 기존 3개
// 페이지는 이번 EPIC 범위 밖이라 그대로 남아있음).
//
// D&D 구현: dnd-kit(@dnd-kit/core + /sortable). 트리를 "부모 id별 자식
// 목록" 다중 컨테이너(list-<parentId|root>)로 보고, 컨테이너마다 별도
// SortableContext를 재귀적으로 중첩해서 렌더링한다. 같은 컨테이너 안에서
// 드래그하면 순서(sort_order)만 바뀌고, 다른 행(다른 컨테이너) 위로
// 드롭하면 그 행의 자식으로 재부모화(parent_id 변경)된다. 컨테이너 자체도
// useDroppable로 등록해두어 자식이 하나도 없는 행에도 드롭할 수 있다.

export type TargetTypeLiteral = "tab" | "sidebar_left" | "sidebar_right" | "dropdown";

type CategoryNavRow = {
  id: string;
  key: string | null;
  title: string;
  href: string | null;
  parent_id: string | null;
  target_type: TargetTypeLiteral;
  sort_order: number;
  is_active: boolean;
  topic: string | null;
  thumbnail_url: string | null;
  description: string | null;
  is_public: boolean;
};

const STORAGE_BUCKET = "public-assets";
// EPIC-079-PHASE-4 후속: "미분류 페이지"를 별도 패널이 아니라 이 트리 안의
// 진짜 노드(부모 없는 루트 하나 아래에 전부 자식으로)로 편입시켜, 드래그로
// 실제 메뉴 위치로 옮기는 것과 추가/수정/페이지 수정/관리/삭제를 별도 구현
// 없이 기존 CategoryRow/DnD 메커니즘 그대로 재사용한다. key로 고정 식별해
// 여러 번 로드해도 이 버킷 행을 중복 생성하지 않는다. is_active=false라
// 실제 사이트 상단 탭에는 노출되지 않는다(관리자 화면에서만 보임).
const UNASSIGNED_BUCKET_KEY = "__unassigned_pages__";

const inputClass =
  "w-full rounded-md border border-gray-300 px-2 py-1 text-sm";
const smallButtonClass =
  "rounded-md border border-gray-300 px-2 py-1 text-xs hover:bg-gray-50";
const primaryButtonClass =
  "rounded-md bg-gray-800 text-white px-3 py-1.5 text-sm disabled:opacity-50";

function containerIdOf(parentId: string | null) {
  return `list-${parentId ?? "root"}`;
}

function parentIdOfContainer(containerId: string): string | null {
  const raw = containerId.slice(5);
  return raw === "root" ? null : raw;
}

// 자기 자신의 자손 밑으로는 드래그해서 넣을 수 없다(순환 참조 방지).
function isDescendant(
  candidateId: string,
  ancestorId: string,
  rows: CategoryNavRow[],
): boolean {
  let current = rows.find((r) => r.id === candidateId);
  while (current?.parent_id) {
    if (current.parent_id === ancestorId) return true;
    current = rows.find((r) => r.id === current!.parent_id);
  }
  return false;
}

// EPIC-087-PHASE-B: 게시판도 이 트리 안에서 드래그로 다른 분기(branch)에
// 재배정할 수 있게 한다 — site_navigations 행(id가 곧 dnd id)과 같은
// DndContext 안에서 구별되게 게시판 dnd id는 "board-" 접두사를 쓴다.
// 분기별 게시판 목록은 site_navigations 재배치(parent_id/sort_order)와는
// 다른 데이터(page_modules 연결)를 바꾸는 별도의 SortableContext 그룹
// ("boardlist-<branchId|unassigned>")으로 둔다 — 같은 컨테이너 안에서
// 순서만 바꿀 때는 boards.sort_order를, 다른 분기로 넘길 때는
// page_modules(module_type='board') 연결 자체를 바꾼다.
type BoardRow = {
  id: string;
  name: string;
  sort_order: number;
  is_public: boolean;
  render_type: string | null;
};

const UNASSIGNED_BOARDS_CONTAINER = "boardlist-unassigned";

function boardDndId(boardId: string) {
  return `board-${boardId}`;
}
function isBoardDndId(id: string) {
  return id.startsWith("board-");
}
function rawBoardId(dndId: string) {
  return dndId.slice("board-".length);
}
function boardListContainerId(branchId: string | null) {
  return branchId ? `boardlist-${branchId}` : UNASSIGNED_BOARDS_CONTAINER;
}
function branchIdOfBoardListContainer(containerId: string): string | null {
  const raw = containerId.slice("boardlist-".length);
  return raw === "unassigned" ? null : raw;
}

export function CategoryTreeManager({
  title,
  targetTypes,
  session,
}: {
  title: string;
  // EPIC-079-PHASE-4: 이전엔 필수였다 — "상단 탭"/"왼쪽 사이드바"/
  // "오른쪽 사이드바" 3개 인스턴스를 각각 target_type으로 나눠 렌더링하는
  // 가짜 그룹핑이었는데, 실제 프론트엔드는 site_navigations 하나를
  // parent_id로만 구성된 단일 트리로 읽는다(navConfig.ts의 buildNavTree —
  // depth 0 행이 곧 상단 탭, target_type은 그 행이 "어떻게 렌더링될지"를
  // 결정하는 depth-0 전용 속성일 뿐 별도 컨테이너가 아니다). 이제
  // targetTypes를 생략하면 모든 target_type을 하나의 트리로 보여준다 —
  // depth 0 = 상단 탭 전체, depth 1+ = 그 탭 아래 내용. 특정 하위집합만
  // 보고 싶은 경우를 위해 지정 옵션 자체는 남겨둔다(현재 실사용처 없음).
  targetTypes?: TargetTypeLiteral[];
  // EPIC-077: "사이트 구성 관리" 통합 트리에서 "관리" 모달이 연결된 게시판을
  // 직접 선택/변경/해제할 수 있게 하려면 관리자 세션 토큰이 필요(boards는
  // anon 직접 쓰기가 없어 /api/admin/boards를 거친다) — /admin/navigation
  // (기존 CategoryTreeManager 단독 사용처)에서는 생략 가능(undefined면
  // 게시판 섹션의 저장 버튼이 동작하지 않을 뿐 렌더링 자체는 된다).
  session?: Session | null;
}) {
  const [rows, setRows] = useState<CategoryNavRow[]>([]);
  const [fetching, setFetching] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [managingId, setManagingId] = useState<string | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);
  // EPIC-079-PHASE-4: targetTypes 없이(=단일 통합 트리) "+최상위 추가"를
  // 누르면 어떤 종류의 새 상단 탭을 만들지 미리 골라야 한다 — 예전엔
  // targetTypes[0]으로 항상 고정돼 있었지만, 이제 한 화면에서 4종류 전부를
  // 다루므로 명시적 선택이 필요하다.
  const [newRootType, setNewRootType] = useState<TargetTypeLiteral>(targetTypes?.[0] ?? "tab");
  // EPIC-077: href → 연결된 page_builder id — 행의 "페이지 수정" 바로가기
  // 버튼용. hrefToSlug(nav.href) === page.slug 완전 일치 규칙(adminTreeGrouping.ts
  // 와 동일)으로 매칭한다.
  const [pageIdBySlug, setPageIdBySlug] = useState<Map<string, string>>(new Map());
  // EPIC-087-PHASE-B: 게시판 D&D — boardBranchMap은 fetchBoardBranchMap의
  // "추정 매칭"(module_type='board' page_modules 연결 기준)을 그대로 쓴다.
  const [allBoards, setAllBoards] = useState<BoardRow[]>([]);
  const [boardBranchMap, setBoardBranchMap] = useState<Map<string, string>>(new Map());
  const [managingBoardId, setManagingBoardId] = useState<string | null>(null);
  const [boardDragError, setBoardDragError] = useState<string | null>(null);
  // EPIC-087-PHASE-B: 페이지(nav 행)/게시판 체크박스 일괄 삭제 — 같은 dnd id
  // 네임스페이스(nav 행은 raw uuid, 게시판은 "board-" 접두사)를 그대로
  // 선택 키로 재사용해 타입을 구분한다.
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkDeleting, setBulkDeleting] = useState(false);
  // EPIC-088: 사이트 메뉴 트리 접기/펼치기(아코디언) — 기본은 전부 펼침
  // 상태(collapsedIds가 비어있음)이고, 토글한 노드의 id만 이 Set에
  // 추가/제거한다. 트리 재조회(load()) 후에도 유지되도록 별도 state로 둔다
  // (rows와 독립적).
  const [collapsedIds, setCollapsedIds] = useState<Set<string>>(new Set());
  function toggleCollapsed(id: string) {
    setCollapsedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  const sensors = useSensors(useSensor(PointerSensor));

  const NAV_SELECT_FIELDS =
    "id, key, title, href, parent_id, target_type, sort_order, is_active, topic, thumbnail_url, description, is_public";

  // EPIC-079-PHASE-4 후속: page_builder에 있지만 어떤 site_navigations
  // 행에도 매칭 안 된 페이지들을 "미분류 페이지" 버킷 아래 실제 행으로
  // 만들어 넣는다 — 이후로는 평범한 트리 노드라 드래그로 옮기거나 기존
  // 추가/수정/페이지 수정/관리/삭제 버튼을 그대로 쓸 수 있다. 되돌릴
  // 새 행이 하나도 없으면 아무 것도 하지 않는다(버킷 자체도 안 만듦).
  // EPIC-084-REVISED: "사이트 메뉴 URL 정돈" 요청 조사 중 발견 — 이 함수가
  // page_builder의 모든 미연결 행을 무조건 흡수해왔는데, EPIC-064A가
  // PageEditButton을 전체 라우트에 기계적으로 부착하면서 실제로는
  // PageBuilderRenderer를 호출하지 않는 client-fetch 페이지(예: /boards,
  // /login, /settings)에도 빈 page_builder draft가 같이 생겨, 위젯이 하나도
  // 없는 이 "가짜" 페이지들까지 "미분류 페이지"로 뒤섞여 보였다(실사용 시
  // 53개까지 쌓인 것 확인, docs/sql/EPIC-084-REVISED-cleanup-empty-unassigned-pages.sql로
  // 기존에 쌓인 빈 항목 정리 완료). 위젯이 하나도 없는 페이지는 애초에
  // "미분류 콘텐츠"가 아니라 편집 버튼용 빈 placeholder일 뿐이므로 이 트리에
  // 흡수하지 않는다.
  async function ensureUnassignedPagesInTree(existingRows: CategoryNavRow[]): Promise<boolean> {
    const [{ data: pagesData }, { data: moduleRows }] = await Promise.all([
      supabase.from("page_builder").select("id, slug, title, description"),
      supabase.from("page_modules").select("page_id"),
    ]);
    if (!pagesData) return false;

    const pageIdsWithWidgets = new Set(
      ((moduleRows ?? []) as { page_id: string }[]).map((m) => m.page_id),
    );

    const linkedSlugs = new Set(
      existingRows.filter((r) => r.href).map((r) => hrefToSlug(r.href!)),
    );
    const unassigned = (
      pagesData as { id: string; slug: string; title: string; description: string | null }[]
    ).filter((p) => !linkedSlugs.has(p.slug) && pageIdsWithWidgets.has(p.id));
    if (unassigned.length === 0) return false;

    let bucketId = existingRows.find((r) => r.key === UNASSIGNED_BUCKET_KEY)?.id;
    if (!bucketId) {
      const { data: inserted, error: bucketError } = await supabase
        .from("site_navigations")
        .insert({
          key: UNASSIGNED_BUCKET_KEY,
          title: "미분류 페이지",
          parent_id: null,
          target_type: "tab",
          is_active: false,
          sort_order: 9999,
        })
        .select("id")
        .single();
      if (bucketError || !inserted) return false;
      bucketId = inserted.id as string;
    }

    const siblingCount = existingRows.filter((r) => r.parent_id === bucketId).length;
    const { error: insertError } = await supabase.from("site_navigations").insert(
      unassigned.map((p, i) => ({
        parent_id: bucketId,
        title: p.title,
        href: `/${p.slug}`,
        description: p.description,
        target_type: "tab" as TargetTypeLiteral,
        is_active: false,
        sort_order: siblingCount + i,
      })),
    );
    return !insertError;
  }

  async function load() {
    setFetching(true);
    const [navResult, pagesResult, boardsResult] = await Promise.all([
      supabase.from("site_navigations").select(NAV_SELECT_FIELDS).order("sort_order", { ascending: true }),
      supabase.from("page_builder").select("id, slug"),
      supabase.from("boards").select("id, name, sort_order, is_public, render_type").order("sort_order", { ascending: true }),
    ]);
    let { data } = navResult;
    const { error: fetchError } = navResult;

    if (pagesResult.data) {
      setPageIdBySlug(
        new Map(
          (pagesResult.data as { id: string; slug: string }[]).map((p) => [p.slug, p.id]),
        ),
      );
    }
    if (boardsResult.data) {
      setAllBoards(boardsResult.data as BoardRow[]);
    }
    // EPIC-087-PHASE-B: 게시판 → 분기 매칭은 site_navigations 전체가 아니라
    // is_active=true 브랜치만 대상으로 하는 fetchNavBranches() 결과를 쓴다
    // (adminTreeGrouping.ts의 기존 규약과 동일 — "미분류 페이지" 버킷처럼
    // is_active=false인 행에는 게시판을 배정할 수 없다).
    const navBranches = await fetchNavBranches();
    const branchMap = await fetchBoardBranchMap(navBranches);
    setBoardBranchMap(branchMap);

    if (fetchError) {
      setError(fetchError.message);
      setFetching(false);
      return;
    }

    const migrated = await ensureUnassignedPagesInTree((data ?? []) as CategoryNavRow[]);
    if (migrated) {
      const refreshed = await supabase
        .from("site_navigations")
        .select(NAV_SELECT_FIELDS)
        .order("sort_order", { ascending: true });
      if (refreshed.data) data = refreshed.data;
    }

    setError(null);
    setRows((data ?? []) as CategoryNavRow[]);
    setFetching(false);
  }

  useEffect(() => {
    load();
  }, []);

  const rootIds = new Set(
    rows
      .filter((r) => r.parent_id === null && (!targetTypes || targetTypes.includes(r.target_type)))
      .map((r) => r.id),
  );

  // 이 매니저가 다룰 트리에 속하는 행만(루트 + 그 자손) 추림 — 같은
  // site_navigations 테이블을 다른 target_type의 매니저 인스턴스와 공유하므로
  // 서로 다른 트리가 섞여 보이지 않게 한다.
  function belongsToThisTree(row: CategoryNavRow): boolean {
    if (rootIds.has(row.id)) return true;
    let current: CategoryNavRow | undefined = row;
    while (current?.parent_id) {
      if (rootIds.has(current.parent_id)) return true;
      current = rows.find((r) => r.id === current!.parent_id);
    }
    return false;
  }

  const scopedRows = rows.filter(belongsToThisTree);

  async function persistRows(
    updates: { id: string; parent_id: string | null; sort_order: number; is_active?: boolean }[],
  ) {
    const results = await Promise.all(
      updates.map((u) =>
        supabase
          .from("site_navigations")
          .update({
            parent_id: u.parent_id,
            sort_order: u.sort_order,
            ...(u.is_active !== undefined ? { is_active: u.is_active } : {}),
          })
          .eq("id", u.id),
      ),
    );
    const failed = results.find((r) => r.error);
    if (failed?.error) {
      setError(failed.error.message);
      await load();
    }
  }

  function handleDragStart(e: DragStartEvent) {
    setActiveId(String(e.active.id));
  }

  async function handleDragEnd(e: DragEndEvent) {
    setActiveId(null);
    const { active, over } = e;
    if (!over || active.id === over.id) return;

    if (isBoardDndId(String(active.id))) {
      await handleBoardDragEnd(rawBoardId(String(active.id)), String(over.id));
      return;
    }

    const activeRow = rows.find((r) => r.id === active.id);
    if (!activeRow) return;

    const overId = String(over.id);
    const overIsContainer = overId.startsWith("list-");
    const destContainerId = overIsContainer
      ? overId
      : containerIdOf(rows.find((r) => r.id === overId)?.parent_id ?? null);
    const destParentId = parentIdOfContainer(destContainerId);

    if (destParentId === activeRow.id) return; // 자기 자신에게는 드롭 불가
    if (destParentId && isDescendant(destParentId, activeRow.id, rows)) return;

    const sourceContainerId = containerIdOf(activeRow.parent_id);

    const destSiblings = rows
      .filter(
        (r) => containerIdOf(r.parent_id) === destContainerId && r.id !== activeRow.id,
      )
      .sort((a, b) => a.sort_order - b.sort_order);

    const destIndex = overIsContainer
      ? destSiblings.length
      : Math.max(0, destSiblings.findIndex((r) => r.id === overId));

    const insertAt = overIsContainer ? destSiblings.length : destIndex;
    destSiblings.splice(insertAt, 0, { ...activeRow, parent_id: destParentId });

    // EPIC-079-PHASE-4 후속: "미분류 페이지" 버킷 밖으로 드래그해서 실제
    // 메뉴 위치에 놓으면, 그 자리로 옮겨진 게 곧 "이제 진짜 메뉴에 넣고
    // 싶다"는 의도이므로 비활성(is_active=false)이던 상태를 자동으로
    // 활성화한다 — 버킷 안에서의 이동이나 버킷 자체로의 이동은 그대로 둔다.
    const unassignedBucketId = rows.find((r) => r.key === UNASSIGNED_BUCKET_KEY)?.id ?? null;
    const movingOutOfUnassigned =
      activeRow.parent_id === unassignedBucketId && destParentId !== unassignedBucketId;

    const updates: { id: string; parent_id: string | null; sort_order: number; is_active?: boolean }[] =
      destSiblings.map((r, i) => ({
        id: r.id,
        parent_id: destParentId,
        sort_order: i,
        ...(r.id === activeRow.id && movingOutOfUnassigned ? { is_active: true } : {}),
      }));

    if (sourceContainerId !== destContainerId) {
      const sourceSiblings = rows
        .filter(
          (r) =>
            containerIdOf(r.parent_id) === sourceContainerId && r.id !== activeRow.id,
        )
        .sort((a, b) => a.sort_order - b.sort_order);
      sourceSiblings.forEach((r, i) =>
        updates.push({ id: r.id, parent_id: r.parent_id, sort_order: i }),
      );
    }

    setRows((prev) =>
      prev.map((r) => {
        const u = updates.find((x) => x.id === r.id);
        return u
          ? { ...r, parent_id: u.parent_id, sort_order: u.sort_order, is_active: u.is_active ?? r.is_active }
          : r;
      }),
    );

    await persistRows(updates);
  }

  // EPIC-087-PHASE-B: 게시판 드래그 — 같은 분기 안에서 움직였으면 순서만
  // (boards.sort_order, /admin/boards/[id] PATCH — UnassignedBoardsPanel과
  // 동일한 관례), 다른 분기로 넘겼으면 page_modules(module_type='board')
  // 연결 자체를 옮긴다(saveBoardLink()와 동일한 direct supabase 쓰기,
  // 새 API 라우트 추가하지 않음).
  async function handleBoardDragEnd(activeBoardId: string, overIdStr: string) {
    setBoardDragError(null);
    const sourceBranchId = boardBranchMap.get(activeBoardId) ?? null;

    let destBranchId: string | null;
    if (overIdStr.startsWith("boardlist-")) {
      destBranchId = branchIdOfBoardListContainer(overIdStr);
    } else if (isBoardDndId(overIdStr)) {
      destBranchId = boardBranchMap.get(rawBoardId(overIdStr)) ?? null;
    } else {
      // 게시판 카드를 nav 행 자체(그 행의 게시판 목록 컨테이너가 아니라
      // 행 카드 위) 위로 떨어뜨린 경우도 "그 분기로 배정"으로 취급한다.
      destBranchId = overIdStr;
    }

    const destSiblings = allBoards
      .filter((b) => b.id !== activeBoardId && (boardBranchMap.get(b.id) ?? null) === destBranchId)
      .sort((a, b) => a.sort_order - b.sort_order);

    const overBoardId = isBoardDndId(overIdStr) ? rawBoardId(overIdStr) : null;
    const destIndex = overBoardId
      ? Math.max(0, destSiblings.findIndex((b) => b.id === overBoardId))
      : destSiblings.length;
    destSiblings.splice(destIndex, 0, allBoards.find((b) => b.id === activeBoardId)!);

    if (destBranchId === sourceBranchId) {
      // 같은 분기 안 재정렬 — sort_order만 재계산.
      const updates = destSiblings.map((b, i) => ({ id: b.id, sort_order: i }));
      setAllBoards((prev) =>
        prev.map((b) => {
          const u = updates.find((x) => x.id === b.id);
          return u ? { ...b, sort_order: u.sort_order } : b;
        }),
      );
      if (!session) return;
      const results = await Promise.all(
        updates.map((u) =>
          fetch(`/api/admin/boards/${u.id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json", Authorization: `Bearer ${session.access_token}` },
            body: JSON.stringify({ sort_order: u.sort_order }),
          }),
        ),
      );
      if (results.some((r) => !r.ok)) {
        setBoardDragError("게시판 순서 저장에 실패한 항목이 있어요.");
        await load();
      }
      return;
    }

    // 다른 분기로 재배정 — 목적지 분기에 연결된 페이지를 찾는다(그 분기
    // nav 행의 href → page_builder.id, pageIdBySlug는 이미 로드돼 있음).
    let destPageId: string | null = null;
    if (destBranchId) {
      const destRow = rows.find((r) => r.id === destBranchId);
      const destSlug = destRow?.href ? hrefToSlug(destRow.href) : null;
      destPageId = destSlug ? (pageIdBySlug.get(destSlug) ?? null) : null;
      if (!destPageId) {
        setBoardDragError(
          "이 메뉴 항목에는 아직 연결된 페이지가 없어 게시판을 배정할 수 없어요 — 먼저 href를 지정해 페이지를 만들어주세요.",
        );
        return;
      }
    }

    // 낙관적 갱신 — 실패하면 load()로 서버 진실값으로 되돌린다.
    setBoardBranchMap((prev) => {
      const next = new Map(prev);
      if (destBranchId) next.set(activeBoardId, destBranchId);
      else next.delete(activeBoardId);
      return next;
    });

    try {
      const { data: existingLinks, error: fetchLinksError } = await supabase
        .from("page_modules")
        .select("id")
        .eq("board_id", activeBoardId)
        .eq("module_type", "board");
      if (fetchLinksError) throw fetchLinksError;

      if (destPageId) {
        if (existingLinks && existingLinks.length > 0) {
          const [first, ...rest] = existingLinks as { id: string }[];
          const { error: updateError } = await supabase
            .from("page_modules")
            .update({ page_id: destPageId, sort_order: destIndex })
            .eq("id", first.id);
          if (updateError) throw updateError;
          if (rest.length > 0) {
            const { error: deleteError } = await supabase
              .from("page_modules")
              .delete()
              .in("id", rest.map((r) => r.id));
            if (deleteError) throw deleteError;
          }
        } else {
          const { error: insertError } = await supabase.from("page_modules").insert({
            page_id: destPageId,
            module_type: "board",
            board_id: activeBoardId,
            settings: WIDGET_DEFAULT_SETTINGS.board ?? {},
            sort_order: destIndex,
            is_hidden: false,
          });
          if (insertError) throw insertError;
        }
      } else if (existingLinks && existingLinks.length > 0) {
        const { error: deleteError } = await supabase
          .from("page_modules")
          .delete()
          .in("id", (existingLinks as { id: string }[]).map((r) => r.id));
        if (deleteError) throw deleteError;
      }
    } catch (err) {
      setBoardDragError(err instanceof Error ? err.message : "게시판 재배정에 실패했어요.");
      await load();
      return;
    }

    await load();
  }

  async function addChild(parentId: string | null, targetType: TargetTypeLiteral) {
    const siblingCount = rows.filter((r) => r.parent_id === parentId).length;
    const { data: inserted, error: insertError } = await supabase
      .from("site_navigations")
      .insert({
        parent_id: parentId,
        title: "새 항목",
        target_type: targetType,
        sort_order: siblingCount,
      })
      .select("id")
      .single();
    if (insertError || !inserted) {
      setError(insertError?.message ?? "카테고리 생성에 실패했어요.");
      return;
    }

    // EPIC-079-PHASE-2: 생성 직후엔 href가 비어있어 updateRow의 href-저장
    // 트리거(EPIC-068)가 한 번도 실행되지 않고, 그래서 "페이지 수정" 버튼이
    // 관리자가 나중에 href를 수동 입력할 때까지 나타나지 않았다 — 생성 시점에
    // 새 행의 id 기반 고유 href를 바로 채워 넣어 ensurePageForSlug가 즉시
    // 실행되도록 한다. 관리자는 이후 원하는 href로 자유롭게 덮어쓸 수 있다
    // (updateRow가 그 새 href에 대해서도 동일하게 페이지를 자동 생성/재사용).
    const autoHref = `/c/${inserted.id}`;
    const { error: hrefError } = await supabase
      .from("site_navigations")
      .update({ href: autoHref })
      .eq("id", inserted.id);
    if (!hrefError) {
      ensurePageForSlug(hrefToSlug(autoHref), "새 항목", null).catch(() => {});
    }

    await load();
  }

  async function updateRow(id: string, patch: Partial<CategoryNavRow>) {
    const { error: updateError } = await supabase
      .from("site_navigations")
      .update(patch)
      .eq("id", id);
    if (updateError) {
      setError(updateError.message);
      return false;
    }
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, ...patch } : r)));

    // EPIC-068: href가 (새로) 채워지는 순간이 "이 카테고리가 실제 링크를
    // 갖게 된" 시점이다 — 그때 page_builder 행 + 기본 위젯 템플릿을 자동
    // 생성한다(이미 있으면 손대지 않음, ensurePageForSlug 참고). 페이지
    // 생성 실패는 카테고리 저장 자체를 막지 않도록 조용히 무시한다.
    if (patch.href) {
      const current = rows.find((r) => r.id === id);
      const nextTitle = patch.title ?? current?.title ?? "";
      const nextDescription = patch.description ?? current?.description ?? null;
      ensurePageForSlug(hrefToSlug(patch.href), nextTitle, nextDescription).catch(() => {});
    }

    return true;
  }

  // EPIC-084: "미분류 페이지" 삭제가 안 지워지던 버그 — ensureUnassignedPagesInTree가
  // 매 load()마다 "아직 어떤 site_navigations 행에도 안 걸린 page_builder
  // 페이지"를 이 버킷 아래 행으로 되살려 넣는다. 그런데 버킷 노드를
  // site_navigations 행만 지우면(기존 로직) 원본 page_builder 페이지는
  // 그대로 남아있으니, deleteRow 끝의 await load()가 돌자마자 곧바로 같은
  // 링크가 재생성됐다 — 눈에는 "삭제가 안 됨"으로 보였다. 버킷 아래
  // 노드를 지울 때는 링크가 아니라 그 링크가 가리키는 실제 페이지를
  // /api/admin/pages(EPIC-079-PHASE-5)로 지워야 재생성 조건 자체가 사라진다.
  async function deleteRow(id: string) {
    const row = rows.find((r) => r.id === id);
    if (!confirm("이 항목과 하위 항목을 모두 삭제할까요?")) return;

    const unassignedBucketId = rows.find((r) => r.key === UNASSIGNED_BUCKET_KEY)?.id ?? null;
    if (row && unassignedBucketId && row.parent_id === unassignedBucketId && row.href && session) {
      const pageId = pageIdBySlug.get(hrefToSlug(row.href));
      if (pageId) {
        const res = await fetch(`/api/admin/pages/${pageId}`, {
          method: "DELETE",
          headers: { Authorization: `Bearer ${session.access_token}` },
        });
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          setError(data.error ?? "페이지 삭제에 실패했어요.");
          return;
        }
        // 페이지 자체가 사라졌으니 이 링크 행도 함께 정리한다(안 지워도
        // 다음 load()가 href→slug 매칭 실패로 알아서 걸러내지만, 즉시
        // 반영을 위해 같이 지운다).
        await supabase.from("site_navigations").delete().eq("id", id);
        await load();
        return;
      }
    }

    const { error: deleteError } = await supabase
      .from("site_navigations")
      .delete()
      .eq("id", id);
    if (deleteError) {
      setError(deleteError.message);
      return;
    }
    await load();
  }

  function toggleSelect(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  // EPIC-087-PHASE-B: 선택된 nav 행/게시판을 한 번에 삭제. nav 행은
  // deleteRow()와 동일하게 "미분류 페이지" 버킷 아래 항목이면 연결된
  // page_builder 페이지까지 함께 지운다(재생성 방지, EPIC-084 버그
  // 재발 방지 규칙 동일 적용) — 게시판은 기존 DELETE /api/admin/boards/[id]
  // 라우트를 그대로 재사용(글이 있는 게시판은 그 라우트가 이미 막아준다).
  async function bulkDeleteSelected() {
    if (selectedIds.size === 0) return;
    if (!confirm(`선택한 ${selectedIds.size}개 항목을 삭제할까요? 되돌릴 수 없습니다.`)) return;
    setBulkDeleting(true);

    const navIds = Array.from(selectedIds).filter((id) => !isBoardDndId(id));
    const boardIds = Array.from(selectedIds).filter(isBoardDndId).map(rawBoardId);

    const unassignedBucketId = rows.find((r) => r.key === UNASSIGNED_BUCKET_KEY)?.id ?? null;
    for (const id of navIds) {
      const row = rows.find((r) => r.id === id);
      if (row && unassignedBucketId && row.parent_id === unassignedBucketId && row.href && session) {
        const pageId = pageIdBySlug.get(hrefToSlug(row.href));
        if (pageId) {
          await fetch(`/api/admin/pages/${pageId}`, {
            method: "DELETE",
            headers: { Authorization: `Bearer ${session.access_token}` },
          }).catch(() => {});
        }
      }
    }
    if (navIds.length > 0) {
      const { error: navDeleteError } = await supabase.from("site_navigations").delete().in("id", navIds);
      if (navDeleteError) setError(navDeleteError.message);
    }

    if (boardIds.length > 0 && session) {
      const results = await Promise.all(
        boardIds.map((id) =>
          fetch(`/api/admin/boards/${id}`, {
            method: "DELETE",
            headers: { Authorization: `Bearer ${session.access_token}` },
          }),
        ),
      );
      const failedCount = results.filter((r) => !r.ok).length;
      if (failedCount > 0) {
        setError(`게시판 ${failedCount}개는 삭제하지 못했어요(연결된 글이 있을 수 있어요).`);
      }
    }

    setSelectedIds(new Set());
    setBulkDeleting(false);
    await load();
  }

  const roots = scopedRows
    .filter((r) => r.parent_id === null)
    .sort((a, b) => a.sort_order - b.sort_order);

  const managingRow = rows.find((r) => r.id === managingId) ?? null;
  const activeRow = rows.find((r) => r.id === activeId) ?? null;
  const activeBoard = activeId && isBoardDndId(activeId) ? allBoards.find((b) => b.id === rawBoardId(activeId)) : null;
  const managingBoard = allBoards.find((b) => b.id === managingBoardId) ?? null;

  return (
    <section className="rounded-lg border border-gray-200 p-4">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-lg font-semibold">{title}</h2>
        <div className="flex items-center gap-2">
          {/* EPIC-079-PHASE-4: targetTypes로 고정된 인스턴스가 아니면(=단일
              통합 트리) 새 상단 탭의 노출 방식(링크/드롭다운/좌우 사이드바)을
              먼저 골라야 한다 — Depth 0 추가가 곧 상단 탭 추가이므로. */}
          {!targetTypes && (
            <select
              value={newRootType}
              onChange={(e) => setNewRootType(e.target.value as TargetTypeLiteral)}
              className="text-xs rounded-md border border-gray-300 px-2 py-1"
            >
              {Object.entries(TARGET_TYPE_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          )}
          <button
            type="button"
            onClick={() => addChild(null, targetTypes?.[0] ?? newRootType)}
            className={smallButtonClass}
          >
            + 최상위 탭 추가
          </button>
          {selectedIds.size > 0 && (
            <button
              type="button"
              onClick={bulkDeleteSelected}
              disabled={bulkDeleting}
              className="rounded-md border border-red-300 px-2 py-1 text-xs text-red-600 hover:bg-red-50 disabled:opacity-50"
            >
              {bulkDeleting ? "삭제 중..." : `선택 ${selectedIds.size}개 삭제`}
            </button>
          )}
        </div>
      </div>

      {error && (
        <div className="rounded-lg border border-red-300 bg-red-50 p-3 text-sm text-red-700 mb-3">
          {error}
        </div>
      )}

      {fetching ? (
        <p className="text-gray-500 text-sm">불러오는 중...</p>
      ) : roots.length === 0 ? (
        <p className="text-gray-400 text-sm">아직 등록된 항목이 없어요.</p>
      ) : (
        <DndContext
          sensors={sensors}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
        >
          {boardDragError && (
            <div className="rounded-lg border border-red-300 bg-red-50 p-3 text-sm text-red-700 mb-3">
              {boardDragError}
            </div>
          )}
          <TreeLevel
            parentId={null}
            rows={scopedRows}
            depth={0}
            editingId={editingId}
            managingId={managingId}
            pageIdBySlug={pageIdBySlug}
            onEdit={setEditingId}
            onManage={setManagingId}
            onUpdate={updateRow}
            onDelete={deleteRow}
            onAddChild={addChild}
            allBoards={allBoards}
            boardBranchMap={boardBranchMap}
            onManageBoard={setManagingBoardId}
            selectedIds={selectedIds}
            onToggleSelect={toggleSelect}
            collapsedIds={collapsedIds}
            onToggleCollapsed={toggleCollapsed}
          />
          {/* EPIC-087-PHASE-B: 어떤 분기에도 매칭 안 된 게시판 — 여기로
              드래그하면 boardBranchMap에서 빠지고(연결 page_modules 삭제),
              여기서 다른 분기로 드래그해 배정할 수 있다. */}
          <div className="mt-4 pt-3 border-t border-dashed border-gray-200">
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-1">
              📋 미배정 게시판
            </p>
            <BoardListLevel
              branchId={null}
              allBoards={allBoards}
              boardBranchMap={boardBranchMap}
              onManageBoard={setManagingBoardId}
              selectedIds={selectedIds}
              onToggleSelect={toggleSelect}
            />
          </div>
          <DragOverlay>
            {activeRow && (
              <div className="rounded-lg border border-gray-400 bg-white p-2 shadow-lg text-sm">
                {activeRow.title}
              </div>
            )}
            {activeBoard && (
              <div className="rounded-lg border border-gray-400 bg-white p-2 shadow-lg text-sm">
                📌 {activeBoard.name}
              </div>
            )}
          </DragOverlay>
        </DndContext>
      )}

      {managingRow && (
        <CategoryDetailModal
          row={managingRow}
          session={session}
          onClose={() => setManagingId(null)}
          onSave={async (patch) => {
            const ok = await updateRow(managingRow.id, patch);
            if (ok) setManagingId(null);
          }}
        />
      )}

      {managingBoard && (
        <BoardQuickManageModal
          board={managingBoard}
          session={session}
          onClose={() => setManagingBoardId(null)}
          onSaved={(patch) => {
            setAllBoards((prev) => prev.map((b) => (b.id === managingBoard.id ? { ...b, ...patch } : b)));
            setManagingBoardId(null);
          }}
        />
      )}
    </section>
  );
}

function TreeLevel({
  parentId,
  rows,
  depth,
  editingId,
  managingId,
  pageIdBySlug,
  onEdit,
  onManage,
  onUpdate,
  onDelete,
  onAddChild,
  allBoards,
  boardBranchMap,
  onManageBoard,
  selectedIds,
  onToggleSelect,
  collapsedIds,
  onToggleCollapsed,
}: {
  parentId: string | null;
  rows: CategoryNavRow[];
  depth: number;
  editingId: string | null;
  managingId: string | null;
  pageIdBySlug: Map<string, string>;
  onEdit: (id: string | null) => void;
  onManage: (id: string | null) => void;
  onUpdate: (id: string, patch: Partial<CategoryNavRow>) => Promise<boolean>;
  onDelete: (id: string) => void;
  onAddChild: (parentId: string | null, targetType: TargetTypeLiteral) => void;
  allBoards: BoardRow[];
  boardBranchMap: Map<string, string>;
  onManageBoard: (id: string | null) => void;
  selectedIds: Set<string>;
  onToggleSelect: (id: string) => void;
  collapsedIds: Set<string>;
  onToggleCollapsed: (id: string) => void;
}) {
  const containerId = containerIdOf(parentId);
  const { setNodeRef } = useDroppable({ id: containerId });
  const children = rows
    .filter((r) => r.parent_id === parentId)
    .sort((a, b) => a.sort_order - b.sort_order);

  return (
    <div
      ref={setNodeRef}
      style={{ marginLeft: depth > 0 ? 20 : 0 }}
      className="space-y-1 min-h-[10px]"
    >
      <SortableContext
        items={children.map((c) => c.id)}
        strategy={verticalListSortingStrategy}
      >
        {children.length === 0 && depth > 0 && (
          <p className="text-xs text-gray-300 italic py-1">
            (여기로 드래그하면 하위 항목이 돼요)
          </p>
        )}
        {children.map((child) => {
          // EPIC-088: 이 노드가 접고 펼 것이 있는지(하위 nav 행 또는 배정된
          // 게시판) — 없으면 토글 아이콘 자체를 보여주지 않는다.
          const hasNavChildren = rows.some((r) => r.parent_id === child.id);
          const hasBoardChildren = allBoards.some(
            (b) => (boardBranchMap.get(b.id) ?? null) === child.id,
          );
          const hasChildren = hasNavChildren || hasBoardChildren;
          const collapsed = collapsedIds.has(child.id);
          return (
          <div key={child.id}>
            <CategoryRow
              row={child}
              isEditing={editingId === child.id}
              isManaging={managingId === child.id}
              pageId={child.href ? pageIdBySlug.get(hrefToSlug(child.href)) : undefined}
              onEdit={onEdit}
              onManage={onManage}
              onUpdate={onUpdate}
              onDelete={onDelete}
              onAddChild={onAddChild}
              isSelected={selectedIds.has(child.id)}
              onToggleSelect={onToggleSelect}
              hasChildren={hasChildren}
              collapsed={collapsed}
              onToggleCollapsed={() => onToggleCollapsed(child.id)}
            />
            {!collapsed && (
              <>
                <TreeLevel
                  parentId={child.id}
                  rows={rows}
                  depth={depth + 1}
                  editingId={editingId}
                  managingId={managingId}
                  pageIdBySlug={pageIdBySlug}
                  onEdit={onEdit}
                  onManage={onManage}
                  onUpdate={onUpdate}
                  onDelete={onDelete}
                  onAddChild={onAddChild}
                  allBoards={allBoards}
                  boardBranchMap={boardBranchMap}
                  onManageBoard={onManageBoard}
                  selectedIds={selectedIds}
                  onToggleSelect={onToggleSelect}
                  collapsedIds={collapsedIds}
                  onToggleCollapsed={onToggleCollapsed}
                />
                {/* EPIC-087-PHASE-B: 이 분기(nav 행)에 배정된 게시판 목록 —
                    nav 자식과는 별도 SortableContext(boardlist-<id>)라 순서
                    변경 로직이 서로 섞이지 않는다. */}
                <div style={{ marginLeft: (depth + 1) * 20 }}>
                  <BoardListLevel
                    branchId={child.id}
                    allBoards={allBoards}
                    boardBranchMap={boardBranchMap}
                    onManageBoard={onManageBoard}
                    selectedIds={selectedIds}
                    onToggleSelect={onToggleSelect}
                  />
                </div>
              </>
            )}
          </div>
          );
        })}
      </SortableContext>
    </div>
  );
}

// EPIC-087-PHASE-B: 특정 분기(branchId=null이면 미배정)에 배정된 게시판
// 목록 — 자체 SortableContext + useDroppable 컨테이너("boardlist-...")를
// 가진다. 비어 있어도 드롭 가능해야 하므로(다른 분기에서 게시판을 여기로
// 처음 옮겨올 때) 항상 렌더링한다.
function BoardListLevel({
  branchId,
  allBoards,
  boardBranchMap,
  onManageBoard,
  selectedIds,
  onToggleSelect,
}: {
  branchId: string | null;
  allBoards: BoardRow[];
  boardBranchMap: Map<string, string>;
  onManageBoard: (id: string | null) => void;
  selectedIds: Set<string>;
  onToggleSelect: (id: string) => void;
}) {
  const containerId = boardListContainerId(branchId);
  const { setNodeRef } = useDroppable({ id: containerId });
  const boards = allBoards
    .filter((b) => (boardBranchMap.get(b.id) ?? null) === branchId)
    .sort((a, b) => a.sort_order - b.sort_order);

  return (
    <div ref={setNodeRef} className="space-y-1 min-h-[8px] py-1">
      <SortableContext items={boards.map((b) => boardDndId(b.id))} strategy={verticalListSortingStrategy}>
        {boards.length === 0 ? (
          <p className="text-xs text-gray-300 italic py-0.5">(게시판을 여기로 드래그)</p>
        ) : (
          boards.map((board) => (
            <BoardCard
              key={board.id}
              board={board}
              onManage={() => onManageBoard(board.id)}
              isSelected={selectedIds.has(boardDndId(board.id))}
              onToggleSelect={() => onToggleSelect(boardDndId(board.id))}
            />
          ))
        )}
      </SortableContext>
    </div>
  );
}

function BoardCard({
  board,
  onManage,
  isSelected,
  onToggleSelect,
}: {
  board: BoardRow;
  onManage: () => void;
  isSelected: boolean;
  onToggleSelect: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: boardDndId(board.id),
  });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex flex-wrap items-center gap-2 rounded-md border border-gray-100 bg-gray-50 px-2 py-1.5"
    >
      <input type="checkbox" checked={isSelected} onChange={onToggleSelect} />
      <button
        type="button"
        {...attributes}
        {...listeners}
        aria-label="드래그해서 다른 분기로 이동"
        className="cursor-grab text-gray-400 px-1 select-none touch-none"
      >
        ⠿
      </button>
      <span className="text-sm">📌 {board.name}</span>
      {board.render_type && (
        <span className="text-xs px-1.5 py-0.5 rounded bg-gray-100 text-gray-600">{board.render_type}</span>
      )}
      {!board.is_public && (
        <span className="text-xs px-1.5 py-0.5 rounded bg-amber-100 text-amber-700">비공개</span>
      )}
      <div className="ml-auto flex gap-1">
        <a href={`/admin/boards/${board.id}`} target="_blank" rel="noreferrer" className={smallButtonClass}>
          수정
        </a>
        <button type="button" onClick={onManage} className={smallButtonClass}>
          관리
        </button>
      </div>
    </div>
  );
}

// EPIC-087-PHASE-B: "관리" 버튼 — CategoryDetailModal과 별개로, 게시판
// 요약 설정(공개 여부/Board Type)만 빠르게 바꾸는 작은 모달. 실제 저장은
// 기존 PATCH /api/admin/boards/[id](EDITABLE_FIELDS whitelist)를 그대로
// 재사용 — 새 라우트를 추가하지 않는다.
function BoardQuickManageModal({
  board,
  session,
  onClose,
  onSaved,
}: {
  board: BoardRow;
  session?: Session | null;
  onClose: () => void;
  onSaved: (patch: Partial<BoardRow>) => void;
}) {
  const [isPublic, setIsPublic] = useState(board.is_public);
  const [renderType, setRenderType] = useState(board.render_type ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSave() {
    if (!session) {
      setError("관리자 세션이 필요해요.");
      return;
    }
    setSaving(true);
    setError(null);
    const res = await fetch(`/api/admin/boards/${board.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${session.access_token}` },
      body: JSON.stringify({ is_public: isPublic, render_type: renderType || null }),
    });
    const data = await res.json();
    setSaving(false);
    if (!res.ok) {
      setError(data.error ?? "저장에 실패했어요.");
      return;
    }
    onSaved({ is_public: isPublic, render_type: renderType || null });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-sm rounded-lg bg-white p-6 space-y-4">
        <h3 className="text-lg font-medium">&ldquo;{board.name}&rdquo; 관리</h3>

        <div>
          <label className="block text-sm mb-1">공개 여부</label>
          <select
            className={inputClass}
            value={isPublic ? "public" : "private"}
            onChange={(e) => setIsPublic(e.target.value === "public")}
          >
            <option value="public">공개</option>
            <option value="private">비공개</option>
          </select>
        </div>

        <div>
          <label className="block text-sm mb-1">Board Type</label>
          <select className={inputClass} value={renderType} onChange={(e) => setRenderType(e.target.value)}>
            <option value="">(기본값)</option>
            {RENDER_TYPE_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <div className="flex gap-2 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 rounded-md border border-gray-300 bg-white text-gray-800 px-3 py-2 hover:bg-gray-50"
          >
            취소
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="flex-1 rounded-md bg-gray-800 text-white px-3 py-2 disabled:opacity-50"
          >
            {saving ? "저장 중..." : "저장"}
          </button>
        </div>
      </div>
    </div>
  );
}

function CategoryRow({
  row,
  isEditing,
  pageId,
  onEdit,
  onManage,
  onUpdate,
  onDelete,
  onAddChild,
  isSelected,
  onToggleSelect,
  hasChildren,
  collapsed,
  onToggleCollapsed,
}: {
  row: CategoryNavRow;
  isEditing: boolean;
  isManaging: boolean;
  // EPIC-077: 이 항목의 href와 매칭되는 page_builder.id — 있으면 "페이지
  // 수정" 바로가기 버튼을 노출한다.
  pageId?: string;
  onEdit: (id: string | null) => void;
  onManage: (id: string | null) => void;
  onUpdate: (id: string, patch: Partial<CategoryNavRow>) => Promise<boolean>;
  onDelete: (id: string) => void;
  onAddChild: (parentId: string | null, targetType: TargetTypeLiteral) => void;
  isSelected: boolean;
  onToggleSelect: (id: string) => void;
  // EPIC-088: 하위 nav 행/배정된 게시판이 하나라도 있으면 접기/펼치기
  // 토글 아이콘을 보여준다 — 없으면 접을 게 없으니 아이콘 자체를 숨긴다.
  hasChildren: boolean;
  collapsed: boolean;
  onToggleCollapsed: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: row.id });

  const [draft, setDraft] = useState({
    title: row.title,
    href: row.href ?? "",
    sortOrder: row.sort_order,
    isActive: row.is_active,
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setDraft({
      title: row.title,
      href: row.href ?? "",
      sortOrder: row.sort_order,
      isActive: row.is_active,
    });
  }, [row]);

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  };

  async function handleSave() {
    setSaving(true);
    await onUpdate(row.id, {
      title: draft.title,
      // EPIC-079-PHASE-4: href를 완전히 비워서 저장할 수 없게 한다 — href가
      // null이면 이 항목엔 영영 연결된 페이지가 안 생긴다(updateRow의
      // ensurePageForSlug는 href가 있을 때만 실행됨). 관리자가 href를
      // 지우면 addChild와 동일한 규칙(/c/{id})으로 되돌린다.
      href: draft.href.trim() || `/c/${row.id}`,
      sort_order: draft.sortOrder,
      is_active: draft.isActive,
    });
    setSaving(false);
    onEdit(null);
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex flex-wrap items-center gap-2 rounded-lg border border-gray-200 p-2 bg-white"
    >
      <input type="checkbox" checked={isSelected} onChange={() => onToggleSelect(row.id)} />
      <button
        type="button"
        {...attributes}
        {...listeners}
        aria-label="드래그해서 이동"
        className="cursor-grab text-gray-400 px-1 select-none touch-none"
      >
        ⠿
      </button>

      {/* EPIC-088: 아코디언 접기/펼치기 — 하위(nav 자식 또는 배정된
          게시판)가 있을 때만 아이콘을 보여준다. 드래그 핸들과 별개 버튼이라
          토글 클릭이 dnd-kit 리스너와 충돌하지 않는다. */}
      {hasChildren && (
        <button
          type="button"
          onClick={onToggleCollapsed}
          aria-expanded={!collapsed}
          aria-label={`${row.title} 하위 항목 ${collapsed ? "펼치기" : "접기"}`}
          className="text-gray-400 hover:text-gray-700 px-0.5 w-4 text-xs shrink-0"
        >
          {collapsed ? "▶" : "▼"}
        </button>
      )}

      {isEditing ? (
        <>
          <input
            className={inputClass}
            value={draft.title}
            onChange={(e) => setDraft({ ...draft, title: e.target.value })}
          />
          <input
            className={inputClass}
            placeholder="href"
            value={draft.href}
            onChange={(e) => setDraft({ ...draft, href: e.target.value })}
          />
          <input
            type="number"
            className={`${inputClass} w-16`}
            value={draft.sortOrder}
            onChange={(e) =>
              setDraft({ ...draft, sortOrder: Number(e.target.value) })
            }
          />
          <label className="flex items-center gap-1 text-xs text-gray-600">
            <input
              type="checkbox"
              checked={draft.isActive}
              onChange={(e) => setDraft({ ...draft, isActive: e.target.checked })}
            />
            활성
          </label>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className={primaryButtonClass}
          >
            {saving ? "저장 중..." : "확인"}
          </button>
          <button
            type="button"
            onClick={() => onEdit(null)}
            className={smallButtonClass}
          >
            취소
          </button>
        </>
      ) : (
        <>
          {row.thumbnail_url && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={row.thumbnail_url}
              alt=""
              className="w-6 h-6 rounded object-cover"
            />
          )}
          <span className="text-sm font-medium">{row.title}</span>
          {row.href && (
            <span className="text-xs text-gray-400">{row.href}</span>
          )}
          {/* EPIC-079-PHASE-5: `/c/{uuid}` — 새 항목 생성 시 ensurePageForSlug를
              바로 실행시키려고 임시로 채워두는 placeholder href(위 createRow
              참고)를 관리자가 실제 slug로 바꾸지 않고 방치한 경우, 사이트
              메뉴에 조잡한 UUID URL이 그대로 노출된다 — 방치되기 쉬우니
              트리에서 바로 눈에 띄도록 경고 배지를 붙인다. */}
          {row.href && /^\/c\/[0-9a-f-]{36}$/i.test(row.href) && (
            <span
              className="text-xs px-1.5 py-0.5 rounded bg-red-100 text-red-700"
              title="임시 URL이에요 — [관리]에서 사람이 읽기 쉬운 URL로 바꿔주세요"
            >
              URL 정리 필요
            </span>
          )}
          {!row.is_active && (
            <span className="text-xs px-1.5 py-0.5 rounded bg-gray-100 text-gray-500">
              비활성
            </span>
          )}
          {!row.is_public && (
            <span className="text-xs px-1.5 py-0.5 rounded bg-amber-100 text-amber-700">
              비공개
            </span>
          )}
          {row.topic && (
            <span className="text-xs px-1.5 py-0.5 rounded bg-gray-100 text-gray-600">
              #{row.topic}
            </span>
          )}
          {/* EPIC-079-PHASE-4: 최상위(=상단 탭) 노드는 노출 방식(링크/드롭다운/
              좌우 사이드바)이 "관리" 모달 안에 파묻혀 있어 바로 바꾸기 번거로웠다
              — 행에서 곧바로 고를 수 있는 전용 컨트롤을 추가한다. 하위 노드는
              상위(루트)의 target_type을 그대로 물려받으므로(트리 인스턴스가
              루트 target_type으로 범위를 나누던 이전 구조의 흔적) 여기서는
              편집 불가 — CategoryDetailModal과 동일한 규칙. */}
          {row.parent_id === null && (
            <select
              value={row.target_type}
              onChange={(e) => onUpdate(row.id, { target_type: e.target.value as TargetTypeLiteral })}
              className="text-xs rounded-md border border-gray-300 px-1.5 py-1"
              title="이 상단 탭의 노출 방식"
            >
              {Object.entries(TARGET_TYPE_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          )}

          <div className="ml-auto flex gap-1">
            <button
              type="button"
              onClick={() => onAddChild(row.id, row.target_type)}
              className={smallButtonClass}
            >
              추가
            </button>
            <button
              type="button"
              onClick={() => onEdit(row.id)}
              className={smallButtonClass}
            >
              수정
            </button>
            <EditPageButton row={row} pageId={pageId} onUpdate={onUpdate} />
            <button
              type="button"
              onClick={() => onManage(row.id)}
              className={smallButtonClass}
            >
              관리
            </button>
            <button
              type="button"
              onClick={() => onDelete(row.id)}
              className="rounded-md border border-gray-300 px-2 py-1 text-xs text-red-600 hover:bg-red-50"
            >
              삭제
            </button>
          </div>
        </>
      )}
    </div>
  );
}

// EPIC-079-PHASE-4: 노드 종류와 상관없이 "페이지 수정" 버튼을 항상
// 렌더링한다(이전엔 pageId가 이미 매칭된 행에만 보였음 — "Silo Story"처럼
// 순수 폴더로 만들어진 노드는 버튼 자체가 없었다). pageId가 아직 없으면
// (href가 비어있었거나, 마이그레이션 이전 데이터 등) 클릭 시 그 자리에서
// href를 보정하고(onUpdate) 페이지를 즉시 생성한 뒤(ensurePageForSlug)
// 이동한다 — "무조건 클릭 가능한 버튼"을 보장하는 실질적인 방법.
function EditPageButton({
  row,
  pageId,
  onUpdate,
}: {
  row: CategoryNavRow;
  pageId?: string;
  onUpdate: (id: string, patch: Partial<CategoryNavRow>) => Promise<boolean>;
}) {
  const router = useRouter();
  const [resolving, setResolving] = useState(false);

  async function handleClick() {
    if (pageId) {
      router.push(`/admin/pages/${pageId}`);
      return;
    }

    setResolving(true);
    const href = row.href?.trim() || `/c/${row.id}`;
    // onUpdate(부모의 updateRow)도 href가 채워지면 내부적으로
    // ensurePageForSlug를 부르지만 그건 "카테고리 저장 자체를 막지 않도록"
    // 일부러 fire-and-forget(await 안 함)이다 — 여기서는 실제로 페이지가
    // 만들어질 때까지 기다렸다가 이동해야 하므로 직접 await한다(경쟁 상태
    // 버그: onUpdate가 끝난 직후 바로 조회하면 아직 ensurePageForSlug의
    // insert가 커밋되기 전이라 못 찾는 경우가 있었다).
    await onUpdate(row.id, { href });
    const slug = hrefToSlug(href);
    await ensurePageForSlug(slug, row.title, row.description);
    const { data } = await supabase
      .from("page_builder")
      .select("id")
      .eq("slug", slug)
      .maybeSingle();
    setResolving(false);
    if (data?.id) router.push(`/admin/pages/${data.id}`);
  }

  return (
    <button type="button" onClick={handleClick} disabled={resolving} className={smallButtonClass}>
      {resolving ? "여는 중..." : "페이지 수정"}
    </button>
  );
}

const TARGET_TYPE_LABELS: Record<TargetTypeLiteral, string> = {
  tab: "상단 탭",
  dropdown: "드롭다운",
  sidebar_left: "왼쪽 사이드바",
  sidebar_right: "오른쪽 사이드바",
};

type LinkedPageInfo = {
  id: string;
  slug: string;
  status: "draft" | "published";
  // EPIC-088: "메뉴별 티어 접근 제어" — 사이트 메뉴 관리 화면에서 바로 이
  // 페이지의 최소 열람 등급을 보고/바꿀 수 있어야 한다는 요구. 이미
  // /admin/pages/[id]에 있는 page_builder.min_rank_to_read와 동일한 값 —
  // 새 컬럼을 추가하지 않고 그 값을 여기서도 편집한다.
  min_rank_to_read: number | null;
} | null;

type BoardDraft = {
  name: string;
  topic: string;
  thumbnail_url: string;
  description: string;
  is_public: boolean;
  // EPIC-087-PHASE-B: "관리" 모달에서 활성/비활성(is_public)뿐 아니라
  // 게시판 종류도 한눈에 보이게 — board_type은 생성 시 고정되는 값이라
  // (BoardForm에 편집 UI 없음) 읽기 전용 배지로만 노출한다.
  board_type: string;
  // EPIC-088: 게시판의 최소 열람 등급 — BoardForm.tsx와 동일한 값
  // (boards.min_rank_to_read)을 여기서도 바로 편집할 수 있게 한다.
  min_rank_to_read: number | null;
};

function CategoryDetailModal({
  row,
  session,
  onClose,
  onSave,
}: {
  row: CategoryNavRow;
  session?: Session | null;
  onClose: () => void;
  onSave: (patch: Partial<CategoryNavRow>) => void;
}) {
  const [isPublic, setIsPublic] = useState(row.is_public);
  const [topic, setTopic] = useState(row.topic ?? "");
  const [description, setDescription] = useState(row.description ?? "");
  const [thumbnailUrl, setThumbnailUrl] = useState(row.thumbnail_url ?? "");
  const [targetType, setTargetType] = useState<TargetTypeLiteral>(row.target_type);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // EPIC-077: 연결된 페이지(page_builder) — href가 있으면 hrefToSlug로
  // slug를 찾아 조회한다(ensurePageForSlug가 updateRow에서 이미 자동
  // 생성해주므로 보통 존재한다).
  const [pageInfo, setPageInfo] = useState<LinkedPageInfo>(null);
  const [pageLoading, setPageLoading] = useState(false);
  // EPIC-088: 페이지 최소 열람 등급 — pageInfo와 별도 draft state로 둬서
  // "저장" 버튼을 누르기 전까지는 다른 화면(usePageRankGate)에 영향을 주지
  // 않는다(공개/노출 위치 등 이 모달의 다른 필드와 동일한 관례).
  const [pageMinRank, setPageMinRank] = useState<number | null>(null);
  const [pageMinRankSaving, setPageMinRankSaving] = useState(false);
  const [pageMinRankSaved, setPageMinRankSaved] = useState(false);
  const [pageMinRankError, setPageMinRankError] = useState<string | null>(null);

  async function savePageMinRank() {
    if (!pageInfo) return;
    setPageMinRankSaving(true);
    setPageMinRankError(null);
    setPageMinRankSaved(false);
    const { error: updateError } = await supabase
      .from("page_builder")
      .update({ min_rank_to_read: pageMinRank, updated_at: new Date().toISOString() })
      .eq("id", pageInfo.id);
    setPageMinRankSaving(false);
    if (updateError) {
      setPageMinRankError(updateError.message);
      return;
    }
    setPageInfo((prev) => (prev ? { ...prev, min_rank_to_read: pageMinRank } : prev));
    setPageMinRankSaved(true);
  }

  useEffect(() => {
    if (!row.href) {
      setPageInfo(null);
      return;
    }
    let cancelled = false;
    setPageLoading(true);
    supabase
      .from("page_builder")
      .select("id, slug, status, min_rank_to_read")
      .eq("slug", hrefToSlug(row.href))
      .maybeSingle()
      .then(({ data }) => {
        if (cancelled) return;
        setPageInfo((data as LinkedPageInfo) ?? null);
        setPageMinRank((data as LinkedPageInfo)?.min_rank_to_read ?? null);
        setPageLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [row.href]);

  // EPIC-077: 연결된 게시판 — 어느 게시판을 연결할지 직접 선택/변경/해제할
  // 수 있어야 한다는 요구에 따라, page_modules(module_type='board',
  // board_id) 행 하나("이 페이지의 대표 게시판", 위젯 빌더가 board 위젯을
  // 추가할 때와 동일한 구조)를 이 모달에서 직접 만들고/바꾸고/지운다 —
  // fetchBoardBranchMap의 "추정 매칭"에 더 이상 기대지 않는다.
  const [allBoards, setAllBoards] = useState<{ id: string; name: string }[]>([]);
  const [boardModule, setBoardModule] = useState<{ id: string; board_id: string } | null>(null);
  const [moduleCount, setModuleCount] = useState(0);
  const [selectedBoardId, setSelectedBoardId] = useState("");
  const [linkSaving, setLinkSaving] = useState(false);
  const [linkSaved, setLinkSaved] = useState(false);
  const [linkError, setLinkError] = useState<string | null>(null);

  useEffect(() => {
    // boards는 공개 읽기 RLS라 세션 없이도 목록을 볼 수 있다.
    supabase
      .from("boards")
      .select("id, name")
      .order("name")
      .then(({ data }) => setAllBoards((data as { id: string; name: string }[]) ?? []));
  }, []);

  useEffect(() => {
    if (!pageInfo) {
      setBoardModule(null);
      setSelectedBoardId("");
      return;
    }
    let cancelled = false;
    Promise.all([
      supabase
        .from("page_modules")
        .select("id, board_id")
        .eq("page_id", pageInfo.id)
        .eq("module_type", "board")
        .order("sort_order", { ascending: true })
        .limit(1)
        .maybeSingle(),
      supabase
        .from("page_modules")
        .select("id", { count: "exact", head: true })
        .eq("page_id", pageInfo.id),
    ]).then(([moduleRes, countRes]) => {
      if (cancelled) return;
      const mod = moduleRes.data as { id: string; board_id: string | null } | null;
      setBoardModule(mod?.board_id ? { id: mod.id, board_id: mod.board_id } : null);
      setSelectedBoardId(mod?.board_id ?? "");
      setModuleCount(countRes.count ?? 0);
    });
    return () => {
      cancelled = true;
    };
  }, [pageInfo]);

  async function saveBoardLink() {
    if (!pageInfo) return;
    setLinkSaving(true);
    setLinkError(null);
    setLinkSaved(false);

    if (!selectedBoardId) {
      if (boardModule) {
        const { error: deleteError } = await supabase
          .from("page_modules")
          .delete()
          .eq("id", boardModule.id);
        if (deleteError) {
          setLinkError(deleteError.message);
          setLinkSaving(false);
          return;
        }
        setBoardModule(null);
      }
    } else if (boardModule) {
      const { error: updateError } = await supabase
        .from("page_modules")
        .update({ board_id: selectedBoardId })
        .eq("id", boardModule.id);
      if (updateError) {
        setLinkError(updateError.message);
        setLinkSaving(false);
        return;
      }
      setBoardModule({ id: boardModule.id, board_id: selectedBoardId });
    } else {
      const { data: inserted, error: insertError } = await supabase
        .from("page_modules")
        .insert({
          page_id: pageInfo.id,
          module_type: "board",
          board_id: selectedBoardId,
          settings: WIDGET_DEFAULT_SETTINGS.board ?? {},
          sort_order: moduleCount,
          is_hidden: false,
        })
        .select("id, board_id")
        .single();
      if (insertError || !inserted) {
        setLinkError(insertError?.message ?? "게시판 연결에 실패했어요.");
        setLinkSaving(false);
        return;
      }
      setBoardModule(inserted as { id: string; board_id: string });
      setModuleCount((c) => c + 1);
    }

    setLinkSaving(false);
    setLinkSaved(true);
  }

  // EPIC-077: 연결된 게시판 자체의 주제/대표이미지/소개/공개여부 — boards는
  // anon 직접 쓰기가 없어 /api/admin/boards/[id]를 거친다(관리자 세션 필요).
  const [boardDraft, setBoardDraft] = useState<BoardDraft | null>(null);
  const [boardSaving, setBoardSaving] = useState(false);
  const [boardSaved, setBoardSaved] = useState(false);
  const [boardError, setBoardError] = useState<string | null>(null);

  useEffect(() => {
    const boardId = boardModule?.board_id;
    if (!session || !boardId) {
      setBoardDraft(null);
      return;
    }
    let cancelled = false;
    fetch(`/api/admin/boards/${boardId}`, {
      headers: { Authorization: `Bearer ${session.access_token}` },
    })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (cancelled || !data) return;
        setBoardDraft({
          name: data.name ?? "",
          topic: data.topic ?? "",
          thumbnail_url: data.thumbnail_url ?? "",
          description: data.description ?? "",
          is_public: data.is_public ?? true,
          board_type: data.board_type ?? "",
          min_rank_to_read: data.min_rank_to_read ?? null,
        });
      });
    return () => {
      cancelled = true;
    };
  }, [session, boardModule?.board_id]);

  async function saveBoardProperties() {
    if (!session || !boardModule?.board_id || !boardDraft) return;
    setBoardSaving(true);
    setBoardError(null);
    setBoardSaved(false);
    const res = await fetch(`/api/admin/boards/${boardModule.board_id}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({
        topic: boardDraft.topic || null,
        thumbnail_url: boardDraft.thumbnail_url || null,
        description: boardDraft.description || null,
        is_public: boardDraft.is_public,
        min_rank_to_read: boardDraft.min_rank_to_read,
      }),
    });
    const data = await res.json();
    setBoardSaving(false);
    if (!res.ok) {
      setBoardError(data.error ?? "게시판 저장에 실패했어요.");
      return;
    }
    setBoardSaved(true);
  }

  async function handleFileChange(file: File | null) {
    if (!file) return;
    setUploading(true);
    setError(null);
    const path = `categories/${Date.now()}-${file.name}`;
    const { error: uploadError } = await supabase.storage
      .from(STORAGE_BUCKET)
      .upload(path, file);
    if (uploadError) {
      setUploading(false);
      setError(uploadError.message);
      return;
    }
    const { data } = supabase.storage.from(STORAGE_BUCKET).getPublicUrl(path);
    setThumbnailUrl(data.publicUrl);
    setUploading(false);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-md rounded-lg bg-white p-6">
        <h3 className="text-lg font-medium mb-4">&ldquo;{row.title}&rdquo; 관리</h3>

        <div className="space-y-4">
          <div>
            <label className="block text-sm mb-1">공개 설정</label>
            <select
              className={inputClass}
              value={isPublic ? "public" : "private"}
              onChange={(e) => setIsPublic(e.target.value === "public")}
            >
              <option value="public">공개</option>
              <option value="private">비공개</option>
            </select>
          </div>

          {/* EPIC-077: target_type은 루트 노드가 바뀌면 addChild가 하위로
              그대로 전파하고, 각 트리 인스턴스는 targetTypes로 범위를
              필터링하므로 하위 노드에서 단독으로 바꾸면 구조가 어긋난다 —
              루트에서만 편집 가능, 하위는 읽기전용 배지. */}
          <div>
            <label className="block text-sm mb-1">노출 위치</label>
            {row.parent_id === null ? (
              <select
                className={inputClass}
                value={targetType}
                onChange={(e) => setTargetType(e.target.value as TargetTypeLiteral)}
              >
                {Object.entries(TARGET_TYPE_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            ) : (
              <span className="inline-block text-xs px-2 py-1 rounded bg-gray-100 text-gray-600">
                {TARGET_TYPE_LABELS[row.target_type]} (상위 항목과 동일 — 최상위 항목에서만 변경 가능)
              </span>
            )}
          </div>

          <div>
            <label className="block text-sm mb-1">주제 / 태그</label>
            <input
              className={inputClass}
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              placeholder="예: renaissance"
            />
          </div>

          <div>
            <label className="block text-sm mb-1">대표 이미지</label>
            <input
              className={inputClass}
              value={thumbnailUrl}
              onChange={(e) => setThumbnailUrl(e.target.value)}
              placeholder="https://... (또는 아래에서 파일 직접 업로드)"
            />
            <input
              type="file"
              accept="image/*"
              disabled={uploading}
              onChange={(e) => handleFileChange(e.target.files?.[0] ?? null)}
              className="mt-2 text-sm"
            />
            {uploading && (
              <p className="text-xs text-gray-400 mt-1">업로드 중...</p>
            )}
          </div>

          <div>
            <label className="block text-sm mb-1">카테고리 소개</label>
            <textarea
              className={inputClass}
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          {/* EPIC-077: 연결된 페이지(page_builder) — href가 없으면 아직
              연결된 페이지가 없다는 안내만 보여준다(href를 저장하면
              ensurePageForSlug가 자동 생성한다). */}
          <div className="border-t border-gray-100 pt-4">
            <p className="text-sm font-medium mb-1">연결된 페이지</p>
            {!row.href ? (
              <p className="text-xs text-gray-400">
                이 항목에 href를 먼저 지정하면 페이지가 자동 생성돼요.
              </p>
            ) : pageLoading ? (
              <p className="text-xs text-gray-400">불러오는 중...</p>
            ) : pageInfo ? (
              <div className="flex items-center gap-2 text-sm">
                <span
                  className={`text-xs px-2 py-0.5 rounded-full ${
                    pageInfo.status === "published"
                      ? "bg-green-100 text-green-700"
                      : "bg-gray-100 text-gray-500"
                  }`}
                >
                  {pageInfo.status === "published" ? "공개" : "비공개"}
                </span>
                <a
                  href={`/admin/pages/${pageInfo.id}`}
                  target="_blank"
                  rel="noreferrer"
                  className="text-gray-700 underline hover:text-gray-900"
                >
                  페이지 위젯 편집으로 이동
                </a>
              </div>
            ) : (
              <p className="text-xs text-gray-400">연결된 페이지 없음</p>
            )}
            {/* EPIC-088: 이 페이지의 최소 접근 가능 티어 — 미달 등급 방문자는
                usePageRankGate가 멤버십 안내 페이지로 리다이렉트한다
                (/admin/pages/[id]와 동일한 값, 여기서도 바로 편집). */}
            {pageInfo && (
              <div className="mt-2 flex items-center gap-2">
                <select
                  className={inputClass}
                  value={pageMinRank ?? ""}
                  onChange={(e) => setPageMinRank(e.target.value === "" ? null : Number(e.target.value))}
                >
                  <option value="">최소 접근 가능 티어: 제한 없음</option>
                  {RANK_OPTIONS.map((o) => (
                    <option key={o.rank} value={o.rank}>
                      최소 접근 가능 티어: {o.label}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={savePageMinRank}
                  disabled={pageMinRankSaving}
                  className={smallButtonClass}
                >
                  {pageMinRankSaving ? "저장 중..." : "저장"}
                </button>
                {pageMinRankSaved && <span className="text-xs text-green-600">저장됨</span>}
              </div>
            )}
            {pageMinRankError && <p className="text-xs text-red-600 mt-1">{pageMinRankError}</p>}
          </div>

          {/* EPIC-077: 연결된 게시판 — 어느 게시판을 연결할지 여기서 직접
              선택/변경/해제한다(page_modules의 board 위젯 한 칸으로 표현). */}
          <div className="border-t border-gray-100 pt-4">
            <p className="text-sm font-medium mb-2">연결된 게시판</p>
            {!pageInfo ? (
              <p className="text-xs text-gray-400">
                이 항목에 href를 먼저 지정하면 페이지가 자동 생성돼요.
              </p>
            ) : (
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <select
                    className={inputClass}
                    value={selectedBoardId}
                    onChange={(e) => setSelectedBoardId(e.target.value)}
                  >
                    <option value="">(연결 안 함)</option>
                    {allBoards.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.name}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={saveBoardLink}
                    disabled={linkSaving}
                    className={smallButtonClass}
                  >
                    {linkSaving ? "저장 중..." : "연결 저장"}
                  </button>
                </div>
                {linkSaved && <p className="text-xs text-green-600">저장됐어요.</p>}
                {linkError && <p className="text-xs text-red-600">{linkError}</p>}

                {boardModule?.board_id && (
                  <div className="rounded-md border border-gray-200 p-3 space-y-2 mt-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium flex items-center gap-1.5">
                        {boardDraft?.name}
                        {boardDraft?.board_type && (
                          <span className="text-xs px-1.5 py-0.5 rounded bg-gray-100 text-gray-600">
                            {boardDraft.board_type}
                          </span>
                        )}
                        {boardDraft && (
                          <span
                            className={`text-xs px-1.5 py-0.5 rounded ${
                              boardDraft.is_public
                                ? "bg-green-100 text-green-700"
                                : "bg-amber-100 text-amber-700"
                            }`}
                          >
                            {boardDraft.is_public ? "활성" : "비활성"}
                          </span>
                        )}
                      </span>
                      <a
                        href={`/admin/boards/${boardModule.board_id}`}
                        target="_blank"
                        rel="noreferrer"
                        className="text-xs text-gray-500 underline hover:text-gray-800"
                      >
                        상세 편집으로 이동
                      </a>
                    </div>
                    {!boardDraft ? (
                      <p className="text-xs text-gray-400">불러오는 중...</p>
                    ) : (
                      <>
                        <input
                          className={inputClass}
                          value={boardDraft.topic}
                          placeholder="주제 / 태그"
                          onChange={(e) =>
                            setBoardDraft({ ...boardDraft, topic: e.target.value })
                          }
                        />
                        <input
                          className={inputClass}
                          value={boardDraft.thumbnail_url}
                          placeholder="대표 이미지 URL"
                          onChange={(e) =>
                            setBoardDraft({ ...boardDraft, thumbnail_url: e.target.value })
                          }
                        />
                        <textarea
                          className={inputClass}
                          rows={2}
                          value={boardDraft.description}
                          placeholder="소개글"
                          onChange={(e) =>
                            setBoardDraft({ ...boardDraft, description: e.target.value })
                          }
                        />
                        <label className="flex items-center gap-1 text-xs text-gray-600">
                          <input
                            type="checkbox"
                            checked={boardDraft.is_public}
                            onChange={(e) =>
                              setBoardDraft({ ...boardDraft, is_public: e.target.checked })
                            }
                          />
                          공개
                        </label>
                        {/* EPIC-088: 이 게시판의 최소 접근 가능 티어(boards.min_rank_to_read,
                            BoardForm.tsx의 "최소 열람 등급"과 동일한 값). */}
                        <select
                          className={inputClass}
                          value={boardDraft.min_rank_to_read ?? ""}
                          onChange={(e) =>
                            setBoardDraft({
                              ...boardDraft,
                              min_rank_to_read: e.target.value === "" ? null : Number(e.target.value),
                            })
                          }
                        >
                          <option value="">최소 접근 가능 티어: 제한 없음</option>
                          {RANK_OPTIONS.map((o) => (
                            <option key={o.rank} value={o.rank}>
                              최소 접근 가능 티어: {o.label}
                            </option>
                          ))}
                        </select>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={saveBoardProperties}
                            disabled={boardSaving}
                            className={smallButtonClass}
                          >
                            {boardSaving ? "저장 중..." : "게시판 정보 저장"}
                          </button>
                          {boardSaved && (
                            <span className="text-xs text-green-600">저장됐어요.</span>
                          )}
                        </div>
                        {boardError && <p className="text-xs text-red-600">{boardError}</p>}
                      </>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <div className="flex gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-md border border-gray-300 bg-white text-gray-800 px-3 py-2 hover:bg-gray-50"
            >
              취소
            </button>
            <button
              type="button"
              onClick={() =>
                onSave({
                  is_public: isPublic,
                  topic: topic || null,
                  description: description || null,
                  thumbnail_url: thumbnailUrl || null,
                  ...(row.parent_id === null ? { target_type: targetType } : {}),
                })
              }
              className="flex-1 rounded-md bg-gray-800 text-white px-3 py-2"
            >
              확인
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
