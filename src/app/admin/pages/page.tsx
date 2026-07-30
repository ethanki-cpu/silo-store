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
import { supabase } from "@/lib/supabaseClient";
import {
  fetchAllPagesForAdmin,
  isPageBuilderTableMissing,
  type PageBuilderRow,
} from "@/lib/pageBuilder";
import { AdminDomainTabs, useAdminDomainFilter } from "@/components/admin/AdminDomainTabs";
import { type AdminDomain } from "@/lib/adminDomainGrouping";
import {
  fetchNavBranches,
  buildSlugToBranchId,
  buildAdminTree,
  type NavBranchNode,
} from "@/lib/adminTreeGrouping";
import { computeAdminTreeSections, buildSiblingMap } from "@/lib/adminTreeSections";

// EPIC-060: Page Builder 관리자 목록 — 페이지 목록/새 페이지/삭제/수정
// 진입/공개-비공개 전환. is_admin 가드는 src/app/admin/layout.tsx가 이미
// 처리한다(이 페이지가 렌더링됐다는 것 자체가 이미 관리자로 확인됐다는 뜻).
// EPIC-072: 도메인 필터 탭이 useSearchParams를 쓰므로 Suspense로 감싼다
// (Navbar.tsx/docent page와 동일한 이 저장소의 기존 관례).
export default function AdminPagesListPage() {
  return (
    <Suspense fallback={<main className="flex-1 px-8 pb-8 max-w-2xl mx-auto w-full" />}>
      <AdminPagesListContent />
    </Suspense>
  );
}

