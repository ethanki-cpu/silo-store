import type { SlideItem } from "./heroSlideshow";
import { normalizeTopSidebar, defaultTopSidebarValue, type TopSidebarValue } from "./topSidebarSettings";

// 사용자 지시(2026-08-29 — "'홈페이지 설정'에 상단에 아이콘을 추가하고
// 페이지와 링크하는 기능을 만들어줘. 그리고 그 아이콘은 드래그앤드랍으로
// 위치를 설정할수 있어야해"): 관리자가 자유롭게 추가하는 헤더 상단 아이콘
// 목록 — 이미지+링크 페어를 가진 새 요소. accountMenuStyleSettings.ts의
// extraItems와 동일하게 목록 자체는 기기별로 나누지 않는다(같은 아이콘/
// 링크가 PC든 모바일이든 동일해야 자연스럽다) — 위치만 기존
// header_positions(HeaderSlot, slotKey=`top-bar-icon:${id}`)가 기기별로
// 독립적으로 담당한다(다른 헤더 요소와 완전히 동일한 드래그 메커니즘 재사용,
// 새 드래그 시스템을 따로 만들지 않음).
//
// 후속 사용자 지시(2026-08-29 — "각각의 상단 아이콘마다 새로운 상단
// 사이드바가 나오도록 해줘. 위아래 폭과 슬라이드쇼도 가능하게" + "hover
// 하면 두번째 이미지가 나올지, 계속 나올지, 몇번 loop 할지"):
// - hoverMode/hoverLoopCount: SidebarTriggerMedia(default+hover 이미지
//   크로스페이드)의 동작 방식 — "hover"(기존과 동일, 마우스 올려야 전환)
//   또는 "always"(hover 없이 항상 두번째 이미지). hoverLoopCount는 두번째
//   이미지가 영상(모션)일 때만 의미 있음(0=무한 반복, 기존과 동일).
// - sidebar: 이 아이콘을 클릭하면 href로 이동하는 대신(sidebar.enabled일
//   때) 화면 위에서 아래로 슬라이드하는 패널을 연다 — 기존 top_sidebar
//   (Kinfolk형 메가 메뉴, 컬럼/링크 목록)와는 다른, 훨씬 단순한 형태다:
//   높이(px)와 이미지 슬라이드쇼(HeroSlideshow 재사용, heroSlideshow.ts의
//   SlideItem과 동일 모양)만 갖는다 — 아이콘마다 독립된 패널이라 여러 개를
//   만들 수 있다(전역 top_sidebar는 하나뿐이었던 것과 다른 점).
//
// 사용자 지시(2026-08-30 — "새로 만들어진 아이콘과 연결된 독립된 각각의
// 상단 사이드바를 설정할수 있게 해줘" → 후속 확인: "슬라이드쇼가 아니라
// 더 복잡한 메뉴(기존 Kinfolk형 메가 메뉴)를 원함"): panelType으로 두
// 모드 중 선택 — "slideshow"(기존, 위 설명)와 "megaMenu"(전역 상단
// 사이드바 TopSidebarPanel.tsx와 완전히 동일한 컬럼/링크형 메가 메뉴를
// 아이콘마다 독립적으로). TopSidebarPanel이 이미 config prop 하나로
// 동작하는 범용 컴포넌트라 새로 만들지 않고 그대로 재사용 — megaMenu
// 필드에 site_settings.top_sidebar와 동일한 모양(TopSidebarValue,
// pc/tablet/mobile 3단)을 통째로 넣어 관리자 화면의 기존
// TopSidebarControls 에디터도 그대로 재사용한다(새 에디터 UI를 따로
// 만들지 않음 — value/setValue만 이 아이콘의 megaMenu로 바꿔 넘긴다).
export type HoverMediaMode = "hover" | "always";
export type TopBarIconPanelType = "slideshow" | "megaMenu";

export type TopBarIconSidebar = {
  enabled: boolean;
  panelType: TopBarIconPanelType;
  heightPx: number;
  slides: SlideItem[];
  autoAdvanceSeconds: number;
  megaMenu: TopSidebarValue;
};

