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

export type AccountMenuStyleConfig = {
  fontFamily: string;
  fontSizePx: number | null;
  bold: boolean;
  color: string;
  hoverMotion: TabHoverMotion;
};

export type AccountMenuStyleValue = { pc: AccountMenuStyleConfig; mobile: AccountMenuStyleConfig };

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
  return { pc: defaultAccountMenuStyleConfig(), mobile: defaultAccountMenuStyleConfig() };
}

function normalizeConfig(raw: unknown): AccountMenuStyleConfig {
  return { ...defaultAccountMenuStyleConfig(), ...((raw as Partial<AccountMenuStyleConfig>) ?? {}) };
}

export function normalizeAccountMenuStyle(raw: unknown): AccountMenuStyleValue {
  if (!raw || typeof raw !== "object") return defaultAccountMenuStyleValue();
  const obj = raw as Record<string, unknown>;
  if (obj.pc || obj.mobile) {
    return { pc: normalizeConfig(obj.pc), mobile: normalizeConfig(obj.mobile) };
  }
  const flat = normalizeConfig(raw);
  return { pc: flat, mobile: { ...flat } };
}
