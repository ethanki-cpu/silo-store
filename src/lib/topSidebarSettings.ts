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
export type TopSidebarChildLink = {
  id: string;
  label: string;
  href: string;
};

export type TopSidebarLink = {
  id: string;
  label: string;
  href: string;
  /** 이 링크에 마우스를 올렸을 때 왼쪽에 뜨는 이미지 — 비어 있으면 아무 이미지도 안 보임. */
  imageUrl: string;
  /** column 3 — 이 링크에 마우스를 올렸을 때 나타나는 하위 링크 목록. */
  children: TopSidebarChildLink[];
};

export type TopSidebarConfig = {
  enabled: boolean;
  links: TopSidebarLink[];
};

export type TopSidebarValue = { pc: TopSidebarConfig; mobile: TopSidebarConfig };

export function defaultTopSidebarConfig(): TopSidebarConfig {
  return { enabled: false, links: [] };
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
  return {
    enabled: v?.enabled ?? false,
    links: Array.isArray(v?.links) ? v!.links.map(normalizeLink) : [],
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
