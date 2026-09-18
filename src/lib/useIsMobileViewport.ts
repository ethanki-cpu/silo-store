"use client";

// HOTFIX(사용자 지시 — "'홈페이지 설정 관리'에서 'pc 설정'과 '모바일
// 설정'이 따로 구분이 되게 해야지"): 메인 로고/사이드바 아이콘/상단 탭
// 디자인을 실제 뷰포트 폭에 따라 PC용/모바일용 값 중 하나로 골라 쓰기
// 위한 훅 — 이 프로젝트가 hero_slideshow에서 이미 쓰고 있는 "md
// 브레이크포인트(768px) 기준 PC/모바일 분리" 관례와 동일한 기준을 쓴다.
import { useState } from "react";
import { useIsomorphicLayoutEffect } from "@/lib/useIsomorphicLayoutEffect";

export function useIsMobileViewport(): boolean {
  const [isMobile, setIsMobile] = useState(false);

  // HOTFIX-156.13: 기존 `useEffect`는 첫 페인트 "이후"에야 실행돼, 실제
  // 모바일 화면에서도 첫 프레임은 항상 `isMobile=false`(SSR 기본값) 취급된다
  // — 아래 useDeviceTier와 같은 이유(useReferenceWidth.ts 주석 참고)로
  // `useLayoutEffect` isomorphic 패턴으로 교체.
  useIsomorphicLayoutEffect(() => {
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

  // HOTFIX-156.13(사용자 재신고 — 모바일 헤더 요소 위치가 여전히 엉망):
  // 이 상태의 초기값 "pc"는 SSR/첫 클라이언트 렌더 내내 그대로 유지되다가
  // `useEffect`(첫 페인트 이후 실행)가 실제 폭을 재서 고쳐준다 — 그런데
  // Navbar.tsx는 `deviceKey`(이 값)로 로고/탭/아이콘의 내용과 위치
  // (mainLogo/topTabStyle/headerPositionsValue 등, 전부 [deviceKey]로
  // 조회)를 통째로 고른다. 즉 실제로는 모바일 폭인데도 첫 페인트~하이드레이션
  // 사이에는 "pc" 값으로 저장된 콘텐츠/좌표가 그대로 그려진다 — PC용으로
  // 배치된 요소들은 애초에 좁은 모바일 화면 안에 들어오도록 만들어진 게
  // 아니므로 화면 밖으로 밀려나거나 서로 겹쳐 보인다. `useLayoutEffect`
  // isomorphic 패턴으로 바꿔 하이드레이션 시작 즉시(첫 페인트 전) 동기적으로
  // 보정되게 한다 — SSR 자체가 만드는 최초 HTML의 틀림은 못 없애지만(서버는
  // 뷰포트를 아예 모른다), 최소한 "브라우저가 그 SSR HTML을 페인트한 뒤에도
  // 한 프레임 더 그대로 남는" 추가 지연은 제거한다. Navbar.tsx의 zoom
  // 자체는 별도로 CSS 변수(`--silo-header-zoom`, layout.tsx의 차단
  // 스크립트가 설정)로 SSR 단계부터 이미 보정되므로, 이 틈에 pc 콘텐츠가
  // 보이더라도 최소한 "모바일 zoom 배율로 축소된" pc 콘텐츠라 화면을
  // 크게 벗어나 찢어지진 않는다.
  useIsomorphicLayoutEffect(() => {
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