function AdminPagesListContent() {
  const domainFilter = useAdminDomainFilter();
  const [pages, setPages] = useState<PageBuilderRow[]>([]);
  const [branches, setBranches] = useState<NavBranchNode[]>([]);
  const [fetching, setFetching] = useState(true);
  const [tableMissing, setTableMissing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [newSlug, setNewSlug] = useState("");
  const [newTitle, setNewTitle] = useState("");
  const [creating, setCreating] = useState(false);

  async function load() {
    setFetching(true);
    const missing = await isPageBuilderTableMissing();
    if (missing) {
      setTableMissing(true);
      setFetching(false);
      return;
    }
    setTableMissing(false);
    const [data, navBranches] = await Promise.all([fetchAllPagesForAdmin(), fetchNavBranches()]);
    setBranches(navBranches);
    if (data === null) {
      setError("페이지 목록을 불러오지 못했어요.");
    } else {
      setError(null);
      setPages(data);
    }
    setFetching(false);
  }

  useEffect(() => {
    load();
  }, []);

  async function handleCreate() {
    if (!newSlug.trim() || !newTitle.trim()) return;
    setCreating(true);
    const { error: insertError } = await supabase.from("page_builder").insert({
      slug: newSlug.trim(),
      title: newTitle.trim(),
      status: "draft",
    });
    setCreating(false);
    if (insertError) {
      setError(insertError.message);
      return;
    }
    setNewSlug("");
    setNewTitle("");
    await load();
  }

  async function handleDelete(id: string, title: string) {
    if (!confirm(`"${title}" 페이지와 그 안의 모든 모듈을 삭제할까요?`)) return;
    const { error: deleteError } = await supabase.from("page_builder").delete().eq("id", id);
    if (deleteError) {
      setError(deleteError.message);
      return;
    }
    await load();
  }

  async function handleToggleStatus(page: PageBuilderRow) {
    const nextStatus = page.status === "published" ? "draft" : "published";
    const { error: updateError } = await supabase
      .from("page_builder")
      .update({ status: nextStatus, updated_at: new Date().toISOString() })
      .eq("id", page.id);
    if (updateError) {
      setError(updateError.message);
      return;
    }
    await load();
  }

  const slugToBranchId = useMemo(() => buildSlugToBranchId(branches), [branches]);
  const branchById = useMemo(() => new Map(branches.map((b) => [b.id, b])), [branches]);

  function branchIdOfPage(page: PageBuilderRow): string | null {
    return slugToBranchId.get(page.slug) ?? null;
  }

  const counts = useMemo(() => {
    const c: Partial<Record<AdminDomain | "all", number>> = { all: pages.length };
    for (const page of pages) {
      const branchId = branchIdOfPage(page);
      const domain = branchId ? (branchById.get(branchId)?.domain ?? "common") : "common";
      c[domain] = (c[domain] ?? 0) + 1;
    }
    return c;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pages, slugToBranchId, branchById]);

  // 사이트 내비게이션 트리 그대로 들여쓰기된 행 목록(브랜치 헤더 + 그 아래
  // 페이지) — 매칭 안 되는 페이지는 맨 끝 "기타 / 미분류"로 모인다.
  const treeRows = useMemo(
    () => buildAdminTree(pages, branchIdOfPage, branches, domainFilter),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [pages, branches, domainFilter, slugToBranchId],
  );

  // EPIC-075: 드래그앤드롭 순서 변경 — 같은 브랜치(형제 그룹) 안에서만
  // 허용한다(다른 브랜치로 옮기는 재분류는 /admin/navigation 담당).
  const sections = useMemo(() => computeAdminTreeSections(treeRows), [treeRows]);
  const siblingMap = useMemo(() => buildSiblingMap(sections), [sections]);
  const sensors = useSensors(useSensor(PointerSensor));

  async function handleDragEnd(e: DragEndEvent) {
    const { active, over } = e;
    if (!over || active.id === over.id) return;

    const activeId = String(active.id);
    const overId = String(over.id);
    const siblings = siblingMap.get(activeId);
    if (!siblings || !siblings.includes(overId)) return; // 다른 브랜치로는 드롭 불가

    const reordered = arrayMove(siblings, siblings.indexOf(activeId), siblings.indexOf(overId));

    // 낙관적 업데이트: 로컬 pages 배열도 같은 순서로 재배치해 즉시 반영.
    setPages((prev) => {
      const byId = new Map(prev.map((p) => [p.id, p]));
      const reorderedPages = reordered.map((id) => byId.get(id)).filter((p): p is PageBuilderRow => !!p);
      const reorderedSet = new Set(reordered);
      let cursor = 0;
      return prev.map((p) => (reorderedSet.has(p.id) ? reorderedPages[cursor++] : p));
    });

    await Promise.all(
      reordered.map((id, index) =>
        supabase.from("page_builder").update({ sort_order: index }).eq("id", id),
      ),
    );
  }

  if (tableMissing) {
    return (
      <main className="flex-1 px-8 pb-8 max-w-2xl mx-auto w-full">
        <div className="rounded-lg border border-amber-300 bg-amber-50 p-4 text-sm text-amber-800">
          <p className="font-semibold mb-1">아직 page_builder 테이블이 없어요.</p>
          <p>
            <code className="bg-white/60 px-1 rounded">docs/sql/EPIC-060-page-builder.sql</code>을
            Supabase SQL Editor(또는 Management API)에서 먼저 실행해야 이 화면을 쓸 수 있어요.
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="flex-1 px-8 pb-8 max-w-2xl mx-auto w-full space-y-8">
      <div>
        <h1 className="text-2xl font-bold mb-1">페이지 관리</h1>
        <p className="text-sm text-gray-500">
          Page → Module → Board → Post 구조로 각 Hub Page의 구성을 코드 수정 없이 관리합니다.
        </p>
      </div>

      <AdminDomainTabs counts={counts} />

      <section className="rounded-lg border border-gray-200 p-4 space-y-3">
        <h2 className="text-sm font-semibold text-gray-700">새 페이지</h2>
        <div className="flex flex-col sm:flex-row gap-2">
          <input
            value={newSlug}
            onChange={(e) => setNewSlug(e.target.value)}
            placeholder="slug (예: community)"
            className="flex-1 rounded-md border border-gray-300 px-3 py-2 text-sm"
          />
          <input
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            placeholder="제목 (예: Community)"
            className="flex-1 rounded-md border border-gray-300 px-3 py-2 text-sm"
          />
          <button
            type="button"
            onClick={handleCreate}
            disabled={creating || !newSlug.trim() || !newTitle.trim()}
            className="rounded-md bg-gray-800 text-white px-4 py-2 text-sm disabled:opacity-50"
          >
            {creating ? "생성 중..." : "생성"}
          </button>
        </div>
      </section>

      {error && (
        <div className="rounded-lg border border-red-300 bg-red-50 p-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {fetching ? (
        <p className="text-gray-400 text-sm">불러오는 중...</p>
      ) : treeRows.length === 0 ? (
        <p className="text-gray-400 text-sm">등록된 페이지가 없어요.</p>
      ) : (
        <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
          <ul className="space-y-1.5">
            {renderTreeRows(treeRows, sections, handleToggleStatus, handleDelete)}
          </ul>
        </DndContext>
      )}
    </main>
  );
}

// EPIC-075: treeRows(브랜치 헤더 + 항목이 섞인 평평한 배열)를 순회하며,
// 항목이 연속되는 구간마다 그 구간에 대응하는 sections[i]의 id 목록으로
// SortableContext를 열어준다 — 브랜치 헤더 자체는 드래그 대상이 아니라
// SortableContext 밖에 그대로 렌더링한다.
function renderTreeRows(
  treeRows: ReturnType<typeof buildAdminTree<PageBuilderRow>>,
  sections: ReturnType<typeof computeAdminTreeSections<PageBuilderRow>>,
  onToggleStatus: (page: PageBuilderRow) => void,
  onDelete: (id: string, title: string) => void,
) {
  const elements: ReactNode[] = [];
  let sectionIndex = -1;
  let i = 0;

  while (i < treeRows.length) {
    const row = treeRows[i];
    if (row.kind === "branch") {
      sectionIndex++;
      elements.push(
        <li
          key={`branch-${row.id}`}
          style={{ marginLeft: row.depth * 20 }}
          className="text-xs font-semibold uppercase tracking-wide text-gray-400 pt-3 first:pt-0"
        >
          📂 {row.title}
        </li>,
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
          <SortablePageRow
            key={r.item.id}
            row={r}
            onToggleStatus={onToggleStatus}
            onDelete={onDelete}
          />
        ))}
      </SortableContext>,
    );
  }

  return elements;
}

