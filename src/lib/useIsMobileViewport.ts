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

// HOTFIX-146(사용자 지시 — "'tab' preview 토글도 추가해줘... '모바일'
// preview 와 설정과 똑같은 설정 가능하게 해줘"): EPIC-136 이전에 있던
// PC/태블릿/모바일 3단 토글을 되살리면서, 태블릿도 pc/mobile과 동등한
// 독립 설정 슬롯으로 승격한다 — "어느 뷰포트 폭에서 어느 저장값을 쓸지"
// 결정하는 이 3단 판정만 새로 추가하고, 위 useIsMobileViewport()(767px
// 이하)는 기존에 이미 쓰이던 "모바일 전용 레이아웃 트릭"(예: 상단
// 사이드바 컬럼 세로 스택) 판정에 그대로 남겨둔다 — 이 둘은 서로 다른
// 질문이라 하나를 태블릿 인식으로 바꾸면 저 트릭들이 태블릿 폭에서
// 불필요하게 발동할 위험이 있다. 태블릿 경계는 이 프로젝트가 이미 곳곳에
// 쓰는 Tailwind md(768px)/lg(1024px) 관례를 그대로 따른다.
export type DeviceTier = "pc" | "tablet" | "mobile";

export function useDeviceTier(): DeviceTier {
  const [tier, setTier] = useState<DeviceTier>("pc");

  useEffect(() => {
    const mobileMql = window.matchMedia("(max-width: 767px)");
    const tabletMql = window.matchMedia("(min-width: 768px) and (max-width: 1023px)");
    function compute() {
      setTier(mobileMql.matches ? "mobile" : tabletMql.matches ? "tablet" : "pc");
    }
    compute();
    mobileMql.addEventListener("change", compute);
    tabletMql.addEventListener("change", compute);
    return () => {
      mobileMql.removeEventListener("change", compute);
      tabletMql.removeEventListener("change", compute);
    };
  }, []);

  return tier;
}
