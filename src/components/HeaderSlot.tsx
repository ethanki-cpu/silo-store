"use client";

// EPIC-136(헤더 재구축): Navbar.tsx의 각 요소(로고/탭/계정 메뉴 항목)를
// 감싸 "관리자 편집 모드에서 클릭→선택, 드래그→이동"을 붙이는 얇은 래퍼.
// headerLayoutPositions.ts 상단 주석 참고 — position:absolute가 아니라
// transform: translate(dx, dy)만 얹는 방식이라 원래 flex 레이아웃/문서
// 흐름을 전혀 바꾸지 않는다(기존 구조 회귀 위험 최소화).
//
// 이 컴포넌트는 Navbar.tsx 안에서만 쓰이지만, Navbar 함수 본문 안에
// inline으로 정의하면 매 렌더마다 새 컴포넌트 타입이 만들어져 리액트가
// 매번 마운트/언마운트로 취급해(드래그 중 포인터 캡처가 끊기는 등) 버그가
// 나므로 모듈 최상위에 독립 컴포넌트로 둔다.
import { useRef, type CSSProperties, type PointerEvent as ReactPointerEvent, type ReactNode } from "react";
import { SelectionOverlay } from "@/components/SelectionOverlay";
import { DEFAULT_HEADER_SLOT_OFFSET, type HeaderSlotOffset } from "@/lib/headerLayoutPositions";

type DragState = { startX: number; startY: number; startDx: number; startDy: number };

export function HeaderSlot({
  slotKey,
  label,
  offset,
  editable,
  selected,
  onSelect,
  onOffsetChange,
  as: Tag = "div",
  className,
  style,
  children,
}: {
  slotKey: string;
  label: string;
  offset: HeaderSlotOffset | undefined;
  editable: boolean;
  selected: boolean;
  onSelect: (slotKey: string) => void;
  onOffsetChange: (slotKey: string, next: HeaderSlotOffset) => void;
  as?: "div" | "span";
  className?: string;
  style?: CSSProperties;
  children: ReactNode;
}) {
  const value = offset ?? DEFAULT_HEADER_SLOT_OFFSET;
  const dragRef = useRef<DragState | null>(null);
  const moved = value.dxPx !== 0 || value.dyPx !== 0;

  function startDrag(e: ReactPointerEvent<HTMLButtonElement>) {
    e.stopPropagation();
    e.preventDefault();
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {
      // no-op — 캡처 실패해도 아래 dragRef는 그대로 세팅
    }
    dragRef.current = { startX: e.clientX, startY: e.clientY, startDx: value.dxPx, startDy: value.dyPx };
  }
  function moveDrag(e: ReactPointerEvent<HTMLButtonElement>) {
    const drag = dragRef.current;
    if (!drag) return;
    onOffsetChange(slotKey, {
      dxPx: drag.startDx + (e.clientX - drag.startX),
      dyPx: drag.startDy + (e.clientY - drag.startY),
      raised: true,
    });
  }
  function endDrag() {
    dragRef.current = null;
  }

  const wrapperStyle: CSSProperties = {
    ...style,
    ...(moved || (value.raised && editable) ? { position: "relative", zIndex: 30 } : undefined),
    ...(moved ? { transform: `translate(${value.dxPx}px, ${value.dyPx}px)` } : undefined),
  };

  return (
    <Tag
      style={wrapperStyle}
      className={className}
      onClick={
        editable
          ? (e) => {
              e.stopPropagation();
              onSelect(slotKey);
            }
          : undefined
      }
    >
      {children}
      {editable && (
        <>
          <SelectionOverlay selected={selected} hovered={false} label={label} />
          {selected && (
            <button
              type="button"
              onPointerDown={startDrag}
              onPointerMove={moveDrag}
              onPointerUp={endDrag}
              onPointerLeave={endDrag}
              title="드래그해서 이동"
              className="absolute -top-3 left-1/2 z-30 flex h-5 w-5 -translate-x-1/2 cursor-move items-center justify-center rounded bg-blue-500 text-[10px] text-white shadow"
            >
              ✥
            </button>
          )}
        </>
      )}
    </Tag>
  );
}
