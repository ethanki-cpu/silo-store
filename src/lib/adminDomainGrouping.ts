// EPIC-072: 관리자 CMS(페이지 관리/게시판 관리/전체 글 관리)를 사이트의
// 4대 핵심 도메인(사일로상점/살롱데상/스튜디오/마이페이지) 기준으로
// 일관되게 분류하기 위한 공용 유틸리티. "메뉴/카테고리 관리"는 이미
// site_navigations 트리로 도메인이 명확한데, 나머지 3개 CMS 화면은
// 평면 목록이라 한눈에 어느 도메인인지 알기 어렵다는 요청으로 신설.
//
// 이 프로젝트에는 "도메인" 자체를 저장하는 컬럼이 없다(boards.group_key는
// 더 세분화된 9종 허브 키, page_builder에는 아예 없음) — 그래서 (1)
// group_key가 있으면 그 값을 도메인으로 승격하고, (2) 없으면(대부분의
// 게시판) category/slug 키워드로 최선의 추정을 한다. 완벽한 정본이
// 아니라 "관리자가 한눈에 훑어보기 위한" 분류라는 점을 감안할 것 — 새
// 카테고리/게시판을 추가했는데 여기 안 잡히면 아래 테이블에 추가한다.

// EPIC-096 후속(사용자 신고, 2026-08-12): EPIC-095가 라이브 site_navigations를
// 재조사해 "About Silo"(최상위 신설 탭)와 "온라인 도슨트"(예전엔 사일로상점
// 하위 그룹이라는 잘못된 전제였는데 실제로는 이미 독립 최상위 탭)를
// 확인했는데, 이 파일의 4대 도메인 분류는 그 발견 이전 상태(EPIC-072)에
// 머물러 있었다 — "About Silo"/"온라인 도슨트" 소속 게시판/게시글이 전부
// "공통/기타"로 떨어지고, 전체 글 관리에 그 둘만을 위한 탭도 없어서 사실상
// 안 보였다. 라이브 최상위 탭 6개(About Silo/사일로상점/온라인도슨트/
// 살롱데상/스튜디오/마이페이지) 그대로 6개 도메인으로 맞춘다.
export type AdminDomain = "about_silo" | "silostore" | "docent" | "salon" | "studio" | "mypage" | "common";

export const ADMIN_DOMAIN_ORDER: AdminDomain[] = [
  "about_silo",
  "silostore",
  "docent",
  "salon",
  "studio",
  "mypage",
  "common",
];

export const ADMIN_DOMAIN_LABELS: Record<AdminDomain, string> = {
  about_silo: "About Silo",
  silostore: "사일로상점",
  docent: "온라인 도슨트",
  salon: "살롱데상",
  studio: "스튜디오",
  mypage: "마이페이지",
  common: "공통/기타",
};

// boards.group_key(EPIC-066, populated된 게시판만) → 도메인.
const GROUP_KEY_TO_DOMAIN: Record<string, AdminDomain> = {
  docent: "docent",
  heritage: "silostore",
  silo_store: "silostore",
  community: "salon",
  gallery: "salon",
  membership: "salon",
  archive: "salon",
  studio: "studio",
  mypage: "mypage",
};

// page_builder.slug 접두어(대시로 이어붙인 URL 세그먼트 컨벤션) → 도메인.
// 앞에서부터 먼저 매칭되는 규칙이 우선이다.
const PAGE_SLUG_PREFIXES: { prefixes: string[]; domain: AdminDomain }[] = [
  { prefixes: ["mypage", "me", "u"], domain: "mypage" },
  { prefixes: ["studio", "rental", "space-inquiry"], domain: "studio" },
  { prefixes: ["online-docent", "docent"], domain: "docent" },
  { prefixes: ["about-silo"], domain: "about_silo" },
  { prefixes: ["shop", "treasures", "heritage"], domain: "silostore" },
  {
    prefixes: [
      "community", "salon", "membership", "gallery", "archive", "clubs",
      "attendance", "polls", "event-notices", "monthly-events", "downloads",
    ],
    domain: "salon",
  },
];

export function classifyPageSlug(slug: string): AdminDomain {
  for (const { prefixes, domain } of PAGE_SLUG_PREFIXES) {
    if (prefixes.some((p) => slug === p || slug.startsWith(`${p}-`))) return domain;
  }
  return "common";
}

// boards.category(=slug) → 도메인. group_key가 없는 대부분의 게시판을 위한
// 폴백 — 실제 라이브 category 값 기준으로 작성함(2026-07-30).
const BOARD_CATEGORY_TO_DOMAIN: Record<string, AdminDomain> = {
  // 사일로상점: Treasures, 헤리티지, 도슨트 시대(11개)
  treasures: "silostore",
  "adoption-library": "silostore",
  grandmas: "silostore",
  grandpas: "silostore",
  renaissance: "silostore",
  baroque: "silostore",
  rococo: "silostore",
  neoclassicism: "silostore",
  regency: "silostore",
  victoria: "silostore",
  "art-nouveau": "silostore",
  "art-deco": "silostore",
  "beat-generation": "silostore",
  "counter-culture": "silostore",
  digital: "silostore",

  // 살롱데상: 주제별 클럽 13 + 요일별 클럽 7 + 자유게시판 + 멤버십/갤러리/아카이브/공지
  economy: "salon",
  art: "salon",
  history: "salon",
  science: "salon",
  comedy: "salon",
  literature: "salon",
  health: "salon",
  politics: "salon",
  movie: "salon",
  psychology: "salon",
  sports: "salon",
  pets: "salon",
  warmth: "salon",
  mon: "salon",
  tue: "salon",
  wed: "salon",
  thu: "salon",
  fri: "salon",
  sat: "salon",
  sun: "salon",
  general: "salon",
  patron: "salon",
  promo: "salon",
  awards: "salon",
  performances: "salon",
  parties: "salon",
  "gallery-visitors": "salon",
  patrons: "salon",
  brochure: "salon",
  poster: "salon",
  timeline: "salon",
  "my-treasures": "salon",
  "one-line-novel": "salon",
  "secret-room-docent": "salon",
  "mind-diary": "salon",
  events: "salon",
  notice: "salon",
  "monthly-salon": "salon",
};

export function classifyBoardCategory(
  category: string | null | undefined,
  groupKey?: string | null,
): AdminDomain {
  if (groupKey && GROUP_KEY_TO_DOMAIN[groupKey]) return GROUP_KEY_TO_DOMAIN[groupKey];
  if (category && BOARD_CATEGORY_TO_DOMAIN[category]) return BOARD_CATEGORY_TO_DOMAIN[category];
  return "common";
}
