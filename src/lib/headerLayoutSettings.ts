import type { CSSProperties } from "react";

// EPIC-134(사용자 지시 — "'상단 탭'과 '사용자 메뉴'의 캔버스 통합... 로그아웃
// 버튼 옆에 스튜디오 탭을 마우스로 끌어다 놓을 수 있어야 함"): 기존엔
// "상단 탭 디자인"/"사용자 메뉴 디자인"이 서로 다른 두 영역(EPIC-117 tier1/
// tier2 + HOTFIX-134 순서 드래그, 계정 영역 5개 항목)에 완전히 분리돼
// 있어 둘을 뒤섞어 배치할 방법 자체가 없었다 — 이제 하나의 순서 있는
// 목록(HeaderLayoutItem[])으로 통합해, 탭이든 계정 메뉴 항목이든 구분 없이
// 자유롭게 순서를 정할 수 있다.
//
// 항목 자체는 새로운 렌더링을 만들지 않고 기존 자산(NavTab.key, 5개
// 고정 계정 메뉴 키)만 "참조"한다 — 실제 표시(드롭다운/메가메뉴/hover
// 모션/로그인 상태 게이팅)는 Navbar.tsx의 기존 renderTab()과 계정 메뉴
// 렌더 로직을 그대로 재사용한다(각 항목의 위치와 부가 스타일 오버라이드만
// 이 데이터가 결정). GrapesJS 캔버스(HeaderGrapesEditor.tsx)가 이 형태로
// 직렬화해 저장한다.
export type HeaderMenuItemKey = "admin" | "tier" | "mypage" | "name" | "logout";

export const HEADER_MENU_ITEM_KEYS: HeaderMenuItemKey[] = ["admin", "tier", "mypage", "name", "logout"];

export const HEADER_MENU_ITEM_LABELS: Record<HeaderMenuItemKey, string> = {
  admin: "관리자",
  tier: "등급 / 멤버십",
  mypage: "마이페이지",
  name: "회원 이름",
  logout: "로그아웃 / 로그인",
};

export type HeaderLayoutItemStyle = {
  fontSizePx?: number | null;
  color?: string | null;
  bold?: boolean;
  marginLeftPx?: number | null;
  marginRightPx?: number | null;
};

export type HeaderLayoutItem = {
  // GrapesJS 컴포넌트 id — 항목 자체의 고유성만 필요(렌더링에는 안 쓰임).
  id: string;
  type: "tab" | "menu";
  // type==="tab"이면 NavTab.key, type==="menu"이면 HeaderMenuItemKey.
  refId: string;
  style?: HeaderLayoutItemStyle;
};

export type HeaderLayoutConfig = { items: HeaderLayoutItem[] };

// HOTFIX(사용자 지시 — "pc/모바일 독립으로 설정할 수 있게 해야지"): 다른
// 모든 설정(main_logo/sidebar_icons/top_tab_style/account_menu_style)과
// 동일한 {pc, mobile} 독립값 패턴 — heroSlideshow/topTabStyle 등과 같은
// 방식으로 관리자가 PC/모바일 탭을 토글해가며 서로 다른 순서·스타일을
// 저장할 수 있다.
export type HeaderLayoutValue = { pc: HeaderLayoutConfig; mobile: HeaderLayoutConfig };

function normalizeHeaderLayoutConfig(raw: unknown): HeaderLayoutConfig {
  if (!raw || typeof raw !== "object") return { items: [] };
  const items = (raw as { items?: unknown }).items;
  if (!Array.isArray(items)) return { items: [] };
  return {
    items: items
      .filter((it): it is Record<string, unknown> => !!it && typeof it === "object")
      .map((it, i) => {
        const style = it.style && typeof it.style === "object" ? (it.style as Record<string, unknown>) : null;
        const normalizedStyle: HeaderLayoutItemStyle | undefined = style
          ? {
              fontSizePx: typeof style.fontSizePx === "number" ? style.fontSizePx : null,
              color: typeof style.color === "string" ? style.color : null,
              bold: style.bold === true,
              marginLeftPx: typeof style.marginLeftPx === "number" ? style.marginLeftPx : null,
              marginRightPx: typeof style.marginRightPx === "number" ? style.marginRightPx : null,
            }
          : undefined;
        return {
          id: typeof it.id === "string" ? it.id : `item-${i}`,
          type: it.type === "menu" ? ("menu" as const) : ("tab" as const),
          refId: typeof it.refId === "string" ? it.refId : "",
          style: normalizedStyle,
        };
      })
      .filter((it) => it.refId),
  };
}

// 구버전(2026-08-19 EPIC-134 최초 출시분) 저장값은 {pc,mobile} 구분 없이
// {items:[...]} 단일 목록이었다 — 처음 조회 시 그 값을 pc/mobile 양쪽에
// 그대로 복제해 back-compat("이미 만들어둔 레이아웃이 사라지지 않고
// 그대로 양쪽에 남아있다가, 이후 각자 독립적으로 갈라져 나간다")한다.
export function normalizeHeaderLayout(raw: unknown): HeaderLayoutValue {
  if (raw && typeof raw === "object" && !Array.isArray(raw) && ("pc" in raw || "mobile" in raw) && !("items" in raw)) {
    const v = raw as { pc?: unknown; mobile?: unknown };
    return { pc: normalizeHeaderLayoutConfig(v.pc), mobile: normalizeHeaderLayoutConfig(v.mobile) };
  }
  const legacy = normalizeHeaderLayoutConfig(raw);
  return { pc: legacy, mobile: legacy };
}

export function defaultHeaderLayoutValue(): HeaderLayoutValue {
  return { pc: { items: [] }, mobile: { items: [] } };
}

// 관리자가 한 번도 저장한 적 없을 때 캔버스를 채우는 시작 상태 — 실제
// 라이브 사이트의 현재 기본 순서(탭 전부 → 계정 메뉴 5개)를 그대로
// 반영해, 처음 캔버스를 열었을 때 실제 헤더와 다르게 보이지 않게 한다.
export function buildDefaultHeaderLayout(tabKeys: string[]): HeaderLayoutItem[] {
  const tabItems: HeaderLayoutItem[] = tabKeys.map((key) => ({ id: `tab-${key}`, type: "tab", refId: key }));
  const menuItems: HeaderLayoutItem[] = HEADER_MENU_ITEM_KEYS.map((key) => ({
    id: `menu-${key}`,
    type: "menu",
    refId: key,
  }));
  return [...tabItems, ...menuItems];
}

export function headerItemInlineStyle(style: HeaderLayoutItemStyle | undefined): CSSProperties | undefined {
  if (!style) return undefined;
  const out: Record<string, string | number> = {};
  if (style.fontSizePx) out.fontSize = style.fontSizePx;
  if (style.color) out.color = style.color;
  if (style.bold) out.fontWeight = "bold";
  if (style.marginLeftPx) out.marginLeft = style.marginLeftPx;
  if (style.marginRightPx) out.marginRight = style.marginRightPx;
  return Object.keys(out).length > 0 ? out : undefined;
}
