"use client";

// EPIC-102/103: 화면 어디든 클릭+드래그로 좌우로 넘기는 가로 스크롤 목록에서
// 공통으로 쓰는 pointer 드래그 로직 — SlideshowBlock(mode="drag")과
// BoardEmbedBlock(cardStyle="dragRow")이 똑같은 mousedown/move/up→scrollLeft
// 조작을 필요로 해 하나로 뽑았다.
import { useRef, type PointerEvent as ReactPointerEvent } from "react";

export function usePointerDragScroll<T extends HTMLElement>() {
  const ref = useRef<T | null>(null);
  const dragState = useRef<{ startX: number; startScrollLeft: number; dragging: boolean }>({
    startX: 0,
    startScrollLeft: 0,
    dragging: false,
  });

  function onPointerDown(e: ReactPointerEvent) {
    const node = ref.current;
    if (!node) return;
    dragState.current = { startX: e.clientX, startScrollLeft: node.scrollLeft, dragging: true };
    node.setPointerCapture(e.pointerId);
  }
  function onPointerMove(e: ReactPointerEvent) {
    const node = ref.current;
    if (!node || !dragState.current.dragging) return;
    node.scrollLeft = dragState.current.startScrollLeft - (e.clientX - dragState.current.startX);
  }
  function onPointerUp() {
    dragState.current.dragging = false;
  }

  return { ref, onPointerDown, onPointerMove, onPointerUp };
}
