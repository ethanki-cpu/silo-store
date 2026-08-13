"use client";

// EPIC-097(사용자 지시): "타임라인 위젯 설정" — Common Ninja류 프로 레벨
// 웹 빌더를 참고한 2단 Split UI. 좌측(다크 테마) 항목 목록/입력 폼과
// 우측(라이트) 실시간 프리뷰 캔버스로 화면을 통째로 분할한다. 일반적인
// WidgetRow 인라인 아코디언(WidgetInspectorForm)과 달리, 이 위젯 하나만은
// dnd-kit 드래그 정렬 + 아코디언 펼침 + 이미지 업로드 + Tiptap 미니
// 에디터가 전부 필요해 generic FieldDef 파이프라인(text/textarea/number/
// checkbox/select/list, itemFields는 text/textarea만 지원)으로 표현할 수
// 없다 — 그래서 admin/pages/[id]/page.tsx가 module_type === "timeline"일
// 때만 WidgetInspectorForm 대신 이 컴포넌트를 전체 화면 오버레이로 띄운다.
//
// 저장 아키텍처는 기존과 동일한 draft 패턴을 그대로 따른다: 이 컴포넌트는
// items를 직접 DB에 쓰지 않고 onChange(items)로 부모의 draftSettings.items만
// 갱신한다 — 오버레이를 닫으면 뒤에 있던 WidgetRow의 "저장"/"취소" 버튼이
// 그 draft를 실제로 반영한다(다른 위젯 타입과 동일한 흐름, 이중 저장 로직 없음).

import { useState } from "react";
import type { JSONContent } from "@tiptap/react";
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
import type { TimelineItemSettings } from "@/lib/widgetSchema";
import { uploadFile } from "@/lib/storage";
import { AlternatingTimelineCanvas } from "@/components/modules/AlternatingTimelineCanvas";
import { TimelineDescriptionEditor } from "@/components/admin/TimelineDescriptionEditor";
import { TimelinePostPicker, type PickedPost } from "@/components/admin/TimelinePostPicker";
import { sanitizeHtml } from "@/lib/sanitize";

