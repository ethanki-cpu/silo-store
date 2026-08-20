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
  // HOTFIX-137.5(사용자 지시 — "각 요소마다 '드롭다운'이 되게 하는걸
  // 선택할수 있는 기능을 만들고"): "홈페이지 설정 관리"의 탭 Controls
  // 패널에서 site_navigations.target_types를 바로 편집할 수 있게 원본
  // 행의 실제 id와 target_types 배열을 그대로 실어 보낸다 — key는
  // 최상위 탭에만 있고(없으면 id로 대체) update 쿼리는 id로 걸어야
  // 모호하지 않다.
  id?: string;
  targetTypes?: DbTargetType[];
  // EPIC-138(사용자 지시): "1단 상단탭"/"2단 상단탭"을 이 카테고리가
  // 상단 탭 줄 중 어디에 나타날지 직접 고르는 target_types 값으로
  // 옮겼다(예전엔 /admin/navigation/settings의 별도 tier 설정이었음) —
  // 둘 다 선택되면 두 줄 모두에 나타난다. 둘 다 선택 안 하면(사이드바
  // 전용 패널이거나 사용자 메뉴 전용인 카테고리) 상단 탭 줄에는 아예
  // 나타나지 않는다. Navbar.tsx가 이 배열로 tier1Tabs/tier2Tabs를
  // 직접 필터링한다. 없으면(예: FALLBACK_NAV_TABS 스냅샷) 예전 기본값과
  // 동일하게 [2]로 취급한다.
  tiers?: (1 | 2)[];
};

// DB(site_navigations)의 target_types 값(복수) ↔ 기존 NavTabType 매핑.
// EPIC-138: 예전엔 카테고리 하나가 target_type 하나만 가졌다(배타적) —
// 이제 여러 플래그를 동시에 선택할 수 있다. 이 파일이 담당하는 "탭 하나의
// 모양"(NavTabType: link/dropdown/sidebar-left/sidebar-right)은 그 중
// dropdown/sidebar_left/sidebar_right 세 플래그로만 결정하고(우선순위
// sidebar_left > sidebar_right > dropdown > 아무것도 없으면 flat link),
// tier1_tab/tier2_tab/user_menu는 "모양"과 무관한 별개의 노출 위치라
// NavTab.tiers와 buildNavTree()가 별도로 만드는 userMenuItems로 갈린다.
export type DbTargetType =
  | "tier1_tab"
  | "tier2_tab"
  | "dropdown"
  | "sidebar_left"
  | "sidebar_right"
  | "user_menu";

function mapTargetTypes(types: DbTargetType[]): NavTabType {
  if (types.includes("sidebar_left")) return "sidebar-left";
  if (types.includes("sidebar_right")) return "sidebar-right";
  if (types.includes("dropdown")) return "dropdown";
  return "link";
}

function tiersOf(types: DbTargetType[]): (1 | 2)[] {
  const tiers: (1 | 2)[] = [];
  if (types.includes("tier1_tab")) tiers.push(1);
  if (types.includes("tier2_tab")) tiers.push(2);
  return tiers;
}

