"use client";

// HOTFIX(사용자 지시 — "'홈페이지 설정 관리'에서 'pc 설정'과 '모바일
// 설정'이 따로 구분이 되게 해야지"): 메인 로고/사이드바 아이콘/상단 탭
// 디자인을 실제 뷰포트 폭에 따라 PC용/모바일용 값 중 하나로 골라 쓰기
// 위한 훅 — 이 프로젝트가 hero_slideshow에서 이미 쓰고 있는 "md
// 브레이크포인트(768px) 기준 PC/모바일 분리" 관례와 동일한 기준을 쓴다.
import { useEffect, useState } from "react";

export function useIsMobileViewport(): boolean {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const mql = window.matchMedia("(max-width: 767px)");
    setIsMobile(mql.matches);
    function handleChange(e: MediaQueryListEvent) {
      setIsMobile(e.matches);
    }
    mql.addEventListener("change", handleChange);
    return () => mql.removeEventListener("change", handleChange);
  }, []);

  return isMobile;
}
