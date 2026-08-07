import { supabase } from "@/lib/supabaseClient";
import { hrefToSlug } from "@/lib/pageTemplates";

// EPIC-079-PHASE-2: dropdown 탭의 항목도 sidebar의 group→item처럼 한 단계
// 더 자식(서브카테고리)을 가질 수 있다 — children이 있으면 Navbar가 2차
// 플라이아웃으로 렌더링하고, 없으면(기존처럼) 클릭 시 바로 이동하는 평범한
// 항목으로 렌더링한다.
// EPIC-088: 메뉴별 티어 접근 제어 — href가 연결된 page_builder 페이지의
// min_rank_to_read를 그대로 물려받는다(새 컬럼을 site_navigations에 추가하지
// 않고, "사이트 구성 관리"에서 이미 편집 가능한 값을 재사용). 클릭 시
// checkNavAccess()가 이 값과 로그인 회원의 등급을 비교한다.
export type NavItem = {
  label: string;
  href: string;
  children?: NavItem[];
  minRankToRead?: number | null;
};
// EPIC-058: 그룹 헤더(상위 카테고리) 자체도 Hub Page로 이동하는 링크가 될 수
// 있도록 href를 추가한다. 없으면(기존처럼) 클릭 불가한 라벨로만 렌더링된다
// — LeftSidebar.tsx/RightSidebar.tsx가 이 값의 유무로 분기한다.
export type NavGroup = {
  groupLabel: string;
  href?: string;
  items: NavItem[];
  minRankToRead?: number | null;
};

// 탭의 UI 상호작용 방식. Navbar.tsx는 이 값에 따라 렌더링 방식만 분기하고,
// 실제 라벨/링크/그룹 구성은 DB(site_navigations, EPIC-023)에서 온다.
export type NavTabType = "sidebar-left" | "sidebar-right" | "dropdown" | "link";

