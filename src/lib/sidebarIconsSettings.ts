// HOTFIX(사용자 지시 — "'홈페이지 설정 관리'에서 'pc 설정'과 '모바일
// 설정'이 따로 구분이 되게 해야지"): 사이드바 여닫이 아이콘 설정
// (site_settings.sidebar_icons)을 heroSlideshow.ts/mainLogoSettings.ts와
// 동일한 { pc, mobile } 패턴으로 재구성 — 관리자 화면과 Navbar.tsx가
// 이 파일 하나를 공유한다.
export type SidebarIconsConfig = {
  leftIconDefaultUrl: string;
  leftIconHoverUrl: string;
  rightIconDefaultUrl: string;
  rightIconHoverUrl: string;
  iconSizePx: number;
  // EPIC-078: 실제 트리거 버튼에는 더 이상 적용하지 않는다(항상 완전
  // 투명 유지 요구사항과 충돌) — 다만 이 설정 자체를 지우면 그동안 저장된
  // 값이 사라지므로 필드/UI는 남겨두고 시각적 적용만 중단했다.
  backgroundColor: string;
  triggerMode: "click" | "hover";
  topOffsetPx: number;
};

export type SidebarIconsValue = { pc: SidebarIconsConfig; mobile: SidebarIconsConfig };

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
    iconSizePx: DEFAULT_ICON_SIZE_PX,
    backgroundColor: DEFAULT_ICON_BG_COLOR,
    triggerMode: DEFAULT_TRIGGER_MODE,
    topOffsetPx: DEFAULT_TOP_OFFSET_PX,
  };
}

export function defaultSidebarIconsValue(): SidebarIconsValue {
  return { pc: defaultSidebarIconsConfig(), mobile: defaultSidebarIconsConfig() };
}

function normalizeConfig(raw: unknown): SidebarIconsConfig {
  // EPIC-078: 구버전 leftIconUrl/rightIconUrl(단일 URL)을
  // leftIconDefaultUrl/rightIconDefaultUrl로 폴백한다.
  const legacy = raw as (Partial<SidebarIconsConfig> & { leftIconUrl?: string; rightIconUrl?: string }) | null;
  const value = { ...defaultSidebarIconsConfig(), ...(legacy ?? {}) };
  if (!value.leftIconDefaultUrl && legacy?.leftIconUrl) value.leftIconDefaultUrl = legacy.leftIconUrl;
  if (!value.rightIconDefaultUrl && legacy?.rightIconUrl) value.rightIconDefaultUrl = legacy.rightIconUrl;
  return value;
}

export function normalizeSidebarIcons(raw: unknown): SidebarIconsValue {
  if (!raw || typeof raw !== "object") return defaultSidebarIconsValue();
  const obj = raw as Record<string, unknown>;
  if (obj.pc || obj.mobile) {
    return { pc: normalizeConfig(obj.pc), mobile: normalizeConfig(obj.mobile) };
  }
  const flat = normalizeConfig(raw);
  return { pc: flat, mobile: { ...flat } };
}
