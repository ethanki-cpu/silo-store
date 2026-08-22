"use client";

// HOTFIX-141.15(사용자 신고 — "pc 버전의 좌우 폭을 줄이니까... 겹쳐지잖아,
// '스튜디오', '관리자', '상단 사이드바 아이콘' 버튼도 좌우 폭과 함께
// 움직이고 있어"): 헤더 요소들의 드래그 오프셋(dxPx)이 지금까지 고정 px
// transform이라 드래그한 순간의 화면 폭에서만 정확했다 — 창 폭이 바뀌면
// (반응형 flex 레이아웃 자체가 다시 계산되므로) 같은 px만큼 밀어도 실제
// 목표 위치와 어긋나 보였다. HeaderSlot.tsx(대부분의 헤더 요소)와
// LeftSidebar.tsx/RightSidebar.tsx(좌우 사이드바 여닫이 아이콘 — 이 둘은
// HeaderSlot을 안 쓰고 자체 드래그 로직을 갖고 있음, HOTFIX-141 주석 참고)
// 둘 다 이 기준 폭 측정/추적 로직을 공유한다.
import { useEffect, useState } from "react";

export function measureReferenceWidth(): number {
  if (typeof document === "undefined") return 0;
  const canvas = document.querySelector("[data-admin-canvas]");
  if (canvas) return canvas.getBoundingClientRect().width || window.innerWidth;
  return window.innerWidth;
}

export function useReferenceWidth(): number {
  const [width, setWidth] = useState(0);
  useEffect(() => {
    function measure() {
      setWidth(measureReferenceWidth());
    }
    measure();
    window.addEventListener("resize", measure);
    const canvas = document.querySelector("[data-admin-canvas]");
    let ro: ResizeObserver | undefined;
    if (canvas && typeof ResizeObserver !== "undefined") {
      ro = new ResizeObserver(measure);
      ro.observe(canvas);
    }
    return () => {
      window.removeEventListener("resize", measure);
      ro?.disconnect();
    };
  }, []);
  return width;
}
