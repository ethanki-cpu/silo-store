"use client";

// A2(사용자 지시 — "행성이나 위성을 클릭하면 나오는 창을 드래그
// 드랍해서 이동할수 있게 해줘"): 설정 패널들(PlanetSettingsPanel/
// UniverseSettingsPanel/ObjectInspectorPanel)이 전부 순수 CSS
// `fixed` 위치라 화면 안에서 옮길 수 없었다 — 이 훅을 패널마다 붙이면
// 헤더 바를 눌러 드래그한 만큼 오프셋을 누적해 옮길 수 있다. 패널이
// 닫혔다 다시 열릴 때(리마운트) 자동으로 원위치로 초기화된다.
//
// EPIC-144(사용자 지시 — "어떤 설정창이든 그 설정창 외부를 누르면
// 설정창이 해제될수 있게 해줘"): onClickOutside를 넘기면 panelRef가
// 가리키는 DOM 밖을 클릭했을 때 자동으로 호출한다. useEffect 안에서
// 리스너를 등록하므로(마운트를 유발한 바로 그 클릭이 이미 완전히
// 끝난 뒤에 등록됨) 패널을 여는 클릭이 곧바로 스스로를 닫아버리는
// 흔한 함정을 피한다. enabled=false면(UniverseSettingsPanel처럼
// 열림/닫힘을 자체 관리하는 패널이 닫혀있는 동안) 아예 리스너를 달지
// 않는다.
import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";

export function useDraggablePanel(options?: { onClickOutside?: () => void; enabled?: boolean }) {
  const { onClickOutside, enabled = true } = options ?? {};
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const dragOrigin = useRef<{ startX: number; startY: number; originX: number; originY: number } | null>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!onClickOutside || !enabled) return;
    function handleClick(e: MouseEvent) {
      const target = e.target as HTMLElement;
      // 3D 뷰(react-three-fiber의 <canvas> 하나) 클릭은 예외 — 행성/오브젝트
      // 선택, TransformControls 드래그 기즈모, 카메라 궤도 회전이 전부 이
      // 캔버스 위에서 일어나는데(WebGL 렌더링이라 실제 DOM 자식 엘리먼트가
      // 없고 클릭 타깃은 항상 canvas 자체다), 이걸 "패널 바깥 클릭"으로
      // 취급하면 오브젝트를 클릭해서 고르거나 기즈모로 드래그하는 순간마다
      // 패널이 곧바로 닫혀버려 사실상 못 쓰게 된다.
      if (target.tagName === "CANVAS") return;
      if (panelRef.current && !panelRef.current.contains(target)) {
        onClickOutside?.();
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [onClickOutside, enabled]);

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
    panelRef,
    dragHandleProps: {
      onPointerDown,
      style: { cursor: "grab", touchAction: "none" as const },
    },
  };
}
