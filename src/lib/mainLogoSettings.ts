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
  // HOTFIX-141.12(사용자 지시 — "모바일 버전에 I'm your, Silo 텍스트의
  // 요소들도 세부 설정이 가능하게 연결해줘, pc 버전처럼"): 좌/우 텍스트가
  // 지금까지 로고 자체의 fontFamily/bold/fontSizePx/textColor를 그대로
  // 물려받기만 했다 — 로고 그래픽과 별개로 각 텍스트를 독립적으로
  // 커스터마이징할 수 있게 전용 필드를 추가한다. 비어있으면(기본값) 기존
  // 그대로 로고 스타일을 상속(하위 호환) — Navbar.tsx가 이 값이 있을 때만
  // 덮어쓴다.
  leftTextFontFamily: string;
  leftTextCustomFonts: CustomFontEntry[];
  /** null = 로고 자체의 bold를 그대로 상속(기본값, 기존 데이터 호환). */
  leftTextBold: boolean | null;
  leftTextFontSizePx: number | null;
  leftTextColor: string;
  rightTextFontFamily: string;
  rightTextCustomFonts: CustomFontEntry[];
  /** null = 로고 자체의 bold를 그대로 상속(기본값, 기존 데이터 호환). */
  rightTextBold: boolean | null;
  rightTextFontSizePx: number | null;
  rightTextColor: string;
  // HOTFIX-141.17(사용자 지시 — "로고 좌 텍스트 + 메인 로고 + 우 텍스트를
  // 하나로 그룹화 하는 기능을 줘 고정되게"): 셋을 각각 독립적으로
  // 드래그하다 보니(HOTFIX-141.10) 서로 간격이 어긋나는 문제가 반복됐다
  // (HOTFIX-141.13~141.15로 잠금/폭 비례 스케일링까지 더했지만 근본적으로
  // "따로 움직이는 3개"라는 구조 자체가 계속 어긋날 여지를 남긴다) —
  // true면 셋을 하나의 flex 그룹(간격 groupGapPx)으로 묶어 위치(드래그/
  // 잠금)를 단 하나로만 관리한다. false(기본값)면 기존처럼 셋이 완전히
  // 독립된 HeaderSlot으로 남아 하위 호환.
  groupSideTexts: boolean;
  /** 그룹 안 간격(px) — groupSideTexts가 true일 때만 쓰임. null이면 기본값 16px. */
  groupGapPx: number | null;
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
    leftTextFontFamily: "",
    leftTextCustomFonts: [],
    leftTextBold: null,
    leftTextFontSizePx: null,
    leftTextColor: "",
    rightTextFontFamily: "",
    rightTextCustomFonts: [],
    rightTextBold: null,
    rightTextFontSizePx: null,
    rightTextColor: "",
    groupSideTexts: false,
    groupGapPx: null,
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
