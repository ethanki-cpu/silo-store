"use client";

import {
  DndContext,
  PointerSensor,
  closestCenter,
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
import { POST_LAYOUT_BLOCK_LABELS, type PostLayoutBlock } from "@/lib/postLayout";

// EPIC-096(요구사항 3.1): 게시글 상세 블록(메타데이터/태그/본문/좋아요·
// 북마크/댓글) 순서를 드래그로 바꾸는 편집기 — 좌측 목록을 끌어놓으면
// 우측 프리뷰가 같은 순서로 즉시 다시 그려진다("실시간 렌더링"). 실제
// 게시글 데이터 없이도(admin/boards/[id]는 board 설정 화면이라 특정
// 게시글이 없다) 각 블록을 그 블록의 진짜 스타일과 유사한 placeholder로
// 그려 레이아웃 감각을 그대로 전달한다 — 정밀 픽셀 일치가 목적이 아니라
// "이 순서로 배치하면 이런 느낌"을 드래그하며 바로 확인하는 것이 목적.
function SortableBlockRow({ block }: { block: PostLayoutBlock }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: block });
  const info = POST_LAYOUT_BLOCK_LABELS[block];

  return (
    <div
      ref={setNodeRef}
      {...attributes}
      {...listeners}
      style={{
        transform: transform ? CSS.Transform.toString(transform) : undefined,
        transition,
        opacity: isDragging ? 0.5 : 1,
      }}
      className="flex cursor-grab items-center gap-2 rounded-md border border-gray-200 bg-white px-3 py-2 text-sm active:cursor-grabbing"
    >
      <span className="text-gray-300" aria-hidden>
        ⠿
      </span>
      <div className="min-w-0">
        <p className="font-medium text-gray-800">{info.label}</p>
        <p className="truncate text-xs text-gray-400">{info.hint}</p>
      </div>
    </div>
  );
}

function PreviewBlock({ block }: { block: PostLayoutBlock }) {
  switch (block) {
    case "meta":
      return (
        <div>
          <p className="text-[10px] text-gray-400">No. 12 · 2026. 8. 12. · 김수미</p>
          <p className="mt-1 font-serif text-base font-semibold text-gray-900">예시 게시글 제목</p>
        </div>
      );
    case "tags":
      return (
        <div className="flex gap-1">
          {["르네상스", "도슨트"].map((t) => (
            <span key={t} className="rounded-full bg-gray-100 px-2 py-0.5 text-[10px] text-gray-500">
              #{t}
            </span>
          ))}
        </div>
      );
    case "body":
      return (
        <div className="space-y-1.5">
          <div className="h-2 w-full rounded bg-gray-100" />
          <div className="h-2 w-full rounded bg-gray-100" />
          <div className="h-2 w-2/3 rounded bg-gray-100" />
        </div>
      );
    case "actions":
      return (
        <div className="flex gap-2">
          <span className="rounded-md border border-gray-200 px-2 py-1 text-[10px] text-gray-500">♡ 좋아요</span>
          <span className="rounded-md border border-gray-200 px-2 py-1 text-[10px] text-gray-500">☆ 북마크</span>
        </div>
      );
    case "comments":
      return (
        <div className="rounded-md bg-gray-50 p-2">
          <p className="text-[10px] font-medium text-gray-500">댓글 2</p>
          <div className="mt-1 h-2 w-3/4 rounded bg-gray-200" />
        </div>
      );
  }
}

export function PostLayoutOrderEditor({
  order,
  onChange,
}: {
  order: PostLayoutBlock[];
  onChange: (next: PostLayoutBlock[]) => void;
}) {
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }));

  function handleDragEnd(e: DragEndEvent) {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    const oldIndex = order.indexOf(active.id as PostLayoutBlock);
    const newIndex = order.indexOf(over.id as PostLayoutBlock);
    if (oldIndex === -1 || newIndex === -1) return;
    onChange(arrayMove(order, oldIndex, newIndex));
  }

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
      <div>
        <p className="mb-2 text-xs text-gray-500">블록을 드래그해 순서를 바꾸세요.</p>
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={order} strategy={verticalListSortingStrategy}>
            <div className="space-y-1.5">
              {order.map((block) => (
                <SortableBlockRow key={block} block={block} />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      </div>
      <div>
        <p className="mb-2 text-xs text-gray-500">실시간 프리뷰</p>
        <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
          <div className="space-y-3">
            {order.map((block) => (
              <PreviewBlock key={block} block={block} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
