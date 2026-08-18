// HOTFIX(사용자 지시 — "'홈페이지 설정 관리'에서 'pc 설정'과 '모바일
// 설정'이 따로 구분이 되게 해야지"): 메인 로고 설정(site_settings.
// main_logo)을 heroSlideshow.ts와 동일한 { pc, mobile } 패턴으로
// 재구성 — 관리자 화면(src/app/admin/navigation/settings)과 공개
// 렌더러(src/components/Navbar.tsx) 둘 다 이 파일 하나를 공유해 타입이
// 어긋나지 않게 한다(기존엔 두 파일에 각자 중복 선언돼 있었음 — pc/
// mobile 정규화 로직까지 중복되면 어긋날 위험이 커서 이번에 공용 파일로
// 옮겼다).
export type LogoAlign = "left" | "center" | "right";
export type TextPosition = "left" | "right";

export type CustomFontEntry = {
  id: string;
  url: string;
  isActive: boolean;
};

export type MainLogoConfig = {
  type: "text" | "image";
  text: string;
  imageUrl: string;
  heightPx: number;
  align: LogoAlign;
  /** @deprecated EPIC-039: leftText/rightText로 대체. 구버전 데이터 호환용으로만 읽는다. */
  extraText: string;
  fontFamily: string;
  bold: boolean;
  fontSizePx: number;
  /** @deprecated EPIC-039: leftText/rightText로 대체. 구버전 데이터 호환용으로만 읽는다. */
  textPosition: TextPosition;
  textColor: string;
  leftText: string;
  rightText: string;
  /** @deprecated EPIC-043: customFonts(배열)로 대체. 구버전 데이터 호환용으로만 읽는다. */
  fontFileUrl: string;
  customFonts: CustomFontEntry[];
  rowHeightPx: number | null;
};

export type MainLogoValue = { pc: MainLogoConfig; mobile: MainLogoConfig };

export const DEFAULT_LOGO_HEIGHT_PX = 64;
export const DEFAULT_LOGO_FONT_SIZE_PX = 16;
// EPIC-036: 사이드바(green-800, #166534)와 맞춘 기본 추가 텍스트 색상.
export const DEFAULT_LOGO_TEXT_COLOR = "#166534";

export function defaultMainLogoConfig(): MainLogoConfig {
  return {
    type: "text",
    text: "",
    imageUrl: "",
    heightPx: DEFAULT_LOGO_HEIGHT_PX,
    align: "left",
    extraText: "",
    fontFamily: "",
    bold: false,
    fontSizePx: DEFAULT_LOGO_FONT_SIZE_PX,
    textPosition: "right",
    textColor: DEFAULT_LOGO_TEXT_COLOR,
    leftText: "",
    rightText: "",
    fontFileUrl: "",
    customFonts: [],
    rowHeightPx: null,
  };
}

// 매번 새 객체를 만든다 — pc/mobile 기본값이 배열(customFonts)을 같은
// 참조로 공유하면 한쪽을 수정할 때 다른 쪽도 같이 바뀌는 버그가 생긴다.
export function defaultMainLogoValue(): MainLogoValue {
  return { pc: defaultMainLogoConfig(), mobile: defaultMainLogoConfig() };
}

function normalizeConfig(raw: unknown): MainLogoConfig {
  const value = { ...defaultMainLogoConfig(), ...((raw as Partial<MainLogoConfig>) ?? {}) };
  // EPIC-039: 구버전 단일 extraText+textPosition을 leftText/rightText로 1회 이전.
  if (!value.leftText && !value.rightText && value.extraText) {
    if (value.textPosition === "left") value.leftText = value.extraText;
    else value.rightText = value.extraText;
  }
  // EPIC-043: 구버전 단일 fontFileUrl을 customFonts 배열로 1회 이전.
  if (value.customFonts.length === 0 && value.fontFileUrl) {
    value.customFonts = [{ id: "legacy", url: value.fontFileUrl, isActive: true }];
  }
  return value;
}

// raw가 이미 { pc, mobile } 새 모양이면 그대로 쓰고, 옛 flat 모양이거나
// 비어있으면 그 값을 pc/mobile 양쪽에 동일하게 채워 넣는다 — 관리자가
// 한쪽을 편집해 저장하기 전까지는 기존 라이브 데이터가 PC/모바일 양쪽
// 에서 지금과 똑같이 보인다.
export function normalizeMainLogo(raw: unknown): MainLogoValue {
  if (!raw || typeof raw !== "object") return defaultMainLogoValue();
  const obj = raw as Record<string, unknown>;
  if (obj.pc || obj.mobile) {
    return { pc: normalizeConfig(obj.pc), mobile: normalizeConfig(obj.mobile) };
  }
  const flat = normalizeConfig(raw);
  return { pc: flat, mobile: { ...flat, customFonts: flat.customFonts.map((f) => ({ ...f })) } };
}