export type NavTab = {
  key: string;
  label: string;
  type: NavTabType;
  href?: string; // type === "link" | "dropdown"(EPIC-058: 드롭다운 트리거 자체도 Hub Page 링크 가능) | "sidebar-left" | "sidebar-right"(EPIC-084: 패널 헤더/상단 탭도 Hub Page 링크 가능)
  items?: NavItem[]; // type === "dropdown"
  groups?: NavGroup[]; // type === "sidebar-left" | "sidebar-right"
  minRankToRead?: number | null;
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

// EPIC-080: 이전엔(EPIC-044) 헤리티지(할머니/할아버지)·주제별 게시판·요일별
// 클럽처럼 이름이 늘어나는 카테고리를 이름 하나하나가 URL 파라미터가 되는
// 동적 라우트(/heritage/grandma/[name], /community/club/[name])로 소화하고,
// 그 이름 목록을 이 파일에 하드코딩해 sitemap.ts와 공유했다. 그런데 실제
// 라이브 site_navigations(SSoT)는 그 구조를 쓴 적이 없다 — 헤리티지는
// 이름별 페이지 대신 게시판 하나(grandmas/grandpas)로 통합된 링크 1개씩만,
// 주제별/요일별 게시판은 이름별 동적 세그먼트가 아니라 항목마다 고정
// slug(`/community-topics-<slug>` 등, Page Builder catch-all로 서빙)를 쓴다
// — 코드와 DB가 서로 다른 두 개의 nav 트리로 공존하던 것이 이 프로젝트의
// P0 기술부채("Navigation Dual-Structure")였다. `/heritage/grandma/[name]`·
// `/heritage/grandpa/[name]`·`/community/club/[name]` 동적 라우트와 이름
// 목록은 삭제했고(아무도 실제로 링크하지 않던 죽은 라우트), 아래
// FALLBACK_NAV_TABS는 이제 라이브 DB 트리를 그대로 미러링한다 — DB가
// 응답 못 할 때만 잠깐 보이는 스냅샷이므로 100% 실시간 동기화가 필수는
// 아니지만, 최소한 "코드에만 있고 DB엔 없는 라우트"는 없어야 한다.
export const FALLBACK_NAV_TABS_SYNCED_AT = "2026-08-06";

// site_navigations를 DB에서 아직 읽지 못했을 때(최초 로딩 중, 네트워크 실패 등)
// 화면에 아무 탭도 뜨지 않는 것을 막기 위한 폴백. SSoT는 항상
// site_navigations 테이블 — 이 배열은 그 트리의 스냅샷일 뿐이다.
const FALLBACK_NAV_TABS: NavTab[] = [
  {
    key: "silostore",
    label: "사일로상점",
    type: "sidebar-left",
    href: "/shop",
    groups: [
      {
        groupLabel: "사일로 보물들",
        href: "/treasures",
        items: [
          { label: "보물 목록", href: "/shop" },
          { label: "입양신청서 라이브러리", href: "/shop-adoption-library" },
          { label: "분양 후기", href: "/shop/reviews" },
          { label: "After Adoption", href: "/shop-reviews" },
        ],
      },
      {
        groupLabel: "온라인 도슨트",
        href: "/docent",
        items: [
          { label: "1350~1600 르네상스", href: "/docent/renaissance" },
          { label: "1600~1750 바로크", href: "/docent/baroque" },
          { label: "1715~1780 로코코", href: "/docent/rococo" },
          { label: "1750~1850 신고전주의", href: "/docent/neoclassicism" },
          { label: "1795~1837 리전시", href: "/docent/regency" },
          { label: "1837~1901 빅토리아", href: "/docent/victoria" },
          { label: "1890~1920 아르누보", href: "/docent/art-nouveau" },
          { label: "1920~1940 아르데코", href: "/docent/art-deco" },
          { label: "1940~1960 비트 세대", href: "/docent/beat-generation" },
          { label: "1960~1980 반문화", href: "/docent/counterculture" },
          { label: "1960~1980 디지털", href: "/docent/digital" },
        ],
      },
      {
        // EPIC-080: 이름별(50+17개) 동적 라우트를 만드는 대신 그 이름들이
        // 결국 공유하던 실제 게시판(grandmas/grandpas) 링크 하나씩으로
        // 통합 — /heritage/grandmas·/heritage/grandpas는 Page Builder
        // 페이지(hero+quote+board+gallery, 각각 grandmas/grandpas
        // 게시판에 연결됨)로 실제 게시글이 쌓이는 진짜 목적지다.
        groupLabel: "사일로 유산 Heritage",
        href: "/heritage",
        items: [
          { label: "할머니", href: "/heritage/grandmas" },
          { label: "할아버지", href: "/heritage/grandpas" },
        ],
      },
    ],
  },
  {
    key: "salon",
    label: "살롱데상",
    type: "sidebar-right",
    href: "/community",
    groups: [
      {
        groupLabel: "Community",
        href: "/community",
        items: [
          { label: "출석체크 / 예술가의 달력", href: "/attendance" },
          { label: "자유게시판", href: "/community/general" },
          { label: "설문 [우리들 맴]", href: "/polls" },
          { label: "공연 / 전시회 소개", href: "/community/events" },
          { label: "이벤트 공지", href: "/salon/event-notices" },
          { label: "Q&A", href: "/community/qna" },
        ],
      },
      {
        // EPIC-080: 주제/요일 이름을 URL 파라미터로 넘기는 동적 라우트
        // 대신, 라이브 DB와 동일하게 항목마다 고정 slug를 쓴다(Page
        // Builder catch-all이 서빙 — src/app/[...slug]/page.tsx).
        groupLabel: "주제별 클럽 게시판",
        href: "/community/topics",
        items: [
          { label: "예술 Art", href: "/community-topics-art" },
          { label: "심리 Psychology", href: "/community-topics-psychology" },
          { label: "문학 Literature", href: "/community-topics-literature" },
          { label: "세계역사 World History", href: "/community-topics-world-history" },
          { label: "과학 Science", href: "/community-topics-science" },
          { label: "정치 Politics", href: "/community-topics-politics" },
          { label: "경제 Economy", href: "/community-topics-economy" },
          { label: "건강 Health", href: "/community-topics-health" },
          { label: "스포츠 Sports", href: "/community-topics-sports" },
          { label: "코메디 Comedy", href: "/community-topics-comedy" },
          { label: "인간집사들 Human Butlers", href: "/community-topics-pet-owners" },
          { label: "따뜻한 세상 Warm World", href: "/community-topics-warm-world" },
        ],
      },
      {
        groupLabel: "요일별 클럽 모임",
        href: "/community/weekday",
        items: [
          { label: "Mon 월요 반란클럽", href: "/community-weekday-monday" },
          { label: "Tue 낭송 북클럽", href: "/community-weekday-book" },
          { label: "Wed 행간의 조각가들 - 북클럽", href: "/community-weekday-between-lines" },
          { label: "Thurs 영어로 놀자 클럽", href: "/community-weekday-english-play" },
          { label: "Fri 비포 선라이즈 클럽", href: "/community-weekday-before-sunrise" },
          { label: "Sat '무슨일이든 가능' 클럽", href: "/community-weekday-anything-can-happen" },
          { label: "Sun '연극이 끝나고 난 뒤' 클럽", href: "/community-weekday-after-the-play" },
        ],
      },
      {
        groupLabel: "멤버십 Membership",
        href: "/membership",
        items: [
          { label: "나의 보물 이야기", href: "/salon/my-treasure-story" },
          { label: "마음일기", href: "/salon/mind-diary" },
          { label: "나의 아티스트 소개", href: "/salon/artist-intro" },
          { label: "월별 모임 [패트론의 살롱]", href: "/salon/monthly-events" },
          { label: "패트론 게시판", href: "/membership/patron" },
          { label: "한문장 소설 프로젝트", href: "/salon/one-sentence-novel" },
          { label: "비밀의 방 도슨트", href: "/salon/secret-room" },
        ],
      },
      {
        groupLabel: "갤러리 Gallery",
        href: "/gallery",
        items: [
          { label: "시상식", href: "/salon/gallery/awards" },
          { label: "공연들", href: "/salon/gallery/performances" },
          { label: "파티", href: "/salon/gallery/parties" },
          { label: "운명의 방문자들", href: "/salon/gallery/visitors" },
          { label: "패트론들", href: "/salon/gallery/patrons" },
        ],
      },
      {
        groupLabel: "아카이브 Archive",
        href: "/archive",
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
    href: "/studio",
    items: [
      { label: "공간 촬영 대관 (1층 사일로상점)", href: "/rental?floor=1f_silostore" },
      { label: "공간 촬영 대관 (2층 살롱데상)", href: "/rental?floor=2f_salon" },
      { label: "물품 대여", href: "/space-inquiry/item-rental" },
      { label: "공간 스타일링", href: "/space-inquiry/styling" },
    ],
  },
  {
    // EPIC-080: 라이브 DB에서 이 탭이 13개 "My X" 하위 항목을 가진
    // dropdown인 것을 확인 후, 의도된 구조인지 사용자에게 확인 —
    // 의도적으로 원한 구조임을 확인받아(2026-08-06) FALLBACK도 동일하게
    // 맞춘다(이전엔 하위 항목 없는 단순 link 탭이었음).
    key: "mypage",
    label: "마이 페이지 My Page",
    type: "dropdown",
    href: "/mypage",
    items: [
      { label: "My Collections Category", href: "/mypage-collections-category" },
      { label: "My Wishlist", href: "/mypage-wishlist" },
      { label: "My Follow", href: "/mypage-follow" },
      { label: "My Salon", href: "/mypage-salon" },
      { label: "My Docent Certificate", href: "/mypage-docent-certificate" },
      { label: "My Space", href: "/mypage-space" },
      { label: "My Exhibition", href: "/mypage-exhibition" },
      { label: "My Badges", href: "/mypage-badges" },
      { label: "My Comments", href: "/mypage-comments" },
      { label: "My Bucketlist", href: "/mypage-bucketlist" },
      { label: "My Timeline", href: "/mypage-timeline" },
      { label: "My Visitors", href: "/mypage-visitors" },
      { label: "My Mind Diary", href: "/my-mind-diary" },
    ],
  },
];

// EPIC-088: href → page_builder.min_rank_to_read. hrefToSlug은 쿼리스트링을
// 그대로 문자열에 남기므로(예: "/rental?floor=1f_silostore" →
// "rental?floor=1f_silostore") 쿼리 기반 하이브리드 라우트는 애초에 어떤
// slug와도 매칭되지 않아 자연히 게이트 없음으로 취급된다 —
// usePageRankGate가 하이브리드 페이지를 의도적으로 제외하는 것과 같은 결과.
function rankFor(href: string | null, slugToRank: Map<string, number>): number | null {
  if (!href) return null;
  return slugToRank.get(hrefToSlug(href)) ?? null;
}

function buildNavTree(rows: SiteNavRow[], slugToRank: Map<string, number>): NavTab[] {
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
        minRankToRead: rankFor(top.href, slugToRank),
      };
    }

    if (type === "dropdown") {
      // EPIC-079-PHASE-2: sidebar-left/right(아래)와 동일하게 손자(자식의
      // 자식)까지 재귀적으로 읽어 items[].children으로 담는다 — 이전엔
      // byParent.get(top.id)까지만 읽어 새 최상위 카테고리의 서브카테고리가
      // 드롭다운에 아예 나타나지 않았다(사이드바는 group.items로 정상 출력).
      const items = (byParent.get(top.id) ?? []).map((i) => {
        const children = (byParent.get(i.id) ?? []).map((c) => ({
          label: c.title,
          href: c.href ?? "#",
          minRankToRead: rankFor(c.href, slugToRank),
        }));
        return {
          label: i.title,
          href: i.href ?? "#",
          children: children.length > 0 ? children : undefined,
          minRankToRead: rankFor(i.href, slugToRank),
        };
      });
      // EPIC-058: 드롭다운 트리거(예: 스튜디오) 자체도 href가 있으면 Hub
      // Page로 이동하는 링크가 된다 — 없으면(기존처럼) 클릭 불가한 버튼.
      return {
        key: top.key ?? top.id,
        label: top.title,
        type,
        href: top.href ?? undefined,
        items,
        minRankToRead: rankFor(top.href ?? null, slugToRank),
      };
    }

    // sidebar-left / sidebar-right: 자식은 그룹, 손자는 항목
    const groupRows = byParent.get(top.id) ?? [];
    const groups: NavGroup[] = groupRows.map((g) => ({
      groupLabel: g.title,
      // EPIC-058: 그룹 헤더도 href가 있으면 Hub Page 링크가 된다.
      href: g.href ?? undefined,
      items: (byParent.get(g.id) ?? []).map((i) => ({
        label: i.title,
        href: i.href ?? "#",
        minRankToRead: rankFor(i.href, slugToRank),
      })),
      minRankToRead: rankFor(g.href ?? null, slugToRank),
    }));
    // EPIC-084: top.href가 드롭다운/link 타입처럼 여기서도 누락되고 있었다
    // — DB(site_navigations)에는 사일로상점(/shop)/살롱데상(/community)
    // href가 이미 들어있었는데 buildNavTree가 sidebar-left/right 분기에서만
    // 이 필드를 조립 결과에 담지 않아, 상단 탭 클릭도 사이드바 패널 헤더
    // 클릭도 전부 무반응이었다(Navbar.tsx/LeftSidebar.tsx/RightSidebar.tsx는
    // 모두 tab.href 유무로 Link/버튼을 분기하므로 이 한 줄이 원인).
    return {
      key: top.key ?? top.id,
      label: top.title,
      type,
      href: top.href ?? undefined,
      groups,
      minRankToRead: rankFor(top.href ?? null, slugToRank),
    };
  });
}

