"use client";

// EPIC-108/110: 자유 배치가 켜진 블록에 얹는 선택 표시 + 드래그(이동)/
// 리사이즈 핸들. 실제 선택된(클릭한) 블록일 때만 보이도록 해서(EPIC-110)
// 화면에 여러 자유배치 블록이 있어도 지금 만지는 것만 표시되게 한다.
// 테두리 박스 자체는 pointer-events-none이라 더블클릭으로 텍스트를 고치거나
// 이미지를 클릭해 업로드하는 기존 인라인 편집 동작을 가리지 않고, 모서리의
// 작은 점 4개 + 이동 핸들 1개만 클릭 가능하다. 부모(offsetParent —
// ContainerBlock/RootContainer가 항상 position:relative라 그 컨테이너가
// 잡힌다) 기준 %로 좌표를 옮긴다.
import { useNode } from "@craftjs/core";
import { useRef, type PointerEvent as ReactPointerEvent, type RefObject } from "react";
import { useCraftEditable } from "@/components/craft/home/editable";
import { useDeviceMode } from "@/components/craft/shared/DeviceModeContext";
import { clampPct, type FreePosition } from "@/lib/useFreePosition";

type Corner = "nw" | "ne" | "sw" | "se";
type DragState = { mode: "move" | "resize"; corner?: Corner; startX: number; startY: number; start: FreePosition };

const CORNERS: { corner: Corner; className: string; cursor: string }[] = [
  { corner: "nw", className: "-top-1.5 -left-1.5", cursor: "cursor-nwse-resize" },
  { corner: "ne", className: "-top-1.5 -right-1.5", cursor: "cursor-nesw-resize" },
  { corner: "sw", className: "-bottom-1.5 -left-1.5", cursor: "cursor-nesw-resize" },
  { corner: "se", className: "-bottom-1.5 -right-1.5", cursor: "cursor-nwse-resize" },
];

