"use client";

// A2(사용자 지시 — "행성이나 위성을 클릭하면 나오는 창을 드래그
// 드랍해서 이동할수 있게 해줘"): 설정 패널들(PlanetSettingsPanel/
// UniverseSettingsPanel/ObjectInspectorPanel)이 전부 순수 CSS
// `fixed` 위치라 화면 안에서 옮길 수 없었다 — 이 훅을 패널마다 붙이면
// 헤더 바를 눌러 드래그한 만큼 오프셋을 누적해 옮길 수 있다. 패널이
// 닫혔다 다시 열릴 때(리마운트) 자동으로 원위치로 초기화된다.
import { useRef, useState, type PointerEvent as ReactPointerEvent } from "react";

export function useDraggablePanel() {
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const dragOrigin = useRef<{ startX: number; startY: number; originX: number; originY: number } | null>(null);

  function onPointerDown(e: ReactPointerEvent<HTMLElement>) {
    // 헤더 안의 버튼(닫기 등)을 눌렀을 때는 드래그로 가로채지 않는다.
    if ((e.target as HTMLElement).closest("button, input, select, textarea")) return;
    const startX = e.clientX;
    const startY = e.clientY;
    // 현재 오프셋은 클로저로 캐싱하지 않고, ref 없이 setState 함수형
    // 업데이트로 읽는다 — 같은 참조를 그대로 반환하면 리렌더도 없다.
    setOffset((current) => {
      dragOrigin.current = { startX, startY, originX: current.x, originY: current.y };
      return current;
    });

    function handlePointerMove(ev: PointerEvent) {
      const drag = dragOrigin.current;
      if (!drag) return;
      setOffset({
        x: drag.originX + (ev.clientX - drag.startX),
        y: drag.originY + (ev.clientY - drag.startY),
      });
    }
    function handlePointerUp() {
      dragOrigin.current = null;
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
    }
    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handlePointerUp);
  }

  return {
    offset,
    dragHandleProps: {
      onPointerDown,
      style: { cursor: "grab", touchAction: "none" as const },
    },
  };
}