// site_navigations(EPIC-023)에서 활성 상태인 탭/그룹/항목을 조회해 트리로 조립한다.
// 실패하거나 아직 시드가 적용되지 않은 경우 FALLBACK_NAV_TABS를 반환한다.
export async function fetchNavTabs(): Promise<NavTab[]> {
  const [navResult, rankResult] = await Promise.all([
    supabase
      .from("site_navigations")
      .select("id, key, title, href, parent_id, target_type")
      .eq("is_active", true)
      .order("sort_order", { ascending: true }),
    // EPIC-088: 메뉴별 티어 접근 제어 — 게이트가 걸린(min_rank_to_read가
    // null이 아닌) 페이지만 조회해 slug → rank 맵을 만든다(게이트 없는
    // 페이지는 조회할 필요가 없다).
    supabase.from("page_builder").select("slug, min_rank_to_read").not("min_rank_to_read", "is", null),
  ]);
  const { data, error } = navResult;

  if (error || !data || data.length === 0) {
    return FALLBACK_NAV_TABS;
  }

  const slugToRank = new Map<string, number>(
    ((rankResult.data ?? []) as { slug: string; min_rank_to_read: number }[]).map((p) => [
      p.slug,
      p.min_rank_to_read,
    ]),
  );

  return buildNavTree(data as SiteNavRow[], slugToRank);
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