function SortablePageRow({
  row,
  onToggleStatus,
  onDelete,
}: {
  row: { depth: number; item: PageBuilderRow };
  onToggleStatus: (page: PageBuilderRow) => void;
  onDelete: (id: string, title: string) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: row.item.id,
  });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
    marginLeft: row.depth * 20,
  };

  return (
    <li
      ref={setNodeRef}
      style={style}
      className="flex flex-wrap items-center gap-3 rounded-lg border border-gray-200 p-3 bg-white"
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
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-900">📄 {row.item.title}</p>
        <p className="text-xs text-gray-400">/{row.item.slug}</p>
      </div>
      <span
        className={`text-xs px-2 py-0.5 rounded-full ${
          row.item.status === "published"
            ? "bg-green-100 text-green-700"
            : "bg-gray-100 text-gray-500"
        }`}
      >
        {row.item.status === "published" ? "공개" : "비공개"}
      </span>
      <button
        type="button"
        onClick={() => onToggleStatus(row.item)}
        className="rounded-md border border-gray-300 px-2 py-1 text-xs hover:bg-gray-50"
      >
        {row.item.status === "published" ? "비공개로 전환" : "공개로 전환"}
      </button>
      <Link
        href={`/admin/pages/${row.item.id}`}
        className="rounded-md border border-gray-300 px-2 py-1 text-xs hover:bg-gray-50"
      >
        수정
      </Link>
      <button
        type="button"
        onClick={() => onDelete(row.item.id, row.item.title)}
        className="rounded-md border border-gray-300 px-2 py-1 text-xs text-red-600 hover:bg-red-50"
      >
        삭제
      </button>
    </li>
  );
}
