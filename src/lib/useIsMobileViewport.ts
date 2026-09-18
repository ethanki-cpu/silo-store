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
  // HOTFIX-156.14(사용자 재신고 — "타블렛→모바일로 넘어가는 과정에서
  // 오류가 나는 것 같다, 모바일 크롬/데스크톱 크롬 둘 다 똑같다"):
  // `matchMedia("(max-width: 767px)")`는 **정수가 아닌** 실제 뷰포트 폭을
  // 기준으로 판정한다 — `dev.silostore.net`에서 직접 재현: 창을 768→767로
  // 리사이즈했을 때 `window.innerWidth`는 767(정수로 반올림)을 보고하지만
  // `window.visualViewport.width`는 767.2 같은 소수(실제 기기/디스플레이
  // 배율에 따라 흔함, devicePixelRatio가 정수가 아닐 때 특히)였다 —
  // `matchMedia`는 이 767.2를 기준으로 판정해 `(max-width:767px)`이
  // **false**가 나왔다(767.2 > 767). 아래 useDeviceTier와 같은 이유로
  // `window.innerWidth`(정수, zoom 계산에도 이미 쓰는 것과 동일한 값) 기준
  // 산술 비교로 바꿔 이 틈 자체를 없앤다.
  useIsomorphicLayoutEffect(() => {
    function compute() {
      setIsMobile(window.innerWidth < 768);
    }
    compute();
    window.addEventListener("resize", compute);
    return () => window.removeEventListener("resize", compute);
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
  // HOTFIX-156.14(사용자 재신고, `dev.silostore.net`에서 실측 재현 —
  // 진짜 원인 발견): 위 156.13까지 고친 뒤에도 재현돼 실제로 브라우저
  // 창을 768→767px로 한 픽셀씩 리사이즈하며 재현했다 — 767px에서
  // `mobileMql.matches`/`tabletMql.matches`가 **둘 다 false**가 나와
  // "그 어느 쪽도 아님" 취급되며 `tier`가 (초기값이자 마지막 분기인) "pc"로
  // 떨어졌다. 원인: `window.innerWidth`는 767(정수)을 보고하지만
  // `window.visualViewport.width`(matchMedia가 실제로 비교하는 값)는
  // 767.2 같은 **소수**였다(실기기 devicePixelRatio가 정수가 아니거나,
  // Windows 디스플레이 배율이 100%가 아닌 경우 흔함 — 그래서 사용자가
  // 실제 모바일 기기와 데스크톱 크롬(창 크기 조절) 양쪽에서 똑같이
  // 재현했던 것, 특정 기기만의 문제가 아니었다). `max-width:767px`과
  // `min-width:768px`은 "정수 폭"이라는 암묵적 전제 하에서만 서로 빈틈없이
  // 맞물리는데, 소수 폭(767.2)은 그 전제를 깨고 둘 사이 틈에 정확히
  // 낀다 — 그 결과 살롱데상 같은 탭 콘텐츠는 모바일/태블릿용인데 헤더
  // 배율·위치 계산만 PC 기준(1440px)으로 계산되면서 화면 요소들이 짓눌리듯
  // 겹쳐 보였다. `useIsMobileViewport`와 동일하게 `matchMedia` 두 개
  // 대신 `window.innerWidth`(정수, zoom 계산과 동일한 값) 기준 산술
  // 비교로 교체 — `w < 768`/`w < 1024`/그 외로 정확히 3분할해 수학적으로
  // 빈틈이 있을 수 없다.
  useIsomorphicLayoutEffect(() => {
    function compute() {
      const w = window.innerWidth;
      setTier(w < 768 ? "mobile" : w < 1024 ? "tablet" : "pc");
    }
    compute();
    window.addEventListener("resize", compute);
    return () => window.removeEventListener("resize", compute);
  }, []);

  return tier;
}