function escapeHtml(text: string): string {
  return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

// EPIC-097 후속("게시글 연결"): PickedPost(제목/요약/썸네일/링크)를 항목
// 필드로 매핑한다. Card Description은 다른 필드 입력과 동일하게 Tiptap
// JSON을 원본으로 만들어야 나중에 에디터로 다시 열어도 정상 동작한다 —
// 발췌 텍스트 하나짜리 최소 문단 문서로 감싼다.
function mapPickedPostToItem(post: PickedPost): Partial<TimelineItemSettings> {
  const descriptionJson = {
    type: "doc",
    content: [{ type: "paragraph", content: post.excerpt ? [{ type: "text", text: post.excerpt }] : [] }],
  };
  return {
    cardTitle: post.title,
    imageUrl: post.thumbnailUrl,
    descriptionJson,
    descriptionHtml: post.excerpt ? sanitizeHtml(`<p>${escapeHtml(post.excerpt)}</p>`) : "",
    linkUrl: post.url,
    linkedPostId: post.postId,
  };
}

function newItem(): TimelineItemSettings {
  return { id: crypto.randomUUID(), title: "새 항목" };
}

export function TimelineWidgetEditor({
  items,
  onChange,
  onClose,
}: {
  items: TimelineItemSettings[];
  onChange: (items: TimelineItemSettings[]) => void;
  onClose: () => void;
}) {
  const [openId, setOpenId] = useState<string | null>(items[0]?.id ?? null);
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }));

  function updateItem(id: string, patch: Partial<TimelineItemSettings>) {
    onChange(items.map((it) => (it.id === id ? { ...it, ...patch } : it)));
  }

  function deleteItem(id: string) {
    onChange(items.filter((it) => it.id !== id));
    if (openId === id) setOpenId(null);
  }

  function addItem() {
    const item = newItem();
    onChange([...items, item]);
    setOpenId(item.id);
  }

  function handleDragEnd(e: DragEndEvent) {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    const oldIndex = items.findIndex((it) => it.id === active.id);
    const newIndex = items.findIndex((it) => it.id === over.id);
    if (oldIndex === -1 || newIndex === -1) return;
    onChange(arrayMove(items, oldIndex, newIndex));
  }

  return (
    <div className="fixed inset-0 z-50 flex bg-gray-950">
      {/* 좌측: 다크 테마 설정 패널 */}
      <div className="flex w-full flex-col border-r border-white/10 bg-gray-950 text-gray-100 md:w-[38%] lg:w-[34%]">
        <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
          <h2 className="text-sm font-semibold">타임라인 위젯 설정</h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md border border-white/15 px-3 py-1 text-xs text-gray-300 hover:bg-white/10"
          >
            닫기
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-3">
          {items.length === 0 ? (
            <p className="px-2 py-8 text-center text-xs text-gray-500">
              아직 항목이 없어요. 아래 “+ Add Item”으로 첫 항목을 추가하세요.
            </p>
          ) : (
            <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
              <SortableContext items={items.map((it) => it.id)} strategy={verticalListSortingStrategy}>
                <div className="space-y-2">
                  {items.map((item) => (
                    <TimelineItemAccordion
                      key={item.id}
                      item={item}
                      open={openId === item.id}
                      onToggle={() => setOpenId(openId === item.id ? null : item.id)}
                      onChange={(patch) => updateItem(item.id, patch)}
                      onDelete={() => deleteItem(item.id)}
                    />
                  ))}
                </div>
              </SortableContext>
            </DndContext>
          )}
        </div>

        <div className="border-t border-white/10 p-3">
          <button
            type="button"
            onClick={addItem}
            className="w-full rounded-md border border-dashed border-white/20 py-2 text-sm text-gray-300 hover:border-white/40 hover:bg-white/5"
          >
            + Add Item
          </button>
        </div>
      </div>

      {/* 우측: 실시간 프리뷰 캔버스 */}
      <div className="hidden flex-1 flex-col bg-gray-50 md:flex">
        <div className="border-b border-gray-200 bg-white px-6 py-3 text-center text-lg font-serif font-bold text-gray-900">
          My Timeline
        </div>
        <div className="flex-1 overflow-y-auto px-8 py-10">
          <div className="mx-auto max-w-3xl">
            <AlternatingTimelineCanvas items={items} />
          </div>
        </div>
      </div>
    </div>
  );
}

