// HOTFIX(사용자 지시 — "'홈페이지 설정관리'에 맨 위의 '관리자, (회원
// 등급), 마이페이지, (사용자이름), 로그아웃' 이런 메뉴의 디자인을
// 설정하는 또다른 탭을 만들어줘, 그리고 그 디자인의 모션에 대해서도
// 옵션을 줘"): Navbar 우측 상단 "계정 영역"(관리자 링크/멤버십 등급
// 버튼/마이페이지 링크/회원 이름 버튼/로그아웃 버튼 — 5개 항목이 하나의
// 그룹으로 함께 움직인다) 디자인 설정. 상단 탭 디자인(topTabStyleSettings.ts)
// 과 같은 서체/크기/굵기/색상/hover 모션 필드를 공유하되, 탭별
// 개별 오버라이드가 아니라 계정 영역 전체에 적용되는 단일 설정이라
// 커스텀 폰트 파일 업로드(@font-face 주입)까지는 범위에 넣지 않았다 —
// fontFamily는 직접 입력(폴백용) 텍스트로만 받는다. 다른 설정들과
// 동일하게 { pc, mobile } 독립 설정을 지원한다.
import { DEFAULT_TAB_HOVER_MOTION, type TabHoverMotion } from "./tabHoverMotion";
import type { HeaderMenuItemKey } from "./headerLayoutSettings";

export type AccountMenuStyleConfig = {
  fontFamily: string;
  fontSizePx: number | null;
  bold: boolean;
  color: string;
  hoverMotion: TabHoverMotion;
};

// HOTFIX-141(사용자 지시 — "글쓰기, 관리자, lautrec, Ethan Ki, 마이 페이지
// 같은 '사용자 메뉴' 요소들을 복제/삭제 하는 기능이 없어"): 이 5개
// 고정 항목(+글쓰기 버튼)은 로그인 세션에 묶인 조건부 렌더링이라
// site_navigations처럼 순수 데이터 배열로 취급할 수 없다 — 대신 "이
// 종류(kind)를 숨긴다"(hiddenKinds) + "이 종류를 하나 더 그린다"
// (extraItems)라는 additive-only 모델을 쓴다. 원본 5개 항목의 렌더
// 로직(Navbar.tsx의 renderMenuItem)은 그대로 두고, 그 결과물을 몇 번
// 더 찍어내거나 아예 안 찍는 것만 여기서 결정한다 — EPIC-134 통합 헤더
// 레이아웃(headerLayoutValue/unifiedHeaderItems, refId가 HeaderMenuItemKey
// 하나뿐이라 사본을 못 담음)은 EPIC-135 이후 사실상 쓰이지 않아 건드리지
// 않았다(그 모드가 활성화된 저장값이 있으면 이 hiddenKinds/extraItems는
// 적용되지 않는다 — unifiedHeaderItems가 렌더링을 대신 가져가므로).
export type ExtraAccountItem = { id: string; kind: HeaderMenuItemKey };

// HOTFIX-146: pc/mobile과 동등한 독립 태블릿 설정 슬롯 추가 — mainLogoSettings.ts 참고.
export type AccountMenuStyleValue = {
  pc: AccountMenuStyleConfig;
  tablet: AccountMenuStyleConfig;
  mobile: AccountMenuStyleConfig;
  hiddenKinds: HeaderMenuItemKey[];
  extraItems: ExtraAccountItem[];
  writeButtonHidden: boolean;
  extraWriteButtonIds: string[];
  // EPIC-161 Phase 4(사용자 지시 — "'글쓰기' 버튼을 아이콘으로 대체할 수
  // 있게 하고, hover 할 때의 아이콘도 올릴 수 있게"): 둘 다 비어있으면
  // 기존처럼 "글쓰기" 텍스트 버튼 그대로, 기본 이미지가 있으면 아이콘으로
  // 대체한다(사본 버튼들도 같은 아이콘을 공유 — 사이드바 아이콘과 달리
  // 좌우 구분이 없어 값 하나로 충분).
  writeButtonIconUrl: string | null;
  writeButtonIconHoverUrl: string | null;
};

export function defaultAccountMenuStyleConfig(): AccountMenuStyleConfig {
  return {
    fontFamily: "",
    fontSizePx: null,
    bold: false,
    color: "",
    hoverMotion: DEFAULT_TAB_HOVER_MOTION,
  };
}

export function defaultAccountMenuStyleValue(): AccountMenuStyleValue {
  return {
    pc: defaultAccountMenuStyleConfig(),
    tablet: defaultAccountMenuStyleConfig(),
    mobile: defaultAccountMenuStyleConfig(),
    hiddenKinds: [],
    extraItems: [],
    writeButtonHidden: false,
    extraWriteButtonIds: [],
    writeButtonIconUrl: null,
    writeButtonIconHoverUrl: null,
  };
}

function normalizeConfig(raw: unknown): AccountMenuStyleConfig {
  return { ...defaultAccountMenuStyleConfig(), ...((raw as Partial<AccountMenuStyleConfig>) ?? {}) };
}

export function normalizeAccountMenuStyle(raw: unknown): AccountMenuStyleValue {
  const fallback = defaultAccountMenuStyleValue();
  if (!raw || typeof raw !== "object") return fallback;
  const obj = raw as Partial<AccountMenuStyleValue> & Record<string, unknown>;
  const extra = {
    hiddenKinds: Array.isArray(obj.hiddenKinds) ? (obj.hiddenKinds as HeaderMenuItemKey[]) : fallback.hiddenKinds,
    extraItems: Array.isArray(obj.extraItems) ? (obj.extraItems as ExtraAccountItem[]) : fallback.extraItems,
    writeButtonHidden: typeof obj.writeButtonHidden === "boolean" ? obj.writeButtonHidden : fallback.writeButtonHidden,
    extraWriteButtonIds: Array.isArray(obj.extraWriteButtonIds) ? (obj.extraWriteButtonIds as string[]) : fallback.extraWriteButtonIds,
    writeButtonIconUrl: typeof obj.writeButtonIconUrl === "string" ? obj.writeButtonIconUrl : fallback.writeButtonIconUrl,
    writeButtonIconHoverUrl:
      typeof obj.writeButtonIconHoverUrl === "string" ? obj.writeButtonIconHoverUrl : fallback.writeButtonIconHoverUrl,
  };
  if (obj.pc || obj.tablet || obj.mobile) {
    return {
      pc: normalizeConfig(obj.pc),
      tablet: normalizeConfig(obj.tablet ?? obj.pc),
      mobile: normalizeConfig(obj.mobile),
      ...extra,
    };
  }
  const flat = normalizeConfig(raw);
  return { pc: flat, tablet: { ...flat }, mobile: { ...flat }, ...extra };
}
