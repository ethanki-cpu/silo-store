export type NavItem = { label: string; href: string };
export type NavGroup = { groupLabel: string; items: NavItem[] };

// 탭의 UI 상호작용 방식. Navbar.tsx는 이 값에 따라 렌더링 방식만 분기하고,
// 실제 라벨/링크/그룹 구성은 항상 이 파일(NAV_TABS)에서만 가져온다.
export type NavTabType = "sidebar-left" | "sidebar-right" | "dropdown" | "link";

export type NavTab = {
  key: string;
  label: string;
  type: NavTabType;
  href?: string; // type === "link"
  items?: NavItem[]; // type === "dropdown"
  groups?: NavGroup[]; // type === "sidebar-left" | "sidebar-right"
};

export const NAV_TABS: NavTab[] = [
  {
    key: "silostore",
    label: "사일로상점",
    type: "sidebar-left",
    groups: [
      {
        groupLabel: "사일로 보물들",
        items: [
          { label: "보물 목록", href: "/shop" },
          { label: "분양 후기", href: "/boards" },
        ],
      },
      {
        groupLabel: "온라인 도슨트 라이브러리",
        items: [
          { label: "Renaissance", href: "/docent/collections#era-renaissance" },
          { label: "Baroque", href: "/docent/collections#era-baroque" },
          { label: "Rococo", href: "/docent/collections#era-rococo" },
          { label: "NeoClassicism", href: "/docent/collections#era-neoclassic" },
          { label: "Regency", href: "/docent/collections#era-empire" },
          { label: "Victoria", href: "/docent/collections#era-victorian" },
          { label: "Art Nouveau", href: "/docent/collections#era-art_nouveau" },
          { label: "Art Deco", href: "/docent/collections#era-art_deco" },
          { label: "Beat Generation", href: "/docent/collections#era-beat_generation" },
          { label: "CounterCulture", href: "/docent/collections#era-counter_culture" },
          { label: "Digital", href: "/docent/collections#era-digital" },
        ],
      },
      {
        groupLabel: "사일로 Heritage",
        items: [
          { label: "할머니", href: "/shop/heritage/grandma" },
          { label: "할아버지", href: "/shop/heritage/grandpa" },
        ],
      },
    ],
  },
  {
    key: "salon",
    label: "살롱데상",
    type: "sidebar-right",
    groups: [
      {
        groupLabel: "Community",
        items: [
          { label: "출석체크", href: "/attendance" },
          { label: "자유게시판", href: "/boards" },
          { label: "주제별 소통 게시판", href: "/boards" },
          { label: "Mon ~ Sun 클럽모임", href: "/clubs" },
          { label: "월별 모임 [패트론의 살롱]", href: "/salon/monthly-events" },
          { label: "설문 [우리들 맴]", href: "/polls" },
          { label: "Q&A", href: "/boards" },
          { label: "이벤트 공지", href: "/salon/event-notices" },
        ],
      },
      {
        groupLabel: "Membership",
        items: [
          { label: "패트론 게시판", href: "/boards" },
          { label: "한문장 소설 프로젝트", href: "/salon/one-sentence-novel" },
          { label: "마음일기", href: "/salon/mind-diary" },
          { label: "나의 보물 이야기", href: "/salon/my-treasure-story" },
          { label: "비밀의 방 도슨트", href: "/salon/secret-room" },
          { label: "나의 아티스트 소개", href: "/salon/artist-intro" },
        ],
      },
      {
        groupLabel: "Gallery",
        items: [
          { label: "시상식", href: "/salon/gallery/awards" },
          { label: "공연들", href: "/salon/gallery/performances" },
          { label: "파티", href: "/salon/gallery/parties" },
          { label: "운명의 방문자들", href: "/salon/gallery/visitors" },
          { label: "패트론들", href: "/salon/gallery/patrons" },
        ],
      },
      {
        groupLabel: "Library",
        items: [
          { label: "소개지", href: "/downloads" },
          { label: "포스터", href: "/downloads" },
        ],
      },
    ],
  },
  {
    key: "space_inquiry",
    label: "스튜디오",
    type: "dropdown",
    items: [
      // EPIC-018: 기존 "스튜디오 대관" 탭(rental) 통합 — URL은 그대로 유지.
      { label: "공간 촬영 대관 (1층 사일로상점)", href: "/rental?floor=1f_silostore" },
      { label: "공간 촬영 대관 (2층 살롱데상)", href: "/rental?floor=2f_salon" },
      { label: "물품 대여", href: "/space-inquiry/item-rental" },
      { label: "공간 스타일링", href: "/space-inquiry/styling" },
    ],
  },
  {
    key: "mypage",
    label: "마이페이지",
    type: "link",
    href: "/mypage",
  },
];

export function getActiveNavTabKey(
  pathname: string,
  categoryParam: string | null,
): string | null {
  if (pathname.startsWith("/shop")) return "silostore";
  if (pathname.startsWith("/docent/collections")) return "silostore";

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

  if (pathname.startsWith("/rental") || pathname.startsWith("/space-inquiry")) {
    return "space_inquiry";
  }

  if (pathname === "/docent") {
    return categoryParam === "salon" ? "salon" : "silostore";
  }

  if (pathname.startsWith("/mypage")) return "mypage";

  return null;
}
