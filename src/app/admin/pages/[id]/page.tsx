"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  DndContext,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { supabase } from "@/lib/supabaseClient";
import { useAuth } from "@/lib/AuthProvider";
import {
  fetchPageForAdmin,
  PAGE_MODULE_TYPES,
  PAGE_MODULE_LABELS,
  BOARD_LINKED_MODULE_TYPES,
  type PageBuilderRow,
  type PageModuleRow,
  type PageModuleType,
} from "@/lib/pageBuilder";

type BoardOption = { id: string; name: string };

// EPIC-060: Page Builder 편집 화면 — 페이지 메타(제목/설명/공개여부) 수정 +
// 모듈 추가/삭제/드래그 순서 변경/설정(JSON)·게시판 연결 변경. 드래그 구현은
// src/components/admin/CategoryTreeManager.tsx(EPIC-035)와 동일한
// dnd-kit(core+sortable) 조합 — 여기서는 트리가 아니라 한 페이지 안의
// 단일 목록(sort_order)만 다루면 되므로 그 컴포넌트보다 훨씬 단순하다.
export default function AdminPageEditorPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { session } = useAuth();

  const [page, setPage] = useState<PageBuilderRow | null>(null);
  const [modules, setModules] = useState<PageModuleRow[]>([]);
  const [fetching, setFetching] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [boards, setBoards] = useState<BoardOption[]>([]);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [saving, setSaving] = useState(false);

  const [newType, setNewType] = useState<PageModuleType>("text");
  const [adding, setAdding] = useState(false);

  const sensors = useSensors(useSensor(PointerSensor));

  async function load() {
    setFetching(true);
    const data = await fetchPageForAdmin(id);
    if (!data) {
      setError("페이지를 찾을 수 없어요.");
      setFetching(false);
      return;
    }
    setPage(data.page);
    setModules(data.modules);
    setTitle(data.page.title);
    setDescription(data.page.description ?? "");
    setFetching(false);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  useEffect(() => {
    fetch("/api/boards", {
      headers: session ? { Authorization: `Bearer ${session.access_token}` } : {},
    })
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) {
          setBoards(data.map((b: { id: string; name: string }) => ({ id: b.id, name: b.name })));
        }
      });
  }, [session]);

  async function handleSavePage() {
    if (!page) return;
    setSaving(true);
    const { error: updateError } = await supabase
      .from("page_builder")
      .update({ title, description, updated_at: new Date().toISOString() })
      .eq("id", page.id);
    setSaving(false);
    if (updateError) {
      setError(updateError.message);
      return;
    }
    await load();
  }

  async function handleToggleStatus() {
    if (!page) return;
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

  async function handleAddModule() {
    if (!page) return;
    setAdding(true);
    const { error: insertError } = await supabase.from("page_modules").insert({
      page_id: page.id,
      module_type: newType,
      board_id: null,
      settings: {},
      sort_order: modules.length,
    });
    setAdding(false);
    if (insertError) {
      setError(insertError.message);
      return;
    }
    await load();
  }

  async function handleDeleteModule(moduleId: string) {
    if (!confirm("이 모듈을 삭제할까요?")) return;
    const { error: deleteError } = await supabase.from("page_modules").delete().eq("id", moduleId);
    if (deleteError) {
      setError(deleteError.message);
      return;
    }
    await load();
  }

  async function handleUpdateModule(moduleId: string, patch: Partial<PageModuleRow>) {
    const { error: updateError } = await supabase
      .from("page_modules")
      .update(patch)
      .eq("id", moduleId);
    if (updateError) {
      setError(updateError.message);
      return false;
    }
    setModules((prev) => prev.map((m) => (m.id === moduleId ? { ...m, ...patch } : m)));
    return true;
  }

  async function handleDragEnd(e: DragEndEvent) {
    const { active, over } = e;
    if (!over || active.id === over.id) return;

    const oldIndex = modules.findIndex((m) => m.id === active.id);
    const newIndex = modules.findIndex((m) => m.id === over.id);
    if (oldIndex === -1 || newIndex === -1) return;

    const reordered = arrayMove(modules, oldIndex, newIndex);
    setModules(reordered);

    const updates = reordered.map((m, i) => ({ id: m.id, sort_order: i }));
    await Promise.all(
      updates.map((u) =>
        supabase.from("page_modules").update({ sort_order: u.sort_order }).eq("id", u.id),
      ),
    );
  }

  if (fetching) {
    return (
      <main className="flex-1 px-8 pb-8 max-w-2xl mx-auto w-full">
        <p className="text-gray-400 text-sm">불러오는 중...</p>
      </main>
    );
  }

  if (!page) {
    return (
      <main className="flex-1 px-8 pb-8 max-w-2xl mx-auto w-full">
        <p className="text-red-600 text-sm">{error ?? "페이지를 찾을 수 없어요."}</p>
      </main>
    );
  }

  return (
    <main className="flex-1 px-8 pb-8 max-w-2xl mx-auto w-full space-y-8">
      <button
        type="button"
        onClick={() => router.push("/admin/pages")}
        className="text-sm text-gray-500 hover:underline"
      >
        ← 페이지 목록
      </button>

      {error && (
        <div className="rounded-lg border border-red-300 bg-red-50 p-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <section className="rounded-lg border border-gray-200 p-4 space-y-3">
        <div className="flex items-center justify-between">
          <h1 className="text-lg font-semibold">/{page.slug}</h1>
          <div className="flex items-center gap-2">
            <span
              className={`text-xs px-2 py-0.5 rounded-full ${
                page.status === "published"
                  ? "bg-green-100 text-green-700"
                  : "bg-gray-100 text-gray-500"
              }`}
            >
              {page.status === "published" ? "공개" : "비공개"}
            </span>
            <button
              type="button"
              onClick={handleToggleStatus}
              className="rounded-md border border-gray-300 px-2 py-1 text-xs hover:bg-gray-50"
            >
              {page.status === "published" ? "비공개로 전환" : "공개로 전환"}
            </button>
          </div>
        </div>
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="제목"
          className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
        />
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="설명"
          rows={2}
          className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
        />
        <button
          type="button"
          onClick={handleSavePage}
          disabled={saving}
          className="rounded-md bg-gray-800 text-white px-4 py-2 text-sm disabled:opacity-50"
        >
          {saving ? "저장 중..." : "페이지 정보 저장"}
        </button>
      </section>

      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-gray-700">모듈 ({modules.length})</h2>
          <div className="flex items-center gap-2">
            <select
              value={newType}
              onChange={(e) => setNewType(e.target.value as PageModuleType)}
              className="rounded-md border border-gray-300 px-2 py-1.5 text-sm"
            >
              {PAGE_MODULE_TYPES.map((t) => (
                <option key={t} value={t}>
                  {PAGE_MODULE_LABELS[t]}
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={handleAddModule}
              disabled={adding}
              className="rounded-md border border-gray-300 px-3 py-1.5 text-sm hover:bg-gray-50 disabled:opacity-50"
            >
              + 모듈 추가
            </button>
          </div>
        </div>

        {modules.length === 0 ? (
          <p className="text-gray-400 text-sm">아직 모듈이 없어요.</p>
        ) : (
          <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
            <SortableContext items={modules.map((m) => m.id)} strategy={verticalListSortingStrategy}>
              <div className="space-y-2">
                {modules.map((module) => (
                  <ModuleRow
                    key={module.id}
                    module={module}
                    boards={boards}
                    onUpdate={handleUpdateModule}
                    onDelete={handleDeleteModule}
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>
        )}
      </section>
    </main>
  );
}

function ModuleRow({
  module,
  boards,
  onUpdate,
  onDelete,
}: {
  module: PageModuleRow;
  boards: BoardOption[];
  onUpdate: (id: string, patch: Partial<PageModuleRow>) => Promise<boolean>;
  onDelete: (id: string) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: module.id,
  });
  const [editing, setEditing] = useState(false);
  const [boardId, setBoardId] = useState(module.board_id ?? "");
  const [settingsText, setSettingsText] = useState(JSON.stringify(module.settings, null, 2));
  const [settingsError, setSettingsError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  };

  const needsBoard = BOARD_LINKED_MODULE_TYPES.includes(module.module_type);

  async function handleSave() {
    let parsedSettings: Record<string, unknown>;
    try {
      parsedSettings = settingsText.trim() ? JSON.parse(settingsText) : {};
    } catch {
      setSettingsError("settings가 올바른 JSON이 아니에요.");
      return;
    }
    setSettingsError(null);
    setSaving(true);
    const ok = await onUpdate(module.id, {
      board_id: needsBoard ? boardId || null : module.board_id,
      settings: parsedSettings,
    });
    setSaving(false);
    if (ok) setEditing(false);
  }

  return (
    <div ref={setNodeRef} style={style} className="rounded-lg border border-gray-200 p-3">
      <div className="flex items-center gap-2">
        <button
          type="button"
          {...attributes}
          {...listeners}
          aria-label="드래그해서 순서 변경"
          className="cursor-grab text-gray-400 px-1 select-none touch-none"
        >
          ⠿
        </button>
        <span className="text-sm font-medium">{PAGE_MODULE_LABELS[module.module_type]}</span>
        {needsBoard && (
          <span className="text-xs text-gray-400">
            {boards.find((b) => b.id === module.board_id)?.name ?? "게시판 미연결"}
          </span>
        )}
        <div className="ml-auto flex gap-1">
          <button
            type="button"
            onClick={() => setEditing((v) => !v)}
            className="rounded-md border border-gray-300 px-2 py-1 text-xs hover:bg-gray-50"
          >
            {editing ? "닫기" : "설정"}
          </button>
          <button
            type="button"
            onClick={() => onDelete(module.id)}
            className="rounded-md border border-gray-300 px-2 py-1 text-xs text-red-600 hover:bg-red-50"
          >
            삭제
          </button>
        </div>
      </div>

      {editing && (
        <div className="mt-3 space-y-2 border-t border-gray-100 pt-3">
          {needsBoard && (
            <div>
              <label className="block text-xs text-gray-500 mb-1">게시판 연결</label>
              <select
                value={boardId}
                onChange={(e) => setBoardId(e.target.value)}
                className="w-full rounded-md border border-gray-300 px-2 py-1.5 text-sm"
              >
                <option value="">(연결 안 함)</option>
                {boards.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </select>
            </div>
          )}
          <div>
            <label className="block text-xs text-gray-500 mb-1">
              settings (JSON — 모듈 종류별 필드는 문서 참고)
            </label>
            <textarea
              value={settingsText}
              onChange={(e) => setSettingsText(e.target.value)}
              rows={5}
              className="w-full rounded-md border border-gray-300 px-2 py-1.5 text-xs font-mono"
            />
            {settingsError && <p className="text-xs text-red-600 mt-1">{settingsError}</p>}
          </div>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="rounded-md bg-gray-800 text-white px-3 py-1.5 text-sm disabled:opacity-50"
          >
            {saving ? "저장 중..." : "저장"}
          </button>
        </div>
      )}
    </div>
  );
}
