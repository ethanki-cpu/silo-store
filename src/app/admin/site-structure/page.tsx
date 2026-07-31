"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  DndContext,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
  arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { supabase } from "@/lib/supabaseClient";
import { useAuth } from "@/lib/AuthProvider";
import { CategoryTreeManager } from "@/components/admin/CategoryTreeManager";
import { fetchAllPagesForAdmin, type PageBuilderRow } from "@/lib/pageBuilder";
import {
  fetchNavBranches,
  fetchBoardBranchMap,
  buildSlugToBranchId,
  type NavBranchNode,
} from "@/lib/adminTreeGrouping";

type UnassignedBoard = {
  id: string;
  name: string;
  category: string | null;
  sort_order?: number;
};

// EPIC-077: "메뉴/카테고리 관리"+"페이지 관리"+"게시판 관리" 3개 화면을
// 하나로 합친 통합 CMS. 트리 자체(재정렬/재부모화/이름/href/공개설정/주제/
// 대표이미지/노출위치)는 CategoryTreeManager가 그대로 담당하고, "관리"
// 모달에서 연결된 페이지/게시판까지 한 번에 편집한다(CategoryTreeManager.tsx
// 참고). site_navigations 트리에 아직 안 걸린 페이지/게시판은 이 화면
// 하단의 "미분류" 패널에서 계속 찾을 수 있다 — 사라지지 않는다.
export default function AdminSiteStructurePage() {
  const { session } = useAuth();
  const [branches, setBranches] = useState<NavBranchNode[]>([]);
  const [boardBranchMap, setBoardBranchMap] = useState<Map<string, string>>(new Map());
  const [pages, setPages] = useState<PageBuilderRow[]>([]);
  const [boards, setBoards] = useState<UnassignedBoard[]>([]);
  const [fetching, setFetching] = useState(true);

  async function load() {
    setFetching(true);
    const navBranches = await fetchNavBranches();
    const [branchMap, pageRows] = await Promise.all([
      fetchBoardBranchMap(navBranches),
      fetchAllPagesForAdmin(),
    ]);
    setBranches(navBranches);
    setBoardBranchMap(branchMap);
    setPages(pageRows ?? []);

    if (session) {
      const res = await fetch("/api/admin/boards", {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      const data = await res.json();
      setBoards(res.ok && Array.isArray(data) ? data : []);
    }
    setFetching(false);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session]);

  const slugToBranchId = useMemo(() => buildSlugToBranchId(branches), [branches]);

  const unassignedPages = useMemo(
    () => pages.filter((p) => !slugToBranchId.has(p.slug)),
    [pages, slugToBranchId],
  );
  const unassignedBoards = useMemo(
    () => boards.filter((b) => !boardBranchMap.has(b.id)),
    [boards, boardBranchMap],
  );

  return (
    <main className="flex-1 px-8 pb-8 max-w-4xl mx-auto w-full space-y-8">
      <div>
        <h1 className="text-2xl font-bold mb-1">사이트 구성 관리</h1>
        <p className="text-sm text-gray-500">
          드래그해서 순서를 바꾸거나, 다른 항목 위로 드롭해서 하위 항목으로
          옮길 수 있어요. 각 항목의 [관리]에서 공개 설정·주제·대표 이미지·소개는
          물론, 연결된 페이지 위젯과 게시판 정보까지 한 번에 편집하세요.
        </p>
      </div>

      <CategoryTreeManager
        title="상단 탭"
        targetTypes={["tab", "dropdown"]}
        session={session}
      />
      <CategoryTreeManager
        title="왼쪽 사이드바"
        targetTypes={["sidebar_left"]}
        session={session}
      />
      <CategoryTreeManager
        title="오른쪽 사이드바"
        targetTypes={["sidebar_right"]}
        session={session}
      />

      {/* EPIC-077: 어떤 카테고리 href에도 안 걸린 페이지/게시판 — 통합 후에도
          안 사라지고 여기서 계속 찾아 순서를 바꾸거나 상세 편집으로 들어갈 수
          있다. */}
      <section className="rounded-lg border border-gray-200 p-4">
        <h2 className="text-lg font-semibold mb-3">미분류 페이지 / 게시판</h2>
        {fetching ? (
          <p className="text-gray-500 text-sm">불러오는 중...</p>
        ) : (
          <div className="space-y-6">
            <UnassignedPagesPanel pages={unassignedPages} onChanged={load} />
            <UnassignedBoardsPanel
              boards={unassignedBoards}
              session={session}
              onChanged={load}
            />
          </div>
        )}
      </section>
    </main>
  );
}

function UnassignedPagesPanel({
  pages,
  onChanged,
}: {
  pages: PageBuilderRow[];
  onChanged: () => void;
}) {
  const [items, setItems] = useState(pages);
  useEffect(() => setItems(pages), [pages]);
  const sensors = useSensors(useSensor(PointerSensor));

  async function handleDragEnd(e: DragEndEvent) {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    const ids = items.map((p) => p.id);
    const reordered = arrayMove(ids, ids.indexOf(String(active.id)), ids.indexOf(String(over.id)));
    const byId = new Map(items.map((p) => [p.id, p]));
    setItems(reordered.map((id) => byId.get(id)!).filter(Boolean));

    await Promise.all(
      reordered.map((id, index) =>
        supabase.from("page_builder").update({ sort_order: index }).eq("id", id),
      ),
    );
    onChanged();
  }

  return (
    <div>
      <h3 className="text-sm font-semibold text-gray-700 mb-2">
        미분류 페이지 ({items.length})
      </h3>
      {items.length === 0 ? (
        <p className="text-xs text-gray-400">없음</p>
      ) : (
        <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
          <SortableContext items={items.map((p) => p.id)} strategy={verticalListSortingStrategy}>
            <ul className="space-y-1.5">
              {items.map((page) => (
                <SortableRow key={page.id} id={page.id}>
                  <span className="text-sm font-medium text-gray-900">📄 {page.title}</span>
                  <span className="text-xs text-gray-400">/{page.slug}</span>
                  <Link
                    href={`/admin/pages/${page.id}`}
                    className="ml-auto rounded-md border border-gray-300 px-2 py-1 text-xs hover:bg-gray-50"
                  >
                    수정
                  </Link>
                </SortableRow>
              ))}
            </ul>
          </SortableContext>
        </DndContext>
      )}
    </div>
  );
}

function UnassignedBoardsPanel({
  boards,
  session,
  onChanged,
}: {
  boards: UnassignedBoard[];
  session: ReturnType<typeof useAuth>["session"];
  onChanged: () => void;
}) {
  const [items, setItems] = useState(boards);
  useEffect(() => setItems(boards), [boards]);
  const sensors = useSensors(useSensor(PointerSensor));

  async function handleDragEnd(e: DragEndEvent) {
    if (!session) return;
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    const ids = items.map((b) => b.id);
    const reordered = arrayMove(ids, ids.indexOf(String(active.id)), ids.indexOf(String(over.id)));
    const byId = new Map(items.map((b) => [b.id, b]));
    setItems(reordered.map((id) => byId.get(id)!).filter(Boolean));

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
    onChanged();
  }

  return (
    <div>
      <h3 className="text-sm font-semibold text-gray-700 mb-2">
        미분류 게시판 ({items.length})
      </h3>
      {items.length === 0 ? (
        <p className="text-xs text-gray-400">없음</p>
      ) : (
        <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
          <SortableContext items={items.map((b) => b.id)} strategy={verticalListSortingStrategy}>
            <ul className="space-y-1.5">
              {items.map((board) => (
                <SortableRow key={board.id} id={board.id}>
                  <span className="text-sm font-medium text-gray-900">📄 {board.name}</span>
                  <span className="text-xs text-gray-400">{board.category ?? "-"}</span>
                  <Link
                    href={`/admin/boards/${board.id}`}
                    className="ml-auto rounded-md border border-gray-300 px-2 py-1 text-xs hover:bg-gray-50"
                  >
                    수정
                  </Link>
                </SortableRow>
              ))}
            </ul>
          </SortableContext>
        </DndContext>
      )}
    </div>
  );
}

function SortableRow({ id, children }: { id: string; children: React.ReactNode }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id,
  });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  };

  return (
    <li
      ref={setNodeRef}
      style={style}
      className="flex flex-wrap items-center gap-3 rounded-lg border border-gray-200 p-2 bg-white"
    >
      <button
        type="button"
        {...attributes}
        {...listeners}
        aria-label="드래그해서 순서 변경"
        className="cursor-grab text-gray-400 px-1 select-none touch-none"
      >
        ⠿
      </button>
      {children}
    </li>
  );
}
