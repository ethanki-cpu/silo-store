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
import { useEffect, useLayoutEffect, useState } from "react";

// HOTFIX-156.12: 이 훅이 반환하는 폭이 0(초기값)인 동안 Navbar.tsx의
// headerZoomScale은 항상 1(축소 없음)로 취급된다 — 원래 `useEffect`는
// 브라우저가 첫 프레임을 "그린 뒤" 실행되므로, 그 첫 프레임 한 번은
// 실제 폭과 무관하게 zoom:1(축소 전 큰 헤더)이 그대로 페인트된다.
// 데스크톱에서는 이 프레임이 너무 짧아 안 보이지만, 느린 실기기(특히
// 사용자가 반복 신고한 실제 모바일 Chrome)에서는 이 첫 프레임이 몇
// 프레임 더 오래 남아 "헤더가 화면보다 훨씬 넓게 잠깐 보였다가 제자리로
// 돌아오는" 것처럼 보일 수 있다 — 스크린샷 타이밍에 따라 이 상태가
// 찍히면 "고쳐지지 않았다"로 보인다. `useLayoutEffect`는 브라우저가
// 페인트하기 "전에" 동기적으로 실행되므로 이 첫 프레임 자체가 아예
// 생기지 않는다(SSR에는 window가 없어 실행 자체가 안 되므로, 서버에서는
// 안전하게 `useEffect`로 폴백 — 흔히 쓰는 isomorphic layout effect
// 패턴, 콘솔 경고 없이 클라이언트에서만 동기 실행).
const useIsomorphicLayoutEffect = typeof window !== "undefined" ? useLayoutEffect : useEffect;

export function measureReferenceWidth(): number {
  if (typeof document === "undefined") return 0;
  const canvas = document.querySelector("[data-admin-canvas]");
  if (canvas) return canvas.getBoundingClientRect().width || window.innerWidth;
  return window.innerWidth;
}

export function useReferenceWidth(): number {
  const [width, setWidth] = useState(0);
  useIsomorphicLayoutEffect(() => {
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
