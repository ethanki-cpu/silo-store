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
  // EPIC-109: 켜져 있으면 리사이즈 핸들이 가로 이동량만 반영하고, 세로는
  // 컨테이너 실제 픽셀 크기를 기준으로 이 비율에 맞춰 자동 계산한다(가로/
  // 세로 % 자체는 컨테이너가 정사각형이 아니면 같은 %라도 실제 픽셀 비율이
  // 다르므로, 픽셀 단위로 환산해야 눈으로 보이는 비율이 정확히 유지된다).
  lockedAspectRatio = null,
}: {
  position: FreePosition;
  onChange: (next: FreePosition) => void;
  anchorRef: RefObject<HTMLElement | null>;
  lockedAspectRatio?: number | null;
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
    // 드래그 시작 시점에 이 포인터가 이미 "활성"이 아니면(트랙패드/터치
    // 이벤트가 겹치는 등 드문 경우) setPointerCapture가 NotFoundError를
    // 던진다 — 캡처가 안 잡혀도 dragRef는 그대로 세팅해 move/up 핸들러가
    // 계속 동작하도록 한다(캡처는 "포인터가 버튼 밖으로 나가도 계속 이
    // 버튼이 받는다"는 편의 기능일 뿐, 없어도 핸들 위에서의 드래그 자체는
    // 정상 동작).
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {
      // no-op — 아래 dragRef 세팅은 그대로 진행
    }
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
      const widthPct = clampPct(drag.start.widthPct + dxPct, 5, 100 - drag.start.xPct);
      let heightPct: number;
      if (lockedAspectRatio) {
        const widthPx = (widthPct / 100) * rect.width;
        const heightPx = widthPx / lockedAspectRatio;
        heightPct = clampPct((heightPx / rect.height) * 100, 5, 100 - drag.start.yPct);
      } else {
        heightPct = clampPct(drag.start.heightPct + dyPct, 5, 100 - drag.start.yPct);
      }
      onChange({ ...position, widthPct, heightPct });
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
