import { DEFAULT_TAB_HOVER_MOTION, type TabHoverMotion } from "./tabHoverMotion";

// HOTFIX(사용자 지시 — "'홈페이지 설정 관리'에서 'pc 설정'과 '모바일
// 설정'이 따로 구분이 되게 해야지"): 사이드바 여닫이 아이콘 설정
// (site_settings.sidebar_icons)을 heroSlideshow.ts/mainLogoSettings.ts와
// 동일한 { pc, mobile } 패턴으로 재구성 — 관리자 화면과 Navbar.tsx가
// 이 파일 하나를 공유한다.
// 사용자 지시(2026-08-29 — "좌, 우, 그리고 각각의 상단 아이콘 마다, hover
// 하면 두번째 이미지가 나올지, 아니면 hover 없이 계속 두번째 이미지가
// 나올지, 두번째 이미지가 모션이라면 몇번 loop 할지 설정할수 있게 해줘"):
// topBarIconsSettings.ts의 HoverMediaMode/hoverLoopCount와 동일한 개념 —
// 좌/우 각각 독립적으로 설정한다(이 파일이 이미 left/right를 전부 분리된
// 필드로 다루는 관례를 그대로 따름).
export type HoverMediaMode = "hover" | "always";

export type SidebarIconsConfig = {
  leftIconDefaultUrl: string;
  leftIconHoverUrl: string;
  rightIconDefaultUrl: string;
  rightIconHoverUrl: string;
  leftIconHoverMode: HoverMediaMode;
  rightIconHoverMode: HoverMediaMode;
  /** hover 이미지가 영상(mp4/webm)일 때만 적용 — 0이면 무한 반복. */
  leftIconHoverLoopCount: number;
  rightIconHoverLoopCount: number;
  iconSizePx: number;
  // EPIC-078: 실제 트리거 버튼에는 더 이상 적용하지 않는다(항상 완전
  // 투명 유지 요구사항과 충돌) — 다만 이 설정 자체를 지우면 그동안 저장된
  // 값이 사라지므로 필드/UI는 남겨두고 시각적 적용만 중단했다.
  backgroundColor: string;
  triggerMode: "click" | "hover";
  topOffsetPx: number;
  // HOTFIX-141(사용자 지시 — "그 안의 요소들을 내가 설정할수가 없네,
  // 상단 사이드바처럼 자유롭게 설정하게 해줘"): 좌/우 전체 높이 패널
  // 자체의 스타일 — TopSidebarConfig(backgroundColor/textColor/
  // fontFamily/hoverMotion)와 동일한 필드를 좌/우 각각 독립적으로 둔다.
  // 패널 "안의 항목"(카테고리 그룹/링크) 자체는 여전히 site_navigations가
  // 담당한다(사이트 구성 관리에서 편집) — 여기서 이원화하면 EPIC-138
  // 트리 구조와 어긋나므로 그대로 둔 결정(HOTFIX-140.2 주석에서 이미
  // 내린 판단을 유지).
  leftPanelBackgroundColor: string;
  leftPanelTextColor: string;
  leftPanelFontFamily: string;
  leftPanelHoverMotion: TabHoverMotion;
  rightPanelBackgroundColor: string;
  rightPanelTextColor: string;
  rightPanelFontFamily: string;
  rightPanelHoverMotion: TabHoverMotion;
};

// HOTFIX-146: pc/mobile과 동등한 독립 태블릿 설정 슬롯 추가 — mainLogoSettings.ts 참고.
export type SidebarIconsValue = { pc: SidebarIconsConfig; tablet: SidebarIconsConfig; mobile: SidebarIconsConfig };

export const DEFAULT_ICON_SIZE_PX = 32;
// EPIC-076: 사이드바 여닫이 버튼 배경색 기본값 — 기존 하드코딩 bg-green-800(#166534)과 맞춤.
export const DEFAULT_ICON_BG_COLOR = "#166534";
export const DEFAULT_TRIGGER_MODE: "click" | "hover" = "click";
export const DEFAULT_TOP_OFFSET_PX = 160;

export function defaultSidebarIconsConfig(): SidebarIconsConfig {
  return {
    leftIconDefaultUrl: "",
    leftIconHoverUrl: "",
    rightIconDefaultUrl: "",
    rightIconHoverUrl: "",
    leftIconHoverMode: "hover",
    rightIconHoverMode: "hover",
    leftIconHoverLoopCount: 0,
    rightIconHoverLoopCount: 0,
    iconSizePx: DEFAULT_ICON_SIZE_PX,
    backgroundColor: DEFAULT_ICON_BG_COLOR,
    triggerMode: DEFAULT_TRIGGER_MODE,
    topOffsetPx: DEFAULT_TOP_OFFSET_PX,
    leftPanelBackgroundColor: "",
    leftPanelTextColor: "",
    leftPanelFontFamily: "",
    leftPanelHoverMotion: DEFAULT_TAB_HOVER_MOTION,
    rightPanelBackgroundColor: "",
    rightPanelTextColor: "",
    rightPanelFontFamily: "",
    rightPanelHoverMotion: DEFAULT_TAB_HOVER_MOTION,
  };
}

export function defaultSidebarIconsValue(): SidebarIconsValue {
  return { pc: defaultSidebarIconsConfig(), tablet: defaultSidebarIconsConfig(), mobile: defaultSidebarIconsConfig() };
}

function normalizeConfig(raw: unknown): SidebarIconsConfig {
  // EPIC-078: 구버전 leftIconUrl/rightIconUrl(단일 URL)을
  // leftIconDefaultUrl/rightIconDefaultUrl로 폴백한다.
  const legacy = raw as (Partial<SidebarIconsConfig> & { leftIconUrl?: string; rightIconUrl?: string }) | null;
  const fallback = defaultSidebarIconsConfig();
  const value = { ...fallback, ...(legacy ?? {}) };
  if (!value.leftIconDefaultUrl && legacy?.leftIconUrl) value.leftIconDefaultUrl = legacy.leftIconUrl;
  if (!value.rightIconDefaultUrl && legacy?.rightIconUrl) value.rightIconDefaultUrl = legacy.rightIconUrl;
  return value;
}

export function normalizeSidebarIcons(raw: unknown): SidebarIconsValue {
  if (!raw || typeof raw !== "object") return defaultSidebarIconsValue();
  const obj = raw as Record<string, unknown>;
  if (obj.pc || obj.tablet || obj.mobile) {
    return { pc: normalizeConfig(obj.pc), tablet: normalizeConfig(obj.tablet ?? obj.pc), mobile: normalizeConfig(obj.mobile) };
  }
  const flat = normalizeConfig(raw);
  return { pc: flat, tablet: { ...flat }, mobile: { ...flat } };
}
