// HOTFIX(사용자 지시 — "'홈페이지 설정 관리'에서 'pc 설정'과 '모바일
// 설정'이 따로 구분이 되게 해야지"): 상단 탭 디자인 설정(site_settings.
// top_tab_style)을 heroSlideshow.ts/mainLogoSettings.ts와 동일한
// { pc, mobile } 패턴으로 재구성 — 관리자 화면과 Navbar.tsx가 이 파일
// 하나를 공유한다.
import { DEFAULT_TAB_HOVER_MOTION, type TabHoverMotion } from "./tabHoverMotion";
import type { CustomFontEntry } from "./mainLogoSettings";

// EPIC-079-PHASE-4: 상단 탭(site_navigations의 depth 0 행) 하나하나의
// 표시 텍스트/서체/크기/색상을 개별적으로 커스터마이징한다 — 트리 구조
// 자체(제목/href 등)는 "사이트 구성 관리"(/admin/site-structure)가
// 담당하고, 여기서는 순수 디자인(어떻게 보일지)만 별도로 다룬다. tabId는
// site_navigations 행의 key(있으면)|id — Navbar.tsx의 NavTab.key와 동일한
// 값이라 프론트엔드에서 그대로 매칭할 수 있다.
export type TopTabStyleEntry = {
  /** 비어있으면 site_navigations.title을 그대로 쓴다. */
  labelOverride: string;
  fontFamily: string;
  fontSizePx: number | null;
  bold: boolean;
  color: string;
  customFonts: CustomFontEntry[];
  // EPIC-117(사용자 지시): 이 탭을 "1단"(로고 줄과 겹치는 자리)에 배치할지
  // "2단"(기존 탭 줄)에 배치할지 — 없거나 2면 기존과 완전히 동일하게 동작.
  tier?: 1 | 2;
  // HOTFIX(사용자 지시 — "각 탭 위에 커서가 hover 되었을 때의 모션들을
  // 6가지로 설정할 수 있게 해"): 없으면 DEFAULT_TAB_HOVER_MOTION 적용.
  hoverMotion?: TabHoverMotion;
  // HOTFIX-134(사용자 지시 — "상단 탭의 1단과 2단을 내가 드래그앤
  // 드랍으로 각 버튼 위치를 정하는거, 그걸 원해"): 같은 단(tier) 안에서
  // 좌우 순서를 직접 드래그로 정할 수 있게 하는 정렬 키 — null이면(아직
  // 한 번도 드래그로 옮긴 적 없음) site_navigations의 원래 순서를 그대로
  // 쓴다. 값이 있으면 그 숫자로 정렬하고, 삽입은 앞뒤 탭 order의 중간값을
  // 매겨 넣어(fractional index) 매번 전체를 다시 번호 매길 필요가 없다.
  order?: number | null;
};

export type TopTabStyleConfig = {
  tabs: Record<string, TopTabStyleEntry>;
  // EPIC-110: 상단 탭 줄(nav) 전체의 높이(px) — null이면 기존처럼 탭
  // 버튼의 padding에 맞춰 자동으로 정해진다.
  rowHeightPx: number | null;
  // EPIC-117: 1단 탭 줄이 로고 줄 경계선을 기준으로 위로 추가 이동하는
  // 픽셀 값(기본 0) — Navbar.tsx 참고.
  tier1OffsetPx: number;
  // EPIC-118(사용자 지시): 2단(기존 탭 줄)도 위/아래로 미세 이동 — 양수면 위로.
  tier2OffsetPx: number;
};

export type TopTabStyleValue = { pc: TopTabStyleConfig; mobile: TopTabStyleConfig };

export function defaultTopTabStyleEntry(): TopTabStyleEntry {
  return {
    labelOverride: "",
    fontFamily: "",
    fontSizePx: null,
    bold: false,
    color: "",
    customFonts: [],
    tier: 2,
    hoverMotion: DEFAULT_TAB_HOVER_MOTION,
    order: null,
  };
}

export function defaultTopTabStyleConfig(): TopTabStyleConfig {
  return { tabs: {}, rowHeightPx: null, tier1OffsetPx: 0, tier2OffsetPx: 0 };
}

export function defaultTopTabStyleValue(): TopTabStyleValue {
  return { pc: defaultTopTabStyleConfig(), mobile: defaultTopTabStyleConfig() };
}

function normalizeConfig(raw: unknown): TopTabStyleConfig {
  const value = raw as Partial<TopTabStyleConfig> | null;
  return {
    tabs: value?.tabs ?? {},
    rowHeightPx: value?.rowHeightPx ?? null,
    tier1OffsetPx: value?.tier1OffsetPx ?? 0,
    tier2OffsetPx: value?.tier2OffsetPx ?? 0,
  };
}

export function normalizeTopTabStyle(raw: unknown): TopTabStyleValue {
  if (!raw || typeof raw !== "object") return defaultTopTabStyleValue();
  const obj = raw as Record<string, unknown>;
  if (obj.pc || obj.mobile) {
    return { pc: normalizeConfig(obj.pc), mobile: normalizeConfig(obj.mobile) };
  }
  // 옛 flat 모양(tabs가 최상위에 있음)이면 pc/mobile 양쪽에 동일하게 채운다.
  if (obj.tabs) {
    const flat = normalizeConfig(raw);
    return { pc: flat, mobile: { ...flat, tabs: { ...flat.tabs } } };
  }
  return defaultTopTabStyleValue();
}
