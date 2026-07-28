import { supabase } from "@/lib/supabaseClient";

export type NavItem = { label: string; href: string };
export type NavGroup = { groupLabel: string; items: NavItem[] };

// 탭의 UI 상호작용 방식. Navbar.tsx는 이 값에 따라 렌더링 방식만 분기하고,
// 실제 라벨/링크/그룹 구성은 DB(site_navigations, EPIC-023)에서 온다.
export type NavTabType = "sidebar-left" | "sidebar-right" | "dropdown" | "link";

export type NavTab = {
  key: string;
  label: string;
  type: NavTabType;
  href?: string; // type === "link"
  items?: NavItem[]; // type === "dropdown"
  groups?: NavGroup[]; // type === "sidebar-left" | "sidebar-right"
};

// DB(site_navigations)의 target_type 값 ↔ 기존 NavTabType 매핑.
// 'tab'은 하위 그룹/드롭다운 없이 바로 이동하는 단일 링크 탭(예: 마이페이지).
type DbTargetType = "tab" | "sidebar_left" | "sidebar_right" | "dropdown";

function mapTargetType(t: DbTargetType): NavTabType {
  switch (t) {
    case "sidebar_left":
      return "sidebar-left";
    case "sidebar_right":
      return "sidebar-right";
    case "dropdown":
      return "dropdown";
    case "tab":
    default:
      return "link";
  }
}

type SiteNavRow = {
  id: string;
  key: string | null;
  title: string;
  href: string | null;
  parent_id: string | null;
  target_type: DbTargetType;
};

// EPIC-044: 헤리티지(할머니/할아버지)·클럽·주제별 게시판 등 이름이
// 무한히 늘어나는 카테고리는 사람 수만큼 페이지를 만들지 않고, 이름을
// URL 파라미터로 넘겨 UniversalBoard를 렌더링하는 동적 라우트
// (/heritage/grandma/[name], /heritage/grandpa/[name],
// /community/club/[name])로 소화한다. 아래는 그 동적 라우트로 링크를
// 거는 사이드바 항목을 만드는 헬퍼.
function toDynamicNavItems(basePath: string, names: string[]): NavItem[] {
  return names.map((name) => ({
    label: name,
    href: `${basePath}/${encodeURIComponent(name)}`,
  }));
}

// EPIC-054D: sitemap.ts가 /heritage/*, /community/club/* 동적 라우트를
// 전부 열거할 수 있도록 export — DB 조회 없이 하드코딩된 이름 목록이라
// 사이트맵도 같은 목록을 그대로 재사용하면 된다(새 배열 중복 정의 없음).
export const HERITAGE_GRANDMA_NAMES = [
  "Agatha", "Amanda", "Angie", "Anne", "Alyssa", "Becky", "Beth", "Betty",
  "Brenda", "Claire", "Christine", "Cindy", "Deborah", "Donna", "Edna",
  "Elaine", "Elena", "Francis", "Ingrid", "Isabelle", "Janette", "Janice",
  "Jean", "Joanne", "Joyce", "Judy", "Julie", "Karen", "Kristen", "Leslie",
  "Letty", "Loraine", "Nancy", "Marie", "Martha", "Maxine", "Melinda",
  "Pamela", "Patricia", "Phyllis", "Priscilla", "Rita", "Samantha",
  "Shannon", "Shella", "Selina", "Sue", "Susan", "Tammy", "Teresa", "Tracy",
];

export const HERITAGE_GRANDPA_NAMES = [
  "Arthur", "Ben", "Derek", "Eddy", "Frank", "Gerry", "James", "John",
  "Manny", "Philip", "Randy", "Robert", "Steven", "Theo", "Timothy", "Tom",
  "Tuco",
];

export const SALON_TOPIC_BOARD_NAMES = [
  "경제", "예술", "세계역사", "과학", "코메디", "문학", "건강", "정치",
  "영화", "심리", "스포츠", "인간 집사들", "따듯한 세상 클럽",
];

export const SALON_WEEKDAY_CLUB_NAMES = [
  "월요반란", "책 낭송", "행간의 조각가", "놀아보자 영어", "비포 선라이즈 소셜",
  "무슨일이든 일어날수있어", "연극이 끝나고 난 뒤",
];

// site_navigations를 DB에서 아직 읽지 못했을 때(최초 로딩 중, 네트워크 실패 등)
// 화면에 아무 탭도 뜨지 않는 것을 막기 위한 폴백. EPIC-023 이전 하드코딩값과
// 동일하며, DB 마이그레이션 전/후 UX가 끊기지 않도록 하는 임시 스냅샷일 뿐
// SSoT는 아니다 — 실제 데이터는 항상 site_navigations 테이블.
const FALLBACK_NAV_TABS: NavTab[] = [
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
        groupLabel: "사일로 헤리티지 · 할머니",
        items: toDynamicNavItems("/heritage/grandma", HERITAGE_GRANDMA_NAMES),
      },
      {
        groupLabel: "사일로 헤리티지 · 할아버지",
        items: toDynamicNavItems("/heritage/grandpa", HERITAGE_GRANDPA_NAMES),
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
        ],
      },
      {
        groupLabel: "주제별 소통게시판",
        items: toDynamicNavItems("/community/club", SALON_TOPIC_BOARD_NAMES),
      },
      {
        groupLabel: "요일별 클럽",
        items: toDynamicNavItems("/community/club", SALON_WEEKDAY_CLUB_NAMES),
      },
    ],
  },
  {
    key: "space_inquiry",
    label: "스튜디오",
    type: "dropdown",
    items: [
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

function buildNavTree(rows: SiteNavRow[]): NavTab[] {
  const byParent = new Map<string | null, SiteNavRow[]>();
  for (const row of rows) {
    const list = byParent.get(row.parent_id) ?? [];
    list.push(row);
    byParent.set(row.parent_id, list);
  }

  const topRows = byParent.get(null) ?? [];

  return topRows.map((top) => {
    const type = mapTargetType(top.target_type);

    if (type === "link") {
      return {
        key: top.key ?? top.id,
        label: top.title,
        type,
        href: top.href ?? "#",
      };
    }

    if (type === "dropdown") {
      const items = (byParent.get(top.id) ?? []).map((i) => ({
        label: i.title,
        href: i.href ?? "#",
      }));
      return { key: top.key ?? top.id, label: top.title, type, items };
    }

    // sidebar-left / sidebar-right: 자식은 그룹, 손자는 항목
    const groupRows = byParent.get(top.id) ?? [];
    const groups: NavGroup[] = groupRows.map((g) => ({
      groupLabel: g.title,
      items: (byParent.get(g.id) ?? []).map((i) => ({
        label: i.title,
        href: i.href ?? "#",
      })),
    }));
    return { key: top.key ?? top.id, label: top.title, type, groups };
  });
}

// site_navigations(EPIC-023)에서 활성 상태인 탭/그룹/항목을 조회해 트리로 조립한다.
// 실패하거나 아직 시드가 적용되지 않은 경우 FALLBACK_NAV_TABS를 반환한다.
export async function fetchNavTabs(): Promise<NavTab[]> {
  const { data, error } = await supabase
    .from("site_navigations")
    .select("id, key, title, href, parent_id, target_type")
    .eq("is_active", true)
    .order("sort_order", { ascending: true });

  if (error || !data || data.length === 0) {
    return FALLBACK_NAV_TABS;
  }

  return buildNavTree(data as SiteNavRow[]);
}

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
