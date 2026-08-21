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
  // HOTFIX-137.5(사용자 지시 — "한번에 여러 카테고리를 보이는 '메가
  // 드롭다운'도 가능한 옵션으로 넣어줘"): 드롭다운/사이드바 모양(하위
  // 항목이 있는 탭)에서, 기존처럼 항목에 마우스를 올려야 2차 플라이아웃이
  // 열리는 중첩 리스트 대신 모든 그룹/항목을 한 번에 나란히 펼쳐 보여주는
  // 그리드형 메가 메뉴로 렌더링할지 — 이 값은 순수 표시 방식(스타일)이라
  // site_navigations가 아니라 여기(탭별 스타일 설정)에 둔다. 없거나
  // false면 기존 중첩 리스트 그대로.
  megaDropdown?: boolean;
  // HOTFIX-141.7(사용자 지시 — "모바일 버전에는 넓이가 좁기 때문에, 상단
  // 탭의 드롭다운 메뉴와 하위 카테고리들이 안보여... 드롭다운과 하위
  // 카테고리의 폭을 조절하고, 폰트업로드/크기/색상을 설정할수 있게
  // 해줘"): 드롭다운(1차)과 하위 카테고리 플라이아웃(2차) 둘 다 지금까지
  // w-64/w-56으로 고정폭이었다 — 모바일 프레임(390px)에서 2차 플라이아웃이
  // 1차 드롭다운 오른쪽에 이어 붙는 구조(absolute left-full)라 폭 합이
  // 쉽게 화면을 넘어가 잘려 안 보였다. 폭/서체/크기/색을 탭별로 직접
  // 설정할 수 있게 한다 — 없으면 기존 w-64/w-56 그대로.
  dropdownWidthPx?: number | null;
  dropdownFontFamily?: string;
  dropdownCustomFonts?: CustomFontEntry[];
  dropdownFontSizePx?: number | null;
  dropdownColor?: string;
  // HOTFIX-141.12(사용자 지시 — "최상위 카테고리와 하위 카테고리의 텍스트를
  // 각각 수정하게 해달라, 줄바꿈이라던지 그래서 폭이 맞춰지게"): 드롭다운
  // 안 그룹 헤더/항목 하나하나의 표시 텍스트를 원본(site_navigations.title)과
  // 별개로 오버라이드 — labelOverride(탭 자신)와 동일한 성격이지만 하위
  // 레벨용. 줄바꿈(\n)을 넣을 수 있게 textarea로 입력받고 pre-line으로
  // 렌더링해 좁은 폭에도 버튼이 텍스트에 맞춰 잘리지 않게 한다. 키는 그룹은
  // groupLabel(원본), 항목은 href(고유값) — 원본 제목/링크가 그대로
  // 식별자이므로 별도 id 발급 없이 재사용한다.
  subLabelOverrides?: Record<string, string>;
  // HOTFIX-141.10(사용자 신고 — "모바일 preview 에, 'about silo' '사일로
  // 상점', '살롱데상' '온라인 도슨트' 드롭다운이 잘 안보이는 문제"):
  // 폭을 줄여도(dropdownWidthPx) 화면 오른쪽 끝에 가까운 탭은 여전히
  // `left-0`(트리거 왼쪽 끝에 맞춰 오른쪽으로 펼침) 기준이라 넘칠 수
  // 있다 — 실측해보니 맨 오른쪽 탭("온라인 도슨트")의 드롭다운이 모바일
  // 390px 프레임에서 102px이나 오른쪽으로 넘쳤다. "right"를 고르면
  // 트리거 오른쪽 끝에 맞춰 왼쪽으로 펼쳐(`right-0`) 화면 오른쪽 가장자리
  // 탭에 쓸 수 있다. 없으면 기존 왼쪽 정렬 그대로.
  dropdownAlign?: "left" | "right";
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
    dropdownWidthPx: null,
    dropdownFontFamily: "",
    dropdownCustomFonts: [],
    dropdownFontSizePx: null,
    dropdownColor: "",
    subLabelOverrides: {},
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