export type TopBarIcon = {
  id: string;
  imageUrl: string;
  /** 마우스를 올렸을 때 나타날 이미지 — 비어 있으면 기본 이미지 고정(다른 이미지+hover 필드들과 동일 패턴). */
  hoverImageUrl: string;
  /** 클릭 시 이동할 페이지 경로 — 예: "/shop", "/boards/xxx". sidebar.enabled면 무시되고 대신 패널이 열린다. */
  href: string;
  sizePx: number;
  /** 사용자 지시(2026-08-30 — "hover 했을때 이미지 크기를 조절하는 설정
   *  만들어줘"): hover 이미지(hoverImageUrl)만 따로 크기를 조절 — 비워지지
   *  않는 한 sizePx와 같은 값으로 시작해 기존 아이콘은 화면이 그대로다. */
  hoverSizePx: number;
  /** 대체 텍스트(접근성) — 비워도 됨. */
  alt: string;
  hoverMode: HoverMediaMode;
  /** hoverImageUrl이 영상(mp4/webm)일 때만 적용 — 0이면 무한 반복. */
  hoverLoopCount: number;
  sidebar: TopBarIconSidebar;
};

export type TopBarIconsValue = {
  icons: TopBarIcon[];
};

export const DEFAULT_TOP_BAR_ICON_SIZE_PX = 28;
export const DEFAULT_TOP_BAR_ICON_SIDEBAR_HEIGHT_PX = 480;

export function defaultTopBarIconSidebar(): TopBarIconSidebar {
  return {
    enabled: false,
    panelType: "slideshow",
    heightPx: DEFAULT_TOP_BAR_ICON_SIDEBAR_HEIGHT_PX,
    slides: [],
    autoAdvanceSeconds: 5,
    megaMenu: defaultTopSidebarValue(),
  };
}

export function defaultTopBarIconsValue(): TopBarIconsValue {
  return { icons: [] };
}

export function newTopBarIcon(): TopBarIcon {
  return {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    imageUrl: "",
    hoverImageUrl: "",
    href: "",
    sizePx: DEFAULT_TOP_BAR_ICON_SIZE_PX,
    hoverSizePx: DEFAULT_TOP_BAR_ICON_SIZE_PX,
    alt: "",
    hoverMode: "hover",
    hoverLoopCount: 0,
    sidebar: defaultTopBarIconSidebar(),
  };
}

function normalizeSidebar(raw: unknown): TopBarIconSidebar {
  const v = (raw as Partial<TopBarIconSidebar>) ?? {};
  const fallback = defaultTopBarIconSidebar();
  return {
    enabled: v.enabled ?? fallback.enabled,
    panelType: v.panelType === "megaMenu" ? "megaMenu" : "slideshow",
    heightPx: v.heightPx || fallback.heightPx,
    slides: Array.isArray(v.slides) ? (v.slides as SlideItem[]) : fallback.slides,
    autoAdvanceSeconds: v.autoAdvanceSeconds || fallback.autoAdvanceSeconds,
    megaMenu: normalizeTopSidebar(v.megaMenu),
  };
}

function normalizeIcon(raw: unknown): TopBarIcon {
  const v = (raw as Partial<TopBarIcon>) ?? {};
  return {
    id: v.id ?? `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    imageUrl: v.imageUrl ?? "",
    hoverImageUrl: v.hoverImageUrl ?? "",
    href: v.href ?? "",
    sizePx: v.sizePx || DEFAULT_TOP_BAR_ICON_SIZE_PX,
    hoverSizePx: v.hoverSizePx || v.sizePx || DEFAULT_TOP_BAR_ICON_SIZE_PX,
    alt: v.alt ?? "",
    hoverMode: v.hoverMode === "always" ? "always" : "hover",
    hoverLoopCount: typeof v.hoverLoopCount === "number" ? v.hoverLoopCount : 0,
    sidebar: normalizeSidebar(v.sidebar),
  };
}

export function normalizeTopBarIcons(raw: unknown): TopBarIconsValue {
  const v = raw as Partial<TopBarIconsValue> | null;
  return { icons: Array.isArray(v?.icons) ? v!.icons.map(normalizeIcon) : [] };
}
