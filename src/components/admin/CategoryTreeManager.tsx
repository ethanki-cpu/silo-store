"use client";

import { useEffect, useState } from "react";
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
import { supabase } from "@/lib/supabaseClient";

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

export function CategoryTreeManager({
  title,
  targetTypes,
}: {
  title: string;
  targetTypes: TargetTypeLiteral[];
}) {
  const [rows, setRows] = useState<CategoryNavRow[]>([]);
  const [fetching, setFetching] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [managingId, setManagingId] = useState<string | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);

  const sensors = useSensors(useSensor(PointerSensor));

  async function load() {
    setFetching(true);
    const { data, error: fetchError } = await supabase
      .from("site_navigations")
      .select(
        "id, key, title, href, parent_id, target_type, sort_order, is_active, topic, thumbnail_url, description, is_public",
      )
      .order("sort_order", { ascending: true });

    if (fetchError) {
      setError(fetchError.message);
      setFetching(false);
      return;
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
      .filter((r) => r.parent_id === null && targetTypes.includes(r.target_type))
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
    updates: { id: string; parent_id: string | null; sort_order: number }[],
  ) {
    const results = await Promise.all(
      updates.map((u) =>
        supabase
          .from("site_navigations")
          .update({ parent_id: u.parent_id, sort_order: u.sort_order })
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

    const updates: { id: string; parent_id: string | null; sort_order: number }[] =
      destSiblings.map((r, i) => ({ id: r.id, parent_id: destParentId, sort_order: i }));

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
        return u ? { ...r, parent_id: u.parent_id, sort_order: u.sort_order } : r;
      }),
    );

    await persistRows(updates);
  }

  async function addChild(parentId: string | null, targetType: TargetTypeLiteral) {
    const siblingCount = rows.filter((r) => r.parent_id === parentId).length;
    const { error: insertError } = await supabase.from("site_navigations").insert({
      parent_id: parentId,
      title: "새 항목",
      target_type: targetType,
      sort_order: siblingCount,
    });
    if (insertError) {
      setError(insertError.message);
      return;
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
    return true;
  }

  async function deleteRow(id: string) {
    if (!confirm("이 항목과 하위 항목을 모두 삭제할까요?")) return;
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

  const roots = scopedRows
    .filter((r) => r.parent_id === null)
    .sort((a, b) => a.sort_order - b.sort_order);

  const managingRow = rows.find((r) => r.id === managingId) ?? null;
  const activeRow = rows.find((r) => r.id === activeId) ?? null;

  return (
    <section className="rounded-lg border border-gray-200 p-4">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-lg font-semibold">{title}</h2>
        <button
          type="button"
          onClick={() => addChild(null, targetTypes[0])}
          className={smallButtonClass}
        >
          + 최상위 추가
        </button>
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
          <TreeLevel
            parentId={null}
            rows={scopedRows}
            depth={0}
            editingId={editingId}
            managingId={managingId}
            onEdit={setEditingId}
            onManage={setManagingId}
            onUpdate={updateRow}
            onDelete={deleteRow}
            onAddChild={addChild}
          />
          <DragOverlay>
            {activeRow && (
              <div className="rounded-lg border border-gray-400 bg-white p-2 shadow-lg text-sm">
                {activeRow.title}
              </div>
            )}
          </DragOverlay>
        </DndContext>
      )}

      {managingRow && (
        <CategoryDetailModal
          row={managingRow}
          onClose={() => setManagingId(null)}
          onSave={async (patch) => {
            const ok = await updateRow(managingRow.id, patch);
            if (ok) setManagingId(null);
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
  onEdit,
  onManage,
  onUpdate,
  onDelete,
  onAddChild,
}: {
  parentId: string | null;
  rows: CategoryNavRow[];
  depth: number;
  editingId: string | null;
  managingId: string | null;
  onEdit: (id: string | null) => void;
  onManage: (id: string | null) => void;
  onUpdate: (id: string, patch: Partial<CategoryNavRow>) => Promise<boolean>;
  onDelete: (id: string) => void;
  onAddChild: (parentId: string | null, targetType: TargetTypeLiteral) => void;
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
        {children.map((child) => (
          <div key={child.id}>
            <CategoryRow
              row={child}
              isEditing={editingId === child.id}
              isManaging={managingId === child.id}
              onEdit={onEdit}
              onManage={onManage}
              onUpdate={onUpdate}
              onDelete={onDelete}
              onAddChild={onAddChild}
            />
            <TreeLevel
              parentId={child.id}
              rows={rows}
              depth={depth + 1}
              editingId={editingId}
              managingId={managingId}
              onEdit={onEdit}
              onManage={onManage}
              onUpdate={onUpdate}
              onDelete={onDelete}
              onAddChild={onAddChild}
            />
          </div>
        ))}
      </SortableContext>
    </div>
  );
}

function CategoryRow({
  row,
  isEditing,
  onEdit,
  onManage,
  onUpdate,
  onDelete,
  onAddChild,
}: {
  row: CategoryNavRow;
  isEditing: boolean;
  isManaging: boolean;
  onEdit: (id: string | null) => void;
  onManage: (id: string | null) => void;
  onUpdate: (id: string, patch: Partial<CategoryNavRow>) => Promise<boolean>;
  onDelete: (id: string) => void;
  onAddChild: (parentId: string | null, targetType: TargetTypeLiteral) => void;
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
      href: draft.href || null,
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
      <button
        type="button"
        {...attributes}
        {...listeners}
        aria-label="드래그해서 이동"
        className="cursor-grab text-gray-400 px-1 select-none touch-none"
      >
        ⠿
      </button>

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

function CategoryDetailModal({
  row,
  onClose,
  onSave,
}: {
  row: CategoryNavRow;
  onClose: () => void;
  onSave: (patch: Partial<CategoryNavRow>) => void;
}) {
  const [isPublic, setIsPublic] = useState(row.is_public);
  const [topic, setTopic] = useState(row.topic ?? "");
  const [description, setDescription] = useState(row.description ?? "");
  const [thumbnailUrl, setThumbnailUrl] = useState(row.thumbnail_url ?? "");
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
