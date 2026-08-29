// 사용자 지시(2026-08-29 — "'홈페이지 설정'에 상단에 아이콘을 추가하고
// 페이지와 링크하는 기능을 만들어줘. 그리고 그 아이콘은 드래그앤드랍으로
// 위치를 설정할수 있어야해"): 관리자가 자유롭게 추가하는 헤더 상단 아이콘
// 목록 — 이미지+링크 페어를 가진 새 요소. accountMenuStyleSettings.ts의
// extraItems와 동일하게 목록 자체는 기기별로 나누지 않는다(같은 아이콘/
// 링크가 PC든 모바일이든 동일해야 자연스럽다) — 위치만 기존
// header_positions(HeaderSlot, slotKey=`top-bar-icon:${id}`)가 기기별로
// 독립적으로 담당한다(다른 헤더 요소와 완전히 동일한 드래그 메커니즘 재사용,
// 새 드래그 시스템을 따로 만들지 않음).
export type TopBarIcon = {
  id: string;
  imageUrl: string;
  /** 마우스를 올렸을 때 나타날 이미지 — 비어 있으면 기본 이미지 고정(다른 이미지+hover 필드들과 동일 패턴). */
  hoverImageUrl: string;
  /** 클릭 시 이동할 페이지 경로 — 예: "/shop", "/boards/xxx". */
  href: string;
  sizePx: number;
  /** 대체 텍스트(접근성) — 비워도 됨. */
  alt: string;
};

export type TopBarIconsValue = {
  icons: TopBarIcon[];
};

export const DEFAULT_TOP_BAR_ICON_SIZE_PX = 28;

export function defaultTopBarIconsValue(): TopBarIconsValue {
  return { icons: [] };
}

export function newTopBarIcon(): TopBarIcon {
  return {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    imageUrl: "",
    hoverImageUrl: "",
    href: "",
    sizePx: DEFAULT_TOP_BAR_ICON_SIZE_PX,
    alt: "",
  };
}

function normalizeIcon(raw: unknown): TopBarIcon {
  const v = (raw as Partial<TopBarIcon>) ?? {};
  return {
    id: v.id ?? `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    imageUrl: v.imageUrl ?? "",
    hoverImageUrl: v.hoverImageUrl ?? "",
    href: v.href ?? "",
    sizePx: v.sizePx || DEFAULT_TOP_BAR_ICON_SIZE_PX,
    alt: v.alt ?? "",
  };
}

export function normalizeTopBarIcons(raw: unknown): TopBarIconsValue {
  const v = raw as Partial<TopBarIconsValue> | null;
  return { icons: Array.isArray(v?.icons) ? v!.icons.map(normalizeIcon) : [] };
}
