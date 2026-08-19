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

// HOTFIX(범위 축소, 2026-08-19): 다른 모든 설정({pc,mobile} 독립값)과
// 달리 이 레이아웃은 PC/모바일 공용 단일 목록으로 시작한다 — GrapesJS
// Device Manager까지 이번 스코프에 넣으면 저장 데이터 모델과 캔버스 both
// 복잡도가 크게 늘어나 위험도가 높아진다(사이트 전체에 영향을 주는
// Navbar.tsx를 건드리는 작업이라 특히). 독립적인 모바일 레이아웃은 다음
// 단계로 명시적으로 미룬다(NEXT_TASK.md 기록).
export type HeaderLayoutValue = HeaderLayoutConfig;

export function normalizeHeaderLayout(raw: unknown): HeaderLayoutValue {
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
