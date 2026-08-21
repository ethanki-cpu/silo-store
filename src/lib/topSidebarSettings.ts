// HOTFIX-137.9(사용자 지시 — "상단 사이드바 를 설정하고 싶어... kinfolk
// 에서는 맨위 오른쪽에 아이콘을 누르면 사이드바가 아래로 슬라이드돼면서..."):
// 헤더 우측 아이콘을 누르면 화면 위에서 아래로 슬라이드해 내려오는
// 전체너비 메가 메뉴. LeftSidebar.tsx/RightSidebar.tsx(화면 좌우 가장자리,
// 위→아래 전체 높이)와는 다른 자리·모양이라 완전히 새 컴포넌트로 만든다.
// column 1(이름/등급/팔로워/활동/메시지)은 관리자가 편집할 내용이 아니라
// 실제 로그인 세션 데이터라(MembershipPopover.tsx와 동일 데이터) 여기
// 타입에는 없다 — TopSidebarPanel.tsx가 직접 조회한다. 여기서 다루는 건
// column 2(관리자가 자유롭게 추가/삭제하는 링크 목록, 항목마다 hover 시
// 왼쪽에 뜨는 이미지)와 그 각 링크의 column 3 하위 목록(hover 시 나타남)뿐이다.
import { DEFAULT_TAB_HOVER_MOTION, type TabHoverMotion } from "./tabHoverMotion";

export type TopSidebarChildLink = {
  id: string;
  label: string;
  href: string;
};

export type TopSidebarLink = {
  id: string;
  label: string;
  href: string;
  /** 이 링크에 마우스를 올렸을 때 왼쪽에 뜨는 이미지 — 비어 있으면 아무 이미지도 안 보임.
   *  HOTFIX-140.2: imageBankUrls(랜덤 풀)가 비어있을 때만 쓰이는 폴백. */
  imageUrl: string;
  /** column 3 — 이 링크에 마우스를 올렸을 때 나타나는 하위 링크 목록. */
  children: TopSidebarChildLink[];
};

// HOTFIX-140.2(사용자 지시 — "오른쪽칼럼에 마우스를 hover 하거나 선택해서
// 클릭하면 랜덤으로 이미지 뱅크의 이미지가 나오는것" + "사이드바의 배경색,
// 컬럼의 텍스트 색 & 폰트추가, 모션여러개, hover 했을때의 모션옵션 여러개"):
// 패널 전체 스타일 + column 0(왼쪽 이미지 자리)에 쓸 이미지 풀.
export type TopSidebarConfig = {
  links: TopSidebarLink[];
  /** 빈 문자열이면 기본값(흰 배경) 그대로. */
  backgroundColor: string;
  /** 빈 문자열이면 기본값(회색 계열) 그대로. */
  textColor: string;
  /** 빈 문자열이면 기본 서체 그대로(직접 입력 — mainLogoSettings와 동일한 가벼운 패턴). */
  fontFamily: string;
  /** column 2/3 링크에 적용되는 hover 모션 — tabHoverMotion.ts의 6종 프리셋 재사용. */
  hoverMotion: TabHoverMotion;
  /** column 2 항목에 마우스를 올리거나 클릭할 때마다 이 풀에서 무작위로 하나 골라 column 0에 보여준다.
   *  비어있으면 그 링크 자신의 imageUrl로 폴백(구버전 동작 유지). */
  imageBankUrls: string[];
};

export type TopSidebarValue = { pc: TopSidebarConfig; mobile: TopSidebarConfig };

export function defaultTopSidebarConfig(): TopSidebarConfig {
  return {
    links: [],
    backgroundColor: "",
    textColor: "",
    fontFamily: "",
    hoverMotion: DEFAULT_TAB_HOVER_MOTION,
    imageBankUrls: [],
  };
}

export function defaultTopSidebarValue(): TopSidebarValue {
  return { pc: defaultTopSidebarConfig(), mobile: defaultTopSidebarConfig() };
}

function normalizeChild(raw: unknown): TopSidebarChildLink {
  const v = (raw as Partial<TopSidebarChildLink>) ?? {};
  return { id: v.id ?? `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`, label: v.label ?? "", href: v.href ?? "" };
}

function normalizeLink(raw: unknown): TopSidebarLink {
  const v = (raw as Partial<TopSidebarLink>) ?? {};
  return {
    id: v.id ?? `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    label: v.label ?? "",
    href: v.href ?? "",
    imageUrl: v.imageUrl ?? "",
    children: Array.isArray(v.children) ? v.children.map(normalizeChild) : [],
  };
}

function normalizeConfig(raw: unknown): TopSidebarConfig {
  const v = raw as Partial<TopSidebarConfig> | null;
  const fallback = defaultTopSidebarConfig();
  return {
    links: Array.isArray(v?.links) ? v!.links.map(normalizeLink) : [],
    backgroundColor: v?.backgroundColor ?? fallback.backgroundColor,
    textColor: v?.textColor ?? fallback.textColor,
    fontFamily: v?.fontFamily ?? fallback.fontFamily,
    hoverMotion: v?.hoverMotion ?? fallback.hoverMotion,
    imageBankUrls: Array.isArray(v?.imageBankUrls) ? v!.imageBankUrls : fallback.imageBankUrls,
  };
}

export function normalizeTopSidebar(raw: unknown): TopSidebarValue {
  if (!raw || typeof raw !== "object") return defaultTopSidebarValue();
  const obj = raw as Record<string, unknown>;
  if (obj.pc || obj.mobile) {
    return { pc: normalizeConfig(obj.pc), mobile: normalizeConfig(obj.mobile) };
  }
  return defaultTopSidebarValue();
}