function TimelineItemAccordion({
  item,
  open,
  onToggle,
  onChange,
  onDelete,
}: {
  item: TimelineItemSettings;
  open: boolean;
  onToggle: () => void;
  onChange: (patch: Partial<TimelineItemSettings>) => void;
  onDelete: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: item.id });
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  };

  const descriptionJson = (item.descriptionJson as JSONContent | undefined) ?? undefined;

  async function handleImageFile(file: File | null) {
    if (!file) return;
    setUploading(true);
    setUploadError(null);
    const { url, error } = await uploadFile(file, "post-images", "timeline-widget");
    setUploading(false);
    if (error || !url) {
      setUploadError(error ?? "업로드에 실패했어요.");
      return;
    }
    onChange({ imageUrl: url });
  }

  return (
    <div ref={setNodeRef} style={style} className="overflow-hidden rounded-lg border border-white/10 bg-white/5">
      <div className="flex items-center gap-2 px-2 py-2">
        <button
          type="button"
          {...attributes}
          {...listeners}
          aria-label="드래그해서 순서 변경"
          className="cursor-grab touch-none select-none px-1 text-gray-500"
        >
          ⠿
        </button>
        <button type="button" onClick={onToggle} className="min-w-0 flex-1 truncate text-left text-sm">
          {item.linkedPostId && <span title="게시글에서 가져옴">🔗 </span>}
          {item.title || "(제목 없음)"}
        </button>
        <button
          type="button"
          onClick={onDelete}
          aria-label="항목 삭제"
          title="항목 삭제"
          className="rounded p-1 text-gray-500 hover:bg-red-500/20 hover:text-red-400"
        >
          🗑
        </button>
        <button
          type="button"
          onClick={onToggle}
          aria-label={open ? "접기" : "펼치기"}
          className="rounded p-1 text-gray-500 hover:bg-white/10"
        >
          {open ? "▲" : "▼"}
        </button>
      </div>

      {open && (
        <div className="space-y-3 border-t border-white/10 px-3 py-3">
          <button
            type="button"
            onClick={() => setPickerOpen(true)}
            className="w-full rounded-md border border-dashed border-white/20 py-1.5 text-xs text-gray-300 hover:border-white/40 hover:bg-white/5"
          >
            📎 게시글에서 가져오기{item.linkedPostId ? " (다시 가져오기)" : ""}
          </button>
          {pickerOpen && (
            <TimelinePostPicker
              onClose={() => setPickerOpen(false)}
              onSelect={(post) => {
                onChange(mapPickedPostToItem(post));
                setPickerOpen(false);
              }}
            />
          )}

          <Field label="Title">
            <input
              value={item.title}
              onChange={(e) => onChange({ title: e.target.value })}
              className="w-full rounded-md border border-white/15 bg-gray-900 px-2 py-1.5 text-sm text-gray-100"
              placeholder="예: 2024"
            />
          </Field>

          <Field label="Title Color">
            <input
              type="color"
              value={item.titleColorHex ?? "#ffffff"}
              onChange={(e) => onChange({ titleColorHex: e.target.value })}
              className="h-8 w-14 cursor-pointer rounded border border-white/15 bg-gray-900 p-0.5"
            />
          </Field>

          <Field label="Subtitle">
            <input
              value={item.subtitle ?? ""}
              onChange={(e) => onChange({ subtitle: e.target.value })}
              className="w-full rounded-md border border-white/15 bg-gray-900 px-2 py-1.5 text-sm text-gray-100"
              placeholder="예: 2024. 3. 1."
            />
          </Field>

          <Field label="Card Image">
            <label className="flex h-24 w-24 cursor-pointer items-center justify-center overflow-hidden rounded-md border border-white/15 bg-gray-900 text-gray-500 hover:border-white/30">
              {uploading ? (
                <span className="text-xs">업로드 중...</span>
              ) : item.imageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={item.imageUrl} alt="" className="h-full w-full object-cover" />
              ) : (
                <span className="text-2xl">🖼</span>
              )}
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => handleImageFile(e.target.files?.[0] ?? null)}
              />
            </label>
            {uploadError && <p className="mt-1 text-xs text-red-400">{uploadError}</p>}
          </Field>

          <Field label="Card Title">
            <input
              value={item.cardTitle ?? ""}
              onChange={(e) => onChange({ cardTitle: e.target.value })}
              className="w-full rounded-md border border-white/15 bg-gray-900 px-2 py-1.5 text-sm text-gray-100"
              placeholder="Card Title"
            />
          </Field>

          <Field label="Card Description">
            <TimelineDescriptionEditor
              content={descriptionJson}
              onChange={(json, html) => onChange({ descriptionJson: json, descriptionHtml: html })}
            />
          </Field>

          <Field label="Card Link">
            <input
              value={item.linkUrl ?? ""}
              onChange={(e) => onChange({ linkUrl: e.target.value })}
              className="w-full rounded-md border border-white/15 bg-gray-900 px-2 py-1.5 text-sm text-gray-100"
              placeholder="Enter URL"
            />
          </Field>

          <Field label="Card Link Text">
            <input
              value={item.linkText ?? ""}
              onChange={(e) => onChange({ linkText: e.target.value })}
              className="w-full rounded-md border border-white/15 bg-gray-900 px-2 py-1.5 text-sm text-gray-100"
              placeholder="Enter Text"
            />
          </Field>

          <Field label="Card Link Target">
            <select
              value={item.linkTarget ?? "_self"}
              onChange={(e) => onChange({ linkTarget: e.target.value === "_blank" ? "_blank" : "_self" })}
              className="w-full rounded-md border border-white/15 bg-gray-900 px-2 py-1.5 text-sm text-gray-100"
            >
              <option value="_self">Same Tab</option>
              <option value="_blank">New Tab</option>
            </select>
          </Field>
        </div>
      )}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="mb-1 block text-xs font-medium text-gray-400">{label}</label>
      {children}
    </div>
  );
}
