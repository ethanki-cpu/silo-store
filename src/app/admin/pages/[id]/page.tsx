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
  PAGE_MODULE_LABELS,
  PAGE_MODULE_ICONS,
  BOARD_LINKED_MODULE_TYPES,
  WIDGET_FIELDS,
  WIDGET_DEFAULT_SETTINGS,
  type PageBuilderRow,
  type PageModuleRow,
  type PageModuleType,
} from "@/lib/pageBuilder";
import { WidgetPalette } from "@/components/admin/WidgetPalette";
import { WidgetInspectorForm } from "@/components/admin/WidgetInspectorForm";
import { PageBuilderRenderer } from "@/components/PageBuilderRenderer";

type BoardOption = { id: string; name: string };

// EPIC-060/EPIC-065: Page Builder 편집 화면 — Visual Widget Builder.
// 운영자는 "+ 위젯 추가"(WidgetPalette) → 위젯 클릭(설정 펼침, settings는
// WidgetInspectorForm의 체크박스/드롭다운/텍스트/목록으로만 편집) → 저장
// 순서만으로 페이지를 완성한다. JSON/HTML을 직접 입력하는 화면은 기본적으로
// 없고, 우측 상단 "개발자 모드"를 켰을 때만 위젯별 원시 JSON 보기/수정이
// 나타난다(요구사항 10). 드래그 순서 변경은 EPIC-035(CategoryTreeManager)와
// 동일한 dnd-kit 조합을 그대로 재사용한다.
//
// 아키텍처: modules(state)는 DB와 항상 동기화된 "저장된" 상태다. 위젯 하나의
// Inspector를 열면 그 위젯만 draft(로컬 임시 상태)로 복사해 편집하고,
// Live Preview는 modules 배열에서 그 위젯 자리만 draft로 치환해서 그린다
// (PageBuilderRenderer는 순수 프레젠테이션이라 즉시 재렌더링됨, 새로고침
// 없음) — "저장" 버튼을 눌러야 draft가 실제로 DB/modules에 반영된다. 위젯
// 추가/복제/숨기기/삭제/순서 변경은 draft 없이 즉시 DB에 반영된다(기존
// EPIC-060 편집 화면과 동일한 즉시-저장 패턴).
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

  const [paletteOpen, setPaletteOpen] = useState(false);
  const [devMode, setDevMode] = useState(false);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [draftBoardId, setDraftBoardId] = useState("");
  const [draftSettings, setDraftSettings] = useState<Record<string, unknown>>({});
  const [draftSaving, setDraftSaving] = useState(false);
  const [devJsonText, setDevJsonText] = useState("");
  const [devJsonError, setDevJsonError] = useState<string | null>(null);

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
          // EPIC-066: Page Builder 위젯의 게시판 드롭다운은 공개된 게시판만
          // 골라야 한다(요구사항 ②) — is_public===false만 명시적으로
          // 제외하고, 필드 자체가 없으면(마이그레이션 전) 기존처럼 전부 보여준다.
          setBoards(
            data
              .filter((b: { is_public?: boolean }) => b.is_public !== false)
              .map((b: { id: string; name: string }) => ({ id: b.id, name: b.name })),
          );
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

  async function handleSelectWidget(type: PageModuleType) {
    if (!page) return;
    setPaletteOpen(false);
    const needsBoard = BOARD_LINKED_MODULE_TYPES.includes(type);
    const { data: inserted, error: insertError } = await supabase
      .from("page_modules")
      .insert({
        page_id: page.id,
        module_type: type,
        board_id: null,
        settings: WIDGET_DEFAULT_SETTINGS[type] ?? {},
        sort_order: modules.length,
        is_hidden: false,
      })
      .select()
      .single();
    if (insertError || !inserted) {
      setError(insertError?.message ?? "위젯을 추가하지 못했어요.");
      return;
    }
    const newModule = inserted as PageModuleRow;
    setModules((prev) => [...prev, newModule]);
    if (needsBoard) {
      openEditor(newModule);
    }
  }

  async function handleDeleteModule(moduleId: string) {
    if (!confirm("이 위젯을 삭제할까요?")) return;
    const { error: deleteError } = await supabase.from("page_modules").delete().eq("id", moduleId);
    if (deleteError) {
      setError(deleteError.message);
      return;
    }
    if (editingId === moduleId) closeEditor();
    setModules((prev) => prev.filter((m) => m.id !== moduleId));
  }

  async function handleDuplicate(module: PageModuleRow) {
    if (!page) return;
    const insertAt = module.sort_order + 1;
    // 뒤 항목들의 sort_order를 한 칸씩 밀어 복제본이 원본 바로 다음에 오게
    // 한다(드래그 재정렬과 동일한 방식으로 즉시 DB에 반영).
    const shifted = modules.filter((m) => m.sort_order >= insertAt);
    await Promise.all(
      shifted.map((m) =>
        supabase.from("page_modules").update({ sort_order: m.sort_order + 1 }).eq("id", m.id),
      ),
    );
    const { data: inserted, error: insertError } = await supabase
      .from("page_modules")
      .insert({
        page_id: page.id,
        module_type: module.module_type,
        board_id: module.board_id,
        settings: module.settings,
        sort_order: insertAt,
        is_hidden: module.is_hidden,
      })
      .select()
      .single();
    if (insertError || !inserted) {
      setError(insertError?.message ?? "위젯을 복제하지 못했어요.");
      return;
    }
    await load();
  }

  async function handleToggleHidden(module: PageModuleRow) {
    const { error: updateError } = await supabase
      .from("page_modules")
      .update({ is_hidden: !module.is_hidden })
      .eq("id", module.id);
    if (updateError) {
      setError(updateError.message);
      return;
    }
    setModules((prev) =>
      prev.map((m) => (m.id === module.id ? { ...m, is_hidden: !m.is_hidden } : m)),
    );
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

  function openEditor(module: PageModuleRow) {
    setEditingId(module.id);
    setDraftBoardId(module.board_id ?? "");
    setDraftSettings(module.settings);
    setDevJsonText(JSON.stringify(module.settings, null, 2));
    setDevJsonError(null);
  }

  function closeEditor() {
    setEditingId(null);
    setDraftBoardId("");
    setDraftSettings({});
    setDevJsonError(null);
  }

  function handleDraftSettingsChange(next: Record<string, unknown>) {
    setDraftSettings(next);
    setDevJsonText(JSON.stringify(next, null, 2));
  }

  function handleApplyDevJson() {
    try {
      const parsed = devJsonText.trim() ? JSON.parse(devJsonText) : {};
      setDraftSettings(parsed);
      setDevJsonError(null);
    } catch {
      setDevJsonError("올바른 JSON이 아니에요.");
    }
  }

  async function handleSaveDraft(moduleId: string) {
    const needsBoard = BOARD_LINKED_MODULE_TYPES.includes(
      modules.find((m) => m.id === moduleId)?.module_type as PageModuleType,
    );
    setDraftSaving(true);
    const { error: updateError } = await supabase
      .from("page_modules")
      .update({
        board_id: needsBoard ? draftBoardId || null : modules.find((m) => m.id === moduleId)?.board_id ?? null,
        settings: draftSettings,
      })
      .eq("id", moduleId);
    setDraftSaving(false);
    if (updateError) {
      setError(updateError.message);
      return;
    }
    setModules((prev) =>
      prev.map((m) =>
        m.id === moduleId
          ? { ...m, board_id: needsBoard ? draftBoardId || null : m.board_id, settings: draftSettings }
          : m,
      ),
    );
    closeEditor();
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

  // Live Preview: modules 배열에서 지금 편집 중인 위젯 자리만 draft로
  // 치환해서 그린다 — 실제 저장 없이도 설정 변경이 즉시 화면에 반영된다.
  const previewModules = modules.map((m) =>
    m.id === editingId ? { ...m, board_id: draftBoardId || null, settings: draftSettings } : m,
  );

  return (
    <main className="flex-1 px-4 sm:px-8 pb-8 w-full">
      <div className="flex items-center justify-between max-w-6xl mx-auto mb-4">
        <button
          type="button"
          onClick={() => router.push("/admin/pages")}
          className="text-sm text-gray-500 hover:underline"
        >
          ← 페이지 목록
        </button>
        <label className="flex items-center gap-1.5 text-xs text-gray-500">
          <input
            type="checkbox"
            checked={devMode}
            onChange={(e) => setDevMode(e.target.checked)}
            className="rounded border-gray-300"
          />
          개발자 모드(원시 JSON)
        </label>
      </div>

      {error && (
        <div className="max-w-6xl mx-auto mb-4 rounded-lg border border-red-300 bg-red-50 p-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
        {/* 좌측: 페이지 정보 + 위젯 목록/편집 */}
        <div className="space-y-6">
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
              <h2 className="text-sm font-semibold text-gray-700">위젯 ({modules.length})</h2>
              <button
                type="button"
                onClick={() => setPaletteOpen(true)}
                className="rounded-md bg-gray-800 text-white px-3 py-1.5 text-sm hover:bg-gray-700"
              >
                + 위젯 추가
              </button>
            </div>

            {modules.length === 0 ? (
              <p className="text-gray-400 text-sm">아직 위젯이 없어요. “+ 위젯 추가”로 시작하세요.</p>
            ) : (
              <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
                <SortableContext items={modules.map((m) => m.id)} strategy={verticalListSortingStrategy}>
                  <div className="space-y-2">
                    {modules.map((module) => (
                      <WidgetRow
                        key={module.id}
                        module={module}
                        boards={boards}
                        editing={editingId === module.id}
                        devMode={devMode}
                        draftBoardId={draftBoardId}
                        draftSettings={draftSettings}
                        draftSaving={draftSaving}
                        devJsonText={devJsonText}
                        devJsonError={devJsonError}
                        onOpenEditor={() => (editingId === module.id ? closeEditor() : openEditor(module))}
                        onDraftBoardIdChange={setDraftBoardId}
                        onDraftSettingsChange={handleDraftSettingsChange}
                        onDevJsonTextChange={setDevJsonText}
                        onApplyDevJson={handleApplyDevJson}
                        onSaveDraft={() => handleSaveDraft(module.id)}
                        onCancelDraft={closeEditor}
                        onDuplicate={() => handleDuplicate(module)}
                        onToggleHidden={() => handleToggleHidden(module)}
                        onDelete={() => handleDeleteModule(module.id)}
                      />
                    ))}
                  </div>
                </SortableContext>
              </DndContext>
            )}
          </section>
        </div>

        {/* 우측: Live Preview — 설정을 바꾸면 새로고침 없이 즉시 반영 */}
        <div className="lg:sticky lg:top-4">
          <div className="rounded-lg border border-gray-200 overflow-hidden">
            <div className="border-b border-gray-200 bg-gray-50 px-4 py-2 text-xs font-medium text-gray-500">
              미리보기 (숨긴 위젯도 흐리게 표시됨 — 공개 페이지에는 안 보임)
            </div>
            <div className="max-h-[80vh] overflow-y-auto p-6 bg-white">
              <PageBuilderRenderer modules={previewModules} includeHidden />
            </div>
          </div>
        </div>
      </div>

      {paletteOpen && (
        <WidgetPalette onSelect={handleSelectWidget} onClose={() => setPaletteOpen(false)} />
      )}
    </main>
  );
}

function WidgetRow({
  module,
  boards,
  editing,
  devMode,
  draftBoardId,
  draftSettings,
  draftSaving,
  devJsonText,
  devJsonError,
  onOpenEditor,
  onDraftBoardIdChange,
  onDraftSettingsChange,
  onDevJsonTextChange,
  onApplyDevJson,
  onSaveDraft,
  onCancelDraft,
  onDuplicate,
  onToggleHidden,
  onDelete,
}: {
  module: PageModuleRow;
  boards: BoardOption[];
  editing: boolean;
  devMode: boolean;
  draftBoardId: string;
  draftSettings: Record<string, unknown>;
  draftSaving: boolean;
  devJsonText: string;
  devJsonError: string | null;
  onOpenEditor: () => void;
  onDraftBoardIdChange: (id: string) => void;
  onDraftSettingsChange: (next: Record<string, unknown>) => void;
  onDevJsonTextChange: (text: string) => void;
  onApplyDevJson: () => void;
  onSaveDraft: () => void;
  onCancelDraft: () => void;
  onDuplicate: () => void;
  onToggleHidden: () => void;
  onDelete: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: module.id,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  };

  const type = module.module_type as PageModuleType;
  const needsBoard = BOARD_LINKED_MODULE_TYPES.includes(type);
  const fields = WIDGET_FIELDS[type] ?? [];

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`rounded-lg border p-3 ${module.is_hidden ? "border-gray-200 bg-gray-50" : "border-gray-200"}`}
    >
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
        <span aria-hidden="true">{PAGE_MODULE_ICONS[type] ?? "🧩"}</span>
        <span className="text-sm font-medium">{PAGE_MODULE_LABELS[type] ?? type}</span>
        {module.is_hidden && (
          <span className="text-xs text-amber-600">숨김</span>
        )}
        {needsBoard && (
          <span className="text-xs text-gray-400">
            {boards.find((b) => b.id === module.board_id)?.name ?? "게시판 미연결"}
          </span>
        )}
        <div className="ml-auto flex gap-1">
          <button
            type="button"
            onClick={onOpenEditor}
            className="rounded-md border border-gray-300 px-2 py-1 text-xs hover:bg-gray-50"
          >
            {editing ? "닫기" : "설정"}
          </button>
          <button
            type="button"
            onClick={onDuplicate}
            className="rounded-md border border-gray-300 px-2 py-1 text-xs hover:bg-gray-50"
          >
            복제
          </button>
          <button
            type="button"
            onClick={onToggleHidden}
            className="rounded-md border border-gray-300 px-2 py-1 text-xs hover:bg-gray-50"
          >
            {module.is_hidden ? "보이기" : "숨기기"}
          </button>
          <button
            type="button"
            onClick={onDelete}
            className="rounded-md border border-gray-300 px-2 py-1 text-xs text-red-600 hover:bg-red-50"
          >
            삭제
          </button>
        </div>
      </div>

      {editing && (
        <div className="mt-3 space-y-3 border-t border-gray-100 pt-3">
          {needsBoard && (
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">게시판 선택</label>
              <select
                value={draftBoardId}
                onChange={(e) => onDraftBoardIdChange(e.target.value)}
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

          <WidgetInspectorForm fields={fields} settings={draftSettings} onChange={onDraftSettingsChange} />

          {devMode && (
            <div className="rounded-md border border-dashed border-amber-300 bg-amber-50 p-2">
              <label className="block text-xs font-medium text-amber-700 mb-1">
                개발자 모드 — 원시 JSON (일반 운영자는 사용하지 않음)
              </label>
              <textarea
                value={devJsonText}
                onChange={(e) => onDevJsonTextChange(e.target.value)}
                rows={5}
                className="w-full rounded-md border border-amber-300 px-2 py-1.5 text-xs font-mono"
              />
              {devJsonError && <p className="text-xs text-red-600 mt-1">{devJsonError}</p>}
              <button
                type="button"
                onClick={onApplyDevJson}
                className="mt-1.5 rounded-md border border-amber-400 px-2 py-1 text-xs text-amber-700 hover:bg-amber-100"
              >
                JSON 적용(위 폼에 반영)
              </button>
            </div>
          )}

          <div className="flex gap-2">
            <button
              type="button"
              onClick={onSaveDraft}
              disabled={draftSaving}
              className="rounded-md bg-gray-800 text-white px-3 py-1.5 text-sm disabled:opacity-50"
            >
              {draftSaving ? "저장 중..." : "저장"}
            </button>
            <button
              type="button"
              onClick={onCancelDraft}
              className="rounded-md border border-gray-300 px-3 py-1.5 text-sm hover:bg-gray-50"
            >
              취소
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
