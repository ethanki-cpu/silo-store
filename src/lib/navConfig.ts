export type NavItem = { label: string; href: string };
export type NavTab = { key: string; label: string; items: NavItem[] };

export const NAV_TABS: NavTab[] = [
  {
    key: "silostore",
    label: "사일로상점",
    items: [
      { label: "물품 목록", href: "/shop" },
      { label: "온라인 도슨트", href: "/docent?category=silostore" },
    ],
  },
  {
    key: "salon",
    label: "살롱데상",
    items: [
      { label: "클럽모임", href: "/clubs" },
      { label: "소통 게시판", href: "/boards" },
      { label: "자료실", href: "/downloads" },
      { label: "설문조사", href: "/polls" },
      { label: "온라인 도슨트", href: "/docent?category=salon" },
      { label: "살롱 출입", href: "/salon/checkin" },
      { label: "출석체크", href: "/attendance" },
      { label: "월별 모임", href: "/salon/monthly-events" },
      { label: "비밀의 방", href: "/salon/secret-room" },
      { label: "음료 주문", href: "/salon/drinks" },
      { label: "투어 도슨트 프로그램", href: "/salon/docent-tour" },
    ],
  },
  {
    key: "rental",
    label: "스튜디오 대관",
    items: [
      { label: "1층 사일로상점 대관", href: "/rental?floor=1f_silostore" },
      { label: "2층 살롱데상 대관", href: "/rental?floor=2f_salon" },
    ],
  },
];

export function getActiveNavTabKey(
  pathname: string,
  categoryParam: string | null,
): string | null {
  if (pathname.startsWith("/shop")) return "silostore";

  if (
    pathname.startsWith("/clubs") ||
    pathname.startsWith("/boards") ||
    pathname.startsWith("/salon") ||
    pathname.startsWith("/downloads") ||
    pathname.startsWith("/attendance") ||
    pathname.startsWith("/polls")
  ) {
    return "salon";
  }

  if (pathname.startsWith("/rental")) return "rental";

  if (pathname === "/docent") {
    return categoryParam === "salon" ? "salon" : "silostore";
  }

  return null;
}