type SiteNavRow = {
  id: string;
  key: string | null;
  title: string;
  href: string | null;
  parent_id: string | null;
  target_types: DbTargetType[];
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
// EPIC-095(요구사항 1.1): Management API로 라이브 site_navigations(전체
// 119개 활성 행)를 재조회해 이 스냅샷을 다시 생성 — 2026-08-06 이후
// 라이브 쪽이 이 파일과 무관하게 계속 진화해(About Silo 최상위 탭 신설,
// 사일로상점/살롱데상 href가 /shop·/community에서 /silo-store·
// /salon-des-cent로 변경, "온라인 도슨트" 하위 트리가 /docent/<era> 평면
// 구조에서 /online-docent/<시대구간>/<era> 2단 구조로 재편 등) 이 파일이
// 상당히 뒤처져 있었다(Data Drift). 아래 배열은 수작업이 아니라
// scratchpad 스크립트로 buildNavTree()와 동일한 매핑 로직을 그대로 재구현해
// 라이브 덤프에서 기계적으로 생성했다(오타/누락 방지).
export const FALLBACK_NAV_TABS_SYNCED_AT = "2026-08-12";

// site_navigations를 DB에서 아직 읽지 못했을 때(최초 로딩 중, 네트워크 실패 등)
// 화면에 아무 탭도 뜨지 않는 것을 막기 위한 폴백. SSoT는 항상
// site_navigations 테이블 — 이 배열은 그 트리의 스냅샷일 뿐이다.
const FALLBACK_NAV_TABS: NavTab[] = [
  {
    key: "877a1576-9612-420d-9a99-fb7d48320e3f",
    label: "About Silo",
    type: "dropdown",
    href: "/about-silo",
    items: [
      {
        label: "Silo Timeline 사일로 타임라인",
        href: "/about-silo/silo-timeline",
      },
      {
        label: "Silo daily 사일로의 하루들",
        href: "/about-silo/silo-daily",
      },
      {
        label: "수미의 good n book n ",
        href: "/about-silo/sumi-good-n-book-n",
      },
      {
        label: "에단의 블루노트 bluenotes",
        href: "/about-silo/ethan-bluenotes",
      },
      {
        label: "사일로의 취향 Silo's Favorites",
        href: "/about-silo/silo-favorites",
        children: [
          {
            label: "사일로의 플레이리스트 Playlists",
            href: "/about-silo/silo-favorites/silo-playlists",
          },
          {
            label: "사일로의 맛집 Restaurants",
            href: "/about-silo/silo-favorites/silo-restaurants",
          },
          {
            label: "사일로의 전시 Exhibitions",
            href: "/about-silo/silo-favorites/silo-exhibitions",
          },
          {
            label: "사일로의 책 Book Reviews",
            href: "/about-silo/silo-favorites/silo-book-reviews",
          },
          {
            label: "사일로의 장소 Places",
            href: "/about-silo/silo-favorites/silo-places",
          },
          {
            label: "사일로의 아이템들 items",
            href: "/about-silo/silo-favorites/silo-items",
          },
        ],
      },
    ],
  },
  {
    key: "silostore",
    label: "사일로 상점 Silo Store",
    type: "sidebar-left",
    href: "/silo-store",
    groups: [
      {
        groupLabel: "사일로 보물들",
        href: "/silo-store/treasures",
        items: [],
      },
      {
        groupLabel: "사일로의 뮤즈 silo's muses",
        href: "/silo-store/treasures/silo-muse",
        items: [],
      },
      {
        groupLabel: "사일로의 천사들 Silo Angels",
        href: "/silo-store/treasures/silo-angels",
        items: [],
      },
      {
        groupLabel: "보내기 전 마지막 사진 last photos",
        href: "/silo-store/treasures/last-photos",
        items: [],
      },
      {
        groupLabel: "입양신청서 라이브러리",
        href: "/silo-store/treasures/shop-adoption-library",
        items: [],
      },
      {
        groupLabel: "입양 이후 After Adoption",
        href: "/silo-store/treasures/after-adoption",
        items: [],
      },
      {
        groupLabel: "Silo's Original Owners 사일로의 원래 주인들",
        href: "/silo-original-owners",
        items: [
          {
            label: "할머니 Grandmas",
            href: "/silo-store/heritage/grandmas",
          },
          {
            label: "할아버지 Grandpas",
            href: "/silo-store/heritage/grandpas",
          },
        ],
      },
    ],
  },
  {
    key: "docent",
    label: "온라인 도슨트 Online Docent",
    type: "dropdown",
    href: "/online-docent",
    items: [
      {
        label: "고대 ~ 왕정 Ancient ~ Monarchy ",
        href: "/online-docent/ancient-monarchy",
        children: [
          {
            label: "BC 1100~146 그리스 Greeks",
            href: "/online-docent/ancient-monarchy/greeks",
          },
          {
            label: "1350~1600 르네상스 Renaissance",
            href: "/online-docent/ancient-monarchy/renaissance",
          },
          {
            label: "1600~1750 바로크 Baroque",
            href: "/online-docent/ancient-monarchy/baroque",
          },
          {
            label: "1715~1780 로코코 Rococo",
            href: "/online-docent/ancient-monarchy/rococo",
          },
        ],
      },
      {
        label: "혁명 ~ 제국 Revolution ~ Empire",
        href: "/online-docent/revolution-empire",
        children: [
          {
            label: "1750~1850 신고전주의 NeoClassicism",
            href: "/online-docent/revolution-empire/neoclassicism",
          },
          {
            label: "1795~1837 리전시 Regency",
            href: "/online-docent/revolution-empire/regency",
          },
          {
            label: "1837~1901 빅토리안 Victorian",
            href: "/online-docent/revolution-empire/victoria",
          },
          {
            label: "1860~1890 인상파 Impressionism",
            href: "/online-docent/revolution-empire/impressionism",
          },
        ],
      },
      {
        label: "프로이트~ 인공지능 Freud~A.I.",
        href: "/online-docent/freud-ai",
        children: [
          {
            label: "1890~1920 아르누보 Art Nouveau",
            href: "/online-docent/freud-ai/art-nouveau",
          },
          {
            label: "1920~1940 아르데코 Art Deco",
            href: "/online-docent/freud-ai/art-deco",
          },
          {
            label: "1940~1960 비트 세대 Beat Generation",
            href: "/online-docent/freud-ai/beat-generation",
          },
          {
            label: "1960~1980 반문화 CounterCulture",
            href: "/online-docent/freud-ai/counterculture",
          },
          {
            label: "1980~2000 대중 문화 Pop Culture",
            href: "/online-docent/freud-ai/pop-culture",
          },
        ],
      },
      {
        label: "2020~현재, 디지털 문화 digital culture",
        href: "/online-docent/freud-ai/digital-culture",
      },
    ],
  },
  {
    key: "salon",
    label: "살롱데상 Salon des Cent",
    type: "sidebar-right",
    href: "/salon-des-cent",
    groups: [
      {
        groupLabel: "커뮤니티 Community",
        href: "/salon-des-cent/community",
        items: [
          {
            label: "출석체크 / 예술가의 달력",
            href: "/salon-des-cent/community/attendance",
          },
          {
            label: "자유게시판",
            href: "/salon-des-cent/community/general",
          },
          {
            label: "나의 맛집들",
            href: "/salon-des-cent/community/my-restaurants",
          },
          {
            label: "설문 [우리들 맴]",
            href: "/salon-des-cent/community/polls",
          },
          {
            label: "공연 / 전시회 소개",
            href: "/salon-des-cent/community/events",
          },
          {
            label: "이벤트 공지",
            href: "/salon-des-cent/community/event-notices",
          },
          {
            label: "Q&A",
            href: "/salon-des-cent/community/qna",
          },
        ],
      },
      {
        groupLabel: "주제별 클럽 게시판 A",
        href: "/salon-des-cent/community/topics-A",
        items: [
          {
            label: "예술 Art",
            href: "/salon-des-cent/community/topics-A/art",
          },
          {
            label: "심리 Psychology",
            href: "/salon-des-cent/community/topics-A/-psychology",
          },
          {
            label: "문학 Literature",
            href: "/salon-des-cent/community/topics-A/literature",
          },
          {
            label: "세계역사 World History",
            href: "/salon-des-cent/community/topics-A/world-history",
          },
          {
            label: "과학 Science",
            href: "/salon-des-cent/community/topics-A/science",
          },
          {
            label: "경제 Economy",
            href: "/salon-des-cent/community/topics-A/economy",
          },
          {
            label: "정치 Politics",
            href: "/salon-des-cent/community/topics-A/politics",
          },
        ],
      },
      {
        groupLabel: "주제별 클럽 게시판 B",
        href: "/salon-des-cent/community/topics-B",
        items: [
          {
            label: "영화 & 시리즈 Movies & Series",
            href: "/salon-des-cent/community/topics-B/movies-series",
          },
          {
            label: "스포츠 Sports",
            href: "/salon-des-cent/community/topics-B/sports",
          },
          {
            label: "건강 Health",
            href: "/salon-des-cent/community/topics-B/health",
          },
          {
            label: "코메디 Comedy",
            href: "/salon-des-cent/community/topics-B/comedy",
          },
          {
            label: "따뜻한 세상 Warm World",
            href: "/salon-des-cent/community/topics-B/warm-world",
          },
          {
            label: "패션 Fashion",
            href: "/salon-des-cent/community/topics-B/fashion",
          },
          {
            label: "인간집사들 Human Butlers",
            href: "/salon-des-cent/community/topics-B/human-butlers",
          },
        ],
      },
      {
        groupLabel: "요일별 클럽 모임",
        href: "/salon-des-cent/community/daily-club",
        items: [
          {
            label: "Mon 월요 반란클럽",
            href: "/salon-des-cent/community/daily-club/monday",
          },
          {
            label: "Tue 낭송 북클럽",
            href: "/salon-des-cent/community/daily-club/read-book-aloud",
          },
          {
            label: "Wed 행간의 조각가들 - 북클럽",
            href: "/salon-des-cent/community/daily-club/sentence-sculptors",
          },
          {
            label: "Thurs 영어로 놀자 클럽",
            href: "/salon-des-cent/community/daily-club/play-with-English",
          },
          {
            label: "Fri 비포 선라이즈 클럽",
            href: "/salon-des-cent/community/daily-club/before-sunrise",
          },
          {
            label: "Sat '무슨일이든 가능' 클럽",
            href: "/salon-des-cent/community/daily-club/anything-can-happen",
          },
          {
            label: "Sun '연극이 끝나고 난 뒤' 클럽",
            href: "/community-weekday-after-the-play",
          },
        ],
      },
      {
        groupLabel: "멤버십 Membership",
        href: "/salon-des-cent/community/membership",
        items: [
          {
            label: "나의 보물 이야기들",
            href: "/salon-des-cent/community/membership/my-treasure-stories",
          },
          {
            label: "나의 마음일기들",
            href: "/salon-des-cent/community/membership/mind-diary",
          },
          {
            label: "나의 아티스트 소개들",
            href: "/salon-des-cent/community/membership/artist-intro",
          },
          {
            label: "월별 모임 [패트론의 살롱]",
            href: "/salon-des-cent/community/membership/patrons-salon",
          },
          {
            label: "패트론 게시판",
            href: "/salon-des-cent/community/membership/patrons-board",
          },
          {
            label: "한문장 소설 프로젝트",
            href: "/salon-des-cent/community/membership/one-sentence-novel",
          },
          {
            label: "비밀의 방 도슨트",
            href: "/salon-des-cent/community/membership/secret-room",
          },
        ],
      },
      {
        groupLabel: "갤러리 Gallery",
        href: "/salon-des-cent/community/gallery",
        items: [
          {
            label: "연말 시상식",
            href: "/salon-des-cent/community/gallery/awards-ceremony",
          },
          {
            label: "살롱데상 공연들",
            href: "/salon-des-cent/community/gallery/performances",
          },
          {
            label: "살롱데상 파티들",
            href: "/salon-des-cent/community/gallery/parties",
          },
          {
            label: "운명의 방문자들",
            href: "/salon-des-cent/community/gallery/fateful-visitors",
          },
          {
            label: "역대 패트론들",
            href: "/salon-des-cent/community/gallery/patrons",
          },
        ],
      },
      {
        groupLabel: "아카이브 Archives",
        href: "/salon-des-cent/community/archives",
        items: [
          {
            label: "미디어 / 기사들 Media & Articles",
            href: "/salon-des-cent/community/archives/media-articles",
          },
          {
            label: "소개지 brochures",
            href: "/salon-des-cent/community/archives/downloads",
          },
          {
            label: "포스터들 posters",
            href: "/salon-des-cent/community/archive/posters",
          },
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
      {
        label: "공간 촬영 대관 (1층 사일로상점)",
        href: "/studio/rental_1f_silostore",
      },
      {
        label: "공간 촬영 대관 (2층 살롱데상)",
        href: "/studio/rental_2f_salon",
      },
      {
        label: "물품 대여 Items Rental",
        href: "/studio/items-rental",
      },
      {
        label: "공간 스타일링 Space Styling",
        href: "/studio/space-styling",
      },
    ],
  },
  {
    key: "mypage",
    label: "마이 페이지 My Page",
    type: "dropdown",
    href: "/mypage",
    items: [
      {
        label: "My Collections 나의 수집품들",
        href: "/mypage/my-collections",
        children: [
          {
            label: "My Treasures 나의 보물",
            href: "/mypage/my-collections/mytreasures",
          },
          {
            label: "My Books 나의 책",
            href: "/mypage/my-collections/mybooks",
          },
          {
            label: "My Movies 나의 영화",
            href: "/mypage/my-collections/mymovies",
          },
          {
            label: "My Musics 나의 음악",
            href: "/mypage/my-collections/mymusics",
          },
          {
            label: "My Artists 나의 아티스트",
            href: "/mypage/my-collections/myartists",
          },
          {
            label: "My Places 나의 장소",
            href: "/mypage/my-collections/myplaces",
          },
          {
            label: "My Scents 나의 향기",
            href: "/mypage/my-collections/myscents",
          },
          {
            label: "My Brands 나의 브랜드",
            href: "/mypage/my-collections/mybrands",
          },
        ],
      },
      {
        label: "My Silo Timeline 나의사일로 타임라인",
        href: "/mypage/my-silo-timeline",
        children: [
          {
            label: "My Badges 나의 뱃지",
            href: "/mypage/my-silo-timeline/badges",
          },
          {
            label: "My Likes 나의 좋아요",
            href: "/mypage/my-silo-timelines/my-likes",
          },
          {
            label: "My Writings 내가 쓴 글",
            href: "/mypage/my-silo-timeline/my-writings",
          },
          {
            label: "My Comments 나의 댓글",
            href: "/mypage/my-silo-timeline/my-comments",
          },
          {
            label: "My Follows 나의 팔로우",
            href: "/mypage/my-silo-timeline/my-follows",
          },
          {
            label: "My Visitors 나를 방문한 사람",
            href: "/mypage/my-silo-timeline/my-visitors",
          },
        ],
      },
      {
        label: "My Story 나의 이야기",
        href: "/mypage/my-story",
        children: [
          {
            label: "My Exhibition 나의 전시회",
            href: "/mypage/my-story/my-exhibition",
          },
          {
            label: "My Bucketlist 나의 버킷리스트",
            href: "/mypage/my-story/my-bucketlist",
          },
          {
            label: "My Wishlist 나의 위시리스트",
            href: "/mypage/my-story/wishlist",
          },
          {
            label: "My Space 나의 공간",
            href: "/mypage/my-story/my-space",
          },
          {
            label: "My Mind Diary 나의 마음 일기장",
            href: "/mypage/my-story/my-mind-diary",
          },
        ],
      },
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

// EPIC-138: fetchNavTabs()가 예전엔 NavTab[] 하나만 돌려줬는데, "사용자
// 메뉴"(마이페이지 드롭다운 안)에 노출되는 카테고리는 상단 탭 줄/사이드바와
// 완전히 다른 자리라 NavTab 모양(link/dropdown/sidebar-left/sidebar-right)
// 으로 표현할 수 없다 — 평범한 NavItem 목록으로 별도로 반환한다.
export type NavData = { tabs: NavTab[]; userMenuItems: NavItem[] };

function buildNavTree(rows: SiteNavRow[], slugToRank: Map<string, number>): NavData {
  const byParent = new Map<string | null, SiteNavRow[]>();
  for (const row of rows) {
    const list = byParent.get(row.parent_id) ?? [];
    list.push(row);
    byParent.set(row.parent_id, list);
  }

  const topRows = byParent.get(null) ?? [];

  const tabs = topRows.map((top) => {
    const type = mapTargetTypes(top.target_types);
    const tiers = tiersOf(top.target_types);

    if (type === "link") {
      return {
        key: top.key ?? top.id,
        label: top.title,
        type,
        href: top.href ?? "#",
        minRankToRead: rankFor(top.href, slugToRank),
        tiers,
        id: top.id,
        targetTypes: top.target_types,
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
        tiers,
        id: top.id,
        targetTypes: top.target_types,
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
      tiers,
      id: top.id,
      targetTypes: top.target_types,
    };
  });

  // EPIC-138: "사용자 메뉴"로 태그된 최상위 카테고리 — 계정 영역의
  // "마이페이지" 드롭다운(UserMenuDropdown.tsx)에 상단 탭/사이드바와
  // 완전히 독립적으로 노출된다. 하위 항목(children)은 이 자리에서는
  // 다루지 않는다(단순 링크 목록 자리라 서브메뉴 depth를 지원하지 않음).
  const userMenuItems: NavItem[] = topRows
    .filter((top) => top.target_types.includes("user_menu"))
    .map((top) => ({
      label: top.title,
      href: top.href ?? "#",
      minRankToRead: rankFor(top.href, slugToRank),
    }));

  return { tabs, userMenuItems };
}

// site_navigations(EPIC-023)에서 활성 상태인 탭/그룹/항목을 조회해 트리로 조립한다.
// 실패하거나 아직 시드가 적용되지 않은 경우 FALLBACK_NAV_TABS를 반환한다.
export async function fetchNavTabs(): Promise<NavData> {
  const [navResult, rankResult] = await Promise.all([
    supabase
      .from("site_navigations")
      .select("id, key, title, href, parent_id, target_types")
      .eq("is_active", true)
      .order("sort_order", { ascending: true }),
    // EPIC-088: 메뉴별 티어 접근 제어 — 게이트가 걸린(min_rank_to_read가
    // null이 아닌) 페이지만 조회해 slug → rank 맵을 만든다(게이트 없는
    // 페이지는 조회할 필요가 없다).
    supabase.from("page_builder").select("slug, min_rank_to_read").not("min_rank_to_read", "is", null),
  ]);
  const { data, error } = navResult;

  if (error || !data || data.length === 0) {
    return { tabs: FALLBACK_NAV_TABS, userMenuItems: [] };
  }

  const slugToRank = new Map<string, number>(
    ((rankResult.data ?? []) as { slug: string; min_rank_to_read: number }[]).map((p) => [
      p.slug,
      p.min_rank_to_read,
    ]),
  );

  return buildNavTree(data as SiteNavRow[], slugToRank);
}

// EPIC-095: 두 번째 인자(category 쿼리)로 /docent를 salon/silostore 중
// 하나로 흉내내던 마지막 분기를 제거하면서 더 이상 아무 데도 안 쓰여
// 시그니처에서 뺐다 — 호출부(Navbar.tsx)도 함께 정리.
export function getActiveNavTabKey(pathname: string): string | null {
  if (pathname.startsWith("/shop")) return "silostore";

  // EPIC-095(요구사항 1.1): 라이브 site_navigations 재조사 결과 "온라인
  // 도슨트"는 이미 parent_id=null인 완전히 독립된 최상위 탭이었다(사일로상점
  // 하위 그룹이라는 옛 전제가 코드/문서 쪽 드리프트였음) — key가 비어있어
  // (null) 이 함수가 그 탭을 인식 못 하고 있었던 것도 함께 확인해 라이브에서
  // key='docent'로 채웠다. 두 경로 모두 이 탭으로 매핑한다: /docent(구
  // 콘텐츠 구매형 도슨트, docent_contents 테이블 기반)와 /online-docent
  // (이 탭 자체의 href — 라이브 site_navigations 트리가 이미 이 slug로
  // 재구성되어 있었다, Page Builder catch-all로 서빙).
  if (pathname.startsWith("/docent") || pathname.startsWith("/online-docent")) {
    return "docent";
  }

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

  if (pathname.startsWith("/mypage")) return "mypage";

  return null;
}
