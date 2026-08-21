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
import type { CustomFontEntry } from "./mainLogoSettings";

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
  // HOTFIX-141(사용자 지시 — "이건 다른 모든 상단 사이드바의 서체를
  // 내가 업로드하는 기능이 없네"): 위 fontFamily(시스템 서체 이름 직접
  // 입력)와 별개로, 폰트 "파일"을 업로드해 쓸 수 있게 — mainLogoSettings/
  // topTabStyleSettings의 customFonts와 동일한 패턴(활성 폰트를
  // font-family 폴백 체인 맨 앞에 건다).
  customFonts: CustomFontEntry[];
  /** column 2/3 링크에 적용되는 hover 모션 — tabHoverMotion.ts의 6종 프리셋 재사용. */
  hoverMotion: TabHoverMotion;
  /** column 2 항목에 마우스를 올리거나 클릭할 때마다 이 풀에서 무작위로 하나 골라 column 0에 보여준다.
   *  비어있으면 그 링크 자신의 imageUrl로 폴백(구버전 동작 유지). */
  imageBankUrls: string[];
  // HOTFIX-141(사용자 지시 — "상단 사이드바 아이콘 설정(이미지), hover
  // 했을때 이미지를 설정하는게 없네 만들어"): 헤더 우측 "☰" 여닫이 트리거
  // 자체의 기본/hover 이미지 — sidebarIconsSettings.ts의 left/rightIcon*Url과
  // 동일한 개념. 비어있으면 기존처럼 "☰" 텍스트 아이콘 그대로 보인다.
  triggerIconDefaultUrl: string;
  triggerIconHoverUrl: string;
  // HOTFIX-141(사용자 지시 — "상단 사이드바의 컬럼과 컬럼의 영역을 내가
  // 드래그 드랍으로 조절하는 기능을 만들어줘. 그리고... 컬럼을 하나의
  // 묶음으로 드래그 드랍으로 좌우 순서를 변경가능하게 해줘"): 4개 컬럼
  // (0=이미지/1=세션 정보/2=관리자 링크/3=hover 하위 목록)의 너비(px)와
  // 화면상 좌우 순서. 픽셀 드래그 대신 정확한 숫자 입력+↑/↓ 순서 버튼으로
  // 구현했다 — 이 컴포넌트는 사이트 전역에 노출되는 실제 메가메뉴라,
  // 이 세션에서 실제 마우스 드래그 검증이 불가능한 채로 픽셀 단위
  // 드래그 인터랙션을 새로 얹는 위험을 피하고, 링크 목록(위 links)이
  // 이미 쓰는 것과 같은 검증된 패턴(정확한 값+버튼)을 재사용했다.
  columnWidthsPx: [number, number, number, number];
  columnOrder: [number, number, number, number];
};

export type TopSidebarValue = { pc: TopSidebarConfig; mobile: TopSidebarConfig };

export function defaultTopSidebarConfig(): TopSidebarConfig {
  return {
    links: [],
    backgroundColor: "",
    textColor: "",
    fontFamily: "",
    customFonts: [],
    hoverMotion: DEFAULT_TAB_HOVER_MOTION,
    imageBankUrls: [],
    triggerIconDefaultUrl: "",
    triggerIconHoverUrl: "",
    columnWidthsPx: [160, 192, 224, 224],
    columnOrder: [0, 1, 2, 3],
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
    customFonts: Array.isArray(v?.customFonts) ? (v!.customFonts as CustomFontEntry[]) : fallback.customFonts,
    hoverMotion: v?.hoverMotion ?? fallback.hoverMotion,
    imageBankUrls: Array.isArray(v?.imageBankUrls) ? v!.imageBankUrls : fallback.imageBankUrls,
    triggerIconDefaultUrl: v?.triggerIconDefaultUrl ?? fallback.triggerIconDefaultUrl,
    triggerIconHoverUrl: v?.triggerIconHoverUrl ?? fallback.triggerIconHoverUrl,
    columnWidthsPx:
      Array.isArray(v?.columnWidthsPx) && v!.columnWidthsPx.length === 4
        ? (v!.columnWidthsPx as [number, number, number, number])
        : fallback.columnWidthsPx,
    columnOrder: ((): [number, number, number, number] => {
      const order = v?.columnOrder;
      if (Array.isArray(order) && order.length === 4 && [0, 1, 2, 3].every((i) => order.includes(i))) {
        return order as [number, number, number, number];
      }
      return fallback.columnOrder;
    })(),
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
