"use client";

// EPIC-108: 자유 배치가 켜진 블록에 얹는 드래그(이동)/리사이즈 핸들 —
// 블록 전체를 덮는 오버레이가 아니라 모서리의 작은 버튼 2개뿐이라, 더블
// 클릭으로 텍스트를 고치거나 이미지를 클릭해 업로드하는 기존 인라인 편집
// 동작을 가리지 않는다. 부모(offsetParent — ContainerBlock/RootContainer가
// 항상 position:relative라 그 컨테이너가 잡힌다) 기준 %로 좌표를 옮긴다.
import { useRef, type PointerEvent as ReactPointerEvent, type RefObject } from "react";
import { useCraftEditable } from "@/components/craft/home/editable";
import { clampPct, type FreePosition } from "@/lib/useFreePosition";

type DragState = { mode: "move" | "resize"; startX: number; startY: number; start: FreePosition };

export function FreePositionHandles({
  position,
  onChange,
  anchorRef,
}: {
  position: FreePosition;
  onChange: (next: FreePosition) => void;
  anchorRef: RefObject<HTMLElement | null>;
}) {
  const editable = useCraftEditable();
  const dragRef = useRef<DragState | null>(null);

  if (!editable || !position.enabled) return null;

  function containerRect() {
    const parent = anchorRef.current?.offsetParent as HTMLElement | null;
    return parent?.getBoundingClientRect() ?? null;
  }

  function start(mode: DragState["mode"], e: ReactPointerEvent<HTMLButtonElement>) {
    e.stopPropagation();
    e.preventDefault();
    e.currentTarget.setPointerCapture(e.pointerId);
    dragRef.current = { mode, startX: e.clientX, startY: e.clientY, start: position };
  }

  function move(e: ReactPointerEvent<HTMLButtonElement>) {
    const drag = dragRef.current;
    if (!drag) return;
    const rect = containerRect();
    if (!rect) return;
    const dxPct = ((e.clientX - drag.startX) / rect.width) * 100;
    const dyPct = ((e.clientY - drag.startY) / rect.height) * 100;
    if (drag.mode === "move") {
      onChange({
        ...position,
        xPct: clampPct(drag.start.xPct + dxPct, 0, 100 - drag.start.widthPct),
        yPct: clampPct(drag.start.yPct + dyPct, 0, 100 - drag.start.heightPct),
      });
    } else {
      onChange({
        ...position,
        widthPct: clampPct(drag.start.widthPct + dxPct, 5, 100 - drag.start.xPct),
        heightPct: clampPct(drag.start.heightPct + dyPct, 5, 100 - drag.start.yPct),
      });
    }
  }

  function end() {
    dragRef.current = null;
  }

  return (
    <>
      <button
        type="button"
        onPointerDown={(e) => start("move", e)}
        onPointerMove={move}
        onPointerUp={end}
        onPointerLeave={end}
        title="드래그해서 이동"
        className="absolute -top-2 -left-2 z-30 flex h-5 w-5 cursor-move items-center justify-center rounded bg-blue-500 text-[10px] text-white shadow"
      >
        ✥
      </button>
      <button
        type="button"
        onPointerDown={(e) => start("resize", e)}
        onPointerMove={move}
        onPointerUp={end}
        onPointerLeave={end}
        title="드래그해서 크기 조절"
        className="absolute -bottom-2 -right-2 z-30 h-4 w-4 cursor-nwse-resize rounded-sm bg-blue-500 shadow"
      />
    </>
  );
}
