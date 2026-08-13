"use client";

// EPIC-104: Kinfolk.com처럼 스크롤을 내리면 헤더가 숨고, 올리면 다시
// 나타나는 모션 — 이 레포에 스크롤 방향 감지 전례가 없어 새로 구현한다.
// `threshold`(기본 80px) 아래에서는 항상 보이게 해, 페이지 맨 위에서
// 살짝만 스크롤해도 헤더가 사라지는 산만한 느낌을 막는다.
//
// rAF 스로틀 가드를 일부러 안 쓴다 — 처음엔 `ticking` ref로 스크롤 이벤트를
// requestAnimationFrame 하나로 합쳤었는데, 브라우저 탭이 백그라운드로 가는
// 등의 이유로 그 rAF 콜백이 한 번이라도 못 불리면 `ticking`이 true에 영원히
// 멈춰(다음 스크롤부터 `if (ticking.current) return`에 막혀) 그 세션 내내
// 헤더가 다시는 반응하지 않는 버그로 이어졌다(로컬 브라우저 자동화 환경에서
// 실제로 재현). setState 하나 비교하는 정도는 매 스크롤 이벤트마다 그냥
// 돌려도 성능에 문제되지 않아, 안정성을 위해 스로틀을 제거했다.
import { useEffect, useRef, useState } from "react";

export function useHideOnScroll(threshold = 80) {
  const [hidden, setHidden] = useState(false);
  const lastY = useRef(0);

  useEffect(() => {
    lastY.current = window.scrollY;

    function onScroll() {
      const y = window.scrollY;
      if (y <= threshold) {
        setHidden(false);
      } else if (y > lastY.current) {
        setHidden(true);
      } else if (y < lastY.current) {
        setHidden(false);
      }
      lastY.current = y;
    }

    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [threshold]);

  return hidden;
}