export function FreePositionHandles({
  position,
  onChange,
  anchorRef,
  // EPIC-109: 켜져 있으면 리사이즈 핸들이 가로 이동량만 반영하고, 세로는
  // 컨테이너 실제 픽셀 크기를 기준으로 이 비율에 맞춰 자동 계산한다(가로/
  // 세로 % 자체는 컨테이너가 정사각형이 아니면 같은 %라도 실제 픽셀 비율이
  // 다르므로, 픽셀 단위로 환산해야 눈으로 보이는 비율이 정확히 유지된다).
  lockedAspectRatio = null,
  // HOTFIX-147.7(사용자 지시 — 모바일 전용 드래그 위치): 둘 다 넘긴 블록만
  // "모바일 모드일 때는 mobilePosition을 드래그"하게 된다 — 안 넘기면(6개
  // 기존 블록) deviceMode와 무관하게 항상 position 하나만 편집하는 기존
  // 동작 그대로다.
  mobilePosition,
  onMobileChange,
}: {
  position: FreePosition;
  onChange: (next: FreePosition) => void;
  anchorRef: RefObject<HTMLElement | null>;
  lockedAspectRatio?: number | null;
  mobilePosition?: FreePosition | null;
  onMobileChange?: (next: FreePosition) => void;
}) {
  const editable = useCraftEditable();
  const deviceMode = useDeviceMode();
  const { isSelected } = useNode((node) => ({ isSelected: node.events.selected }));
  const dragRef = useRef<DragState | null>(null);

  const editingMobile = deviceMode === "mobile" && onMobileChange !== undefined;
  const effectivePosition = editingMobile ? (mobilePosition ?? position) : position;
  const handleChange = editingMobile ? onMobileChange! : onChange;

  if (!editable || !position.enabled || !isSelected) return null;

  function containerRect() {
    const parent = anchorRef.current?.offsetParent as HTMLElement | null;
    return parent?.getBoundingClientRect() ?? null;
  }

  function start(mode: DragState["mode"], e: ReactPointerEvent<HTMLButtonElement>, corner?: Corner) {
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
    dragRef.current = { mode, corner, startX: e.clientX, startY: e.clientY, start: effectivePosition };
  }

  // EPIC-110: 네 모서리 중 어느 쪽을 잡았는지에 따라 반대쪽 변은 고정하고
  // 잡은 쪽 x/y와 너비/높이만 조절한다(예: nw는 오른쪽/아래 변 고정).
  function resizeFromCorner(corner: Corner, dxPct: number, dyPct: number, rect: DOMRect, start: FreePosition) {
    const west = corner === "nw" || corner === "sw";
    const north = corner === "nw" || corner === "ne";

    let xPct = start.xPct;
    let widthPct = start.widthPct;
    if (west) {
      const rightEdge = start.xPct + start.widthPct;
      xPct = clampPct(start.xPct + dxPct, 0, rightEdge - 5);
      widthPct = rightEdge - xPct;
    } else {
      widthPct = clampPct(start.widthPct + dxPct, 5, 100 - start.xPct);
    }

    let yPct = start.yPct;
    let heightPct: number;
    if (lockedAspectRatio) {
      const widthPx = (widthPct / 100) * rect.width;
      const heightPx = widthPx / lockedAspectRatio;
      heightPct = clampPct((heightPx / rect.height) * 100, 5, 100);
      if (north) yPct = clampPct(start.yPct + start.heightPct - heightPct, 0, 100 - heightPct);
    } else if (north) {
      const bottomEdge = start.yPct + start.heightPct;
      yPct = clampPct(start.yPct + dyPct, 0, bottomEdge - 5);
      heightPct = bottomEdge - yPct;
    } else {
      heightPct = clampPct(start.heightPct + dyPct, 5, 100 - start.yPct);
    }

    return { xPct, yPct, widthPct, heightPct };
  }

  function move(e: ReactPointerEvent<HTMLButtonElement>) {
    const drag = dragRef.current;
    if (!drag) return;
    const rect = containerRect();
    if (!rect) return;
    const dxPct = ((e.clientX - drag.startX) / rect.width) * 100;
    const dyPct = ((e.clientY - drag.startY) / rect.height) * 100;
    if (drag.mode === "move") {
      handleChange({
        ...effectivePosition,
        xPct: clampPct(drag.start.xPct + dxPct, 0, 100 - drag.start.widthPct),
        yPct: clampPct(drag.start.yPct + dyPct, 0, 100 - drag.start.heightPct),
      });
    } else if (drag.corner) {
      handleChange({ ...effectivePosition, ...resizeFromCorner(drag.corner, dxPct, dyPct, rect, drag.start) });
    }
  }

  function end() {
    dragRef.current = null;
  }

  return (
    <>
      {/* 선택 표시용 테두리 박스 — 클릭을 가로채지 않도록 pointer-events-none */}
      <div className="pointer-events-none absolute inset-0 z-20 rounded-sm ring-2 ring-blue-500" />
      <button
        type="button"
        onPointerDown={(e) => start("move", e)}
        onPointerMove={move}
        onPointerUp={end}
        onPointerLeave={end}
        title="드래그해서 이동"
        className="absolute -top-3 left-1/2 z-30 flex h-5 w-5 -translate-x-1/2 cursor-move items-center justify-center rounded bg-blue-500 text-[10px] text-white shadow"
      >
        ✥
      </button>
      {CORNERS.map(({ corner, className, cursor }) => (
        <button
          key={corner}
          type="button"
          onPointerDown={(e) => start("resize", e, corner)}
          onPointerMove={move}
          onPointerUp={end}
          onPointerLeave={end}
          title="드래그해서 크기 조절"
          className={`absolute z-30 h-3 w-3 ${cursor} rounded-full border-2 border-white bg-blue-500 shadow ${className}`}
        />
      ))}
    </>
  );
}
