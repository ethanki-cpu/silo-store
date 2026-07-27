// Board Definition System (EPIC-047/048): 게시판마다 화면/API를 새로
// 만드는 대신, 이 파일의 config 하나만 보고 BoardRenderer + 관련 API
// 라우트가 동작을 결정한다. 새 게시판 "종류"를 추가할 때는 (1) DB
// `boards` 테이블에 해당 board_type/category(slug)의 행을 시딩하고 (2)
// 여기에 BoardDefinition 항목 하나만 추가하면 되고, 페이지/컴포넌트
// 코드는 건드릴 필요가 없다 — 다만 지금 이 저장소의 `boards.board_type`은
// 등급/쓰기 권한 판정에도 쓰이는 축이라(src/lib/serverAuth.ts), 실제
// 읽기/쓰기 인가는 여전히 serverAuth.ts의 canReadBoard/canWriteToBoard가
// 최종 권한자다 — 이 파일의 `membership`/`allowPosting`은 UI 표시(잠금
// 안내 문구 등)와 API의 2차 게이팅용이지, 보안 최종 판정을 대체하지 않는다.

export type SortOption = "latest" | "popular" | "views" | "comments" | "oldest";

export function isSortOption(value: string | null): value is SortOption {
  return (
    value === "latest" ||
    value === "popular" ||
    value === "views" ||
    value === "comments" ||
    value === "oldest"
  );
}

export const SORT_OPTIONS: { value: SortOption; label: string }[] = [
  { value: "latest", label: "최신순" },
  { value: "popular", label: "인기순" },
  { value: "views", label: "조회순" },
  { value: "comments", label: "댓글순" },
  { value: "oldest", label: "오래된순" },
];

export type BoardPost = {
  id: string;
  title: string | null;
  body: string | null;
  is_docent_post: boolean;
  is_best: boolean;
  like_count: number;
  view_count: number | null;
  comment_count: number;
  photo_url: string | null;
  tags: string[] | null;
  author_id: string;
  author_name: string;
  created_at: string;
  updated_at?: string;
  is_answered?: boolean;
};

export type BoardLayoutType = "community" | "story" | "gallery" | "hub";

export type BoardDefinition = {
  id: string;
  slug: string;
  title_ko: string;
  title_en: string;
  parent: string | null;
  boardType: BoardLayoutType;
  visibility: "public" | "private";
  membership: number; // 이 그룹의 최소 열람 등급(0=전체 공개) — 표시/안내용, 실제 인가는 serverAuth.ts
  searchable: boolean;
  pageable: boolean;
  sortable: boolean;
  thumbnail: boolean;
  comments: boolean;
  likes: boolean;
  bookmarks: boolean;
  tags: boolean;
  allowPosting: boolean;
  defaultSort: SortOption;
  pageSize: number;
  description: string;
};

// hub 레이아웃이 화면에 보여줄 종합 피드(최신글/인기글/추천글) 한 건.
export type HubFeedItem = {
  id: string;
  board_id: string;
  board_name: string;
  title: string | null;
  like_count: number;
  author_name: string;
  created_at: string;
};

export type HubFeed = {
  latest: HubFeedItem[];
  popular: HubFeedItem[];
  recommended: HubFeedItem[];
};

// hub 하단 "하위 게시판 카드"에 쓰이는 자식 게시판 요약 정보.
export type HubChildBoard = {
  id: string;
  name: string;
  locked: boolean;
  lockMessage: string | null;
};

// =====================================================================
// 그룹 단위 정의(EPIC-047 Part 1/2) — 기존 8개 board_type 그룹
// =====================================================================

// 현재 `boards.board_type`(8종) + "topic"의 category==='general' 분기를
// 그대로 키로 사용 — 기존 boards/page.tsx의 하드코딩된 GROUP_LABELS 배열이
// 정확히 이 8개 그룹으로 나누고 있었기 때문에(그 배열을 이 config로
// 대체), 실제 데이터 구조/그룹 개수는 바꾸지 않았다.
export type BoardGroupKey =
  | "general"
  | "topic"
  | "group"
  | "patron"
  | "artist_promo"
  | "adoption_story"
  | "archive"
  | "qna";

export const BOARD_GROUP_ORDER: BoardGroupKey[] = [
  "general",
  "topic",
  "group",
  "patron",
  "artist_promo",
  "adoption_story",
  "archive",
  "qna",
];

export const BOARD_DEFINITIONS: Record<BoardGroupKey, BoardDefinition> = {
  general: {
    id: "general",
    slug: "general",
    title_ko: "자유게시판",
    title_en: "General",
    parent: "community",
    boardType: "community",
    visibility: "public",
    membership: 0,
    searchable: true,
    pageable: true,
    sortable: true,
    thumbnail: false,
    comments: true,
    likes: true,
    bookmarks: true,
    tags: true,
    allowPosting: true,
    defaultSort: "latest",
    pageSize: 10,
    description: "누구나 자유롭게 글을 쓰는 자유게시판",
  },
  topic: {
    id: "topic",
    slug: "topic",
    title_ko: "클럽 주제 게시판",
    title_en: "Club Topics",
    parent: "community",
    boardType: "community",
    visibility: "public",
    membership: 0,
    searchable: true,
    pageable: true,
    sortable: true,
    thumbnail: false,
    comments: true,
    likes: true,
    bookmarks: true,
    tags: true,
    allowPosting: true,
    defaultSort: "latest",
    pageSize: 10,
    description: "클럽별 주제 토론 게시판",
  },
  group: {
    id: "group",
    slug: "group",
    title_ko: "모임별 게시판",
    title_en: "Club Groups",
    parent: "community",
    boardType: "community",
    visibility: "public",
    membership: 0,
    searchable: true,
    pageable: true,
    sortable: true,
    thumbnail: false,
    comments: true,
    likes: true,
    bookmarks: true,
    tags: true,
    allowPosting: true,
    defaultSort: "latest",
    pageSize: 10,
    description: "요일별 클럽 모임방 게시판",
  },
  patron: {
    id: "patron",
    slug: "patron",
    title_ko: "패트론 전용",
    title_en: "Patron Lounge",
    parent: "community",
    boardType: "community",
    visibility: "private",
    membership: 3,
    searchable: true,
    pageable: true,
    sortable: true,
    thumbnail: false,
    comments: true,
    likes: true,
    bookmarks: true,
    tags: true,
    allowPosting: true,
    defaultSort: "latest",
    pageSize: 10,
    description: "패트론 등급부터 열람 가능한 라운지",
  },
  artist_promo: {
    id: "artist_promo",
    slug: "artist_promo",
    title_ko: "아티스트 홍보",
    title_en: "Artist Promo",
    parent: "community",
    boardType: "community",
    visibility: "public",
    membership: 0,
    searchable: true,
    pageable: true,
    sortable: true,
    thumbnail: false,
    comments: true,
    likes: true,
    bookmarks: true,
    tags: true,
    allowPosting: true,
    defaultSort: "latest",
    pageSize: 10,
    description: "Artist 등급 회원의 홍보 게시판(열람은 누구나 가능)",
  },
  adoption_story: {
    id: "adoption_story",
    slug: "adoption_story",
    title_ko: "After Adoption",
    title_en: "After Adoption",
    parent: "story",
    boardType: "story",
    visibility: "public",
    membership: 0,
    searchable: true,
    pageable: true,
    sortable: true,
    thumbnail: true,
    comments: true,
    likes: true,
    bookmarks: true,
    tags: true,
    allowPosting: true,
    defaultSort: "latest",
    pageSize: 10,
    description: "분양(구매/대여) 후 이야기를 나누는 카드형 게시판",
  },
  archive: {
    id: "archive",
    slug: "archive",
    title_ko: "자료게시판",
    title_en: "Archive",
    parent: "gallery",
    boardType: "gallery",
    visibility: "public",
    membership: 0,
    searchable: true,
    pageable: true,
    sortable: true,
    thumbnail: true,
    comments: true,
    likes: true,
    bookmarks: true,
    tags: true,
    allowPosting: true,
    defaultSort: "latest",
    pageSize: 20,
    description: "이미지/첨부 위주의 자료 게시판",
  },
  qna: {
    id: "qna",
    slug: "qna",
    title_ko: "질문과 답변",
    title_en: "Q&A",
    parent: "community",
    boardType: "community",
    visibility: "public",
    membership: 0,
    searchable: true,
    pageable: true,
    sortable: true,
    thumbnail: false,
    comments: true,
    likes: true,
    bookmarks: true,
    tags: false,
    allowPosting: true,
    defaultSort: "latest",
    pageSize: 10,
    description: "질문과 답변 게시판(자유 태그 없이 답변 완료 여부만 표시)",
  },
};

// /boards(게시판 디렉토리)는 특정 board_type이 아니라 하위 게시판 전체를
// 종합하는 네 번째 레이아웃("hub")이라 BOARD_DEFINITIONS 맵에 넣지 않고
// 별도 상수로 둔다. 이번 EPIC(048)에서 만든 3개 하위 hub(Silo Store/
// Online Docent/Heritage)와 구분하기 위해 "최상위 전체 디렉토리" 전용.
export const HUB_DEFINITION: BoardDefinition = {
  id: "hub",
  slug: "hub",
  title_ko: "게시판",
  title_en: "Boards",
  parent: null,
  boardType: "hub",
  visibility: "public",
  membership: 0,
  searchable: false,
  pageable: false,
  sortable: false,
  thumbnail: true,
  comments: false,
  likes: false,
  bookmarks: false,
  tags: false,
  allowPosting: false,
  defaultSort: "latest",
  pageSize: 10,
  description: "하위 게시판의 최신글/인기글/추천글을 종합하는 허브",
};

// =====================================================================
// 개별 게시판 정의(EPIC-048) — Silo Store 실제 게시판 20개
// =====================================================================
//
// 위 BOARD_DEFINITIONS(그룹 단위, board_type을 그대로 키로 씀)와 달리,
// 이번에 실제로 만드는 게시판들은 서로 다른 이름/설명/부모-자식 관계를
// 가진 "개별" 게시판이다. `boards.board_type`에 새 값을 추가하려면 CHECK
// 제약을 ALTER해야 하지만(스키마 변경 최대화), `category` 컬럼은 이미
// 자유 텍스트라 여기서는 board_type='topic'을 그대로 재사용하고 각
// 게시판의 slug를 `category`에 담아 구분한다(아래 story()/hub() 헬퍼가
// 공통 필드를 채우고, slug만 다르게 준다 — 게시판마다 객체를 통째로
// 반복해서 하드코딩하지 않기 위함).

function story(input: {
  slug: string;
  title_ko: string;
  title_en: string;
  parent: string;
  description: string;
}): BoardDefinition {
  return {
    id: input.slug,
    slug: input.slug,
    title_ko: input.title_ko,
    title_en: input.title_en,
    parent: input.parent,
    boardType: "story",
    visibility: "public",
    membership: 0,
    searchable: true,
    pageable: true,
    sortable: true,
    thumbnail: true,
    comments: true,
    likes: true,
    bookmarks: true,
    tags: true,
    allowPosting: true,
    defaultSort: "latest",
    pageSize: 10,
    description: input.description,
  };
}

function hub(input: {
  slug: string;
  title_ko: string;
  title_en: string;
  description: string;
}): BoardDefinition {
  return {
    id: input.slug,
    slug: input.slug,
    title_ko: input.title_ko,
    title_en: input.title_en,
    parent: null,
    boardType: "hub",
    visibility: "public",
    membership: 0,
    searchable: false,
    pageable: false,
    sortable: false,
    thumbnail: true,
    comments: false,
    likes: false,
    bookmarks: false,
    tags: false,
    allowPosting: false,
    defaultSort: "latest",
    pageSize: 10,
    description: input.description,
  };
}

export const INDIVIDUAL_BOARD_DEFINITIONS = {
  "silo-store": hub({
    slug: "silo-store",
    title_ko: "Silo Store",
    title_en: "Silo Store",
    description: "사일로상점 메인 허브 — 하위 게시판의 최신글/인기글/추천글 종합",
  }),
  treasures: story({
    slug: "treasures",
    title_ko: "사일로 보물들",
    title_en: "Silo Treasures",
    parent: "silo-store",
    description: "사일로의 철학과 정체성을 보여주는 스토리 게시판",
  }),
  // "카테고리 필터가 가장 중요한 기능"이라는 지시가 있었지만, 새 필터
  // UI 컴포넌트를 만들지 않기 위해(중복 컴포넌트 생성 금지) 이미 있는
  // 검색(제목/본문/작성자/태그)+태그 기능을 그대로 활용한다 — 물품
  // 카테고리(Time Slip 8개 시대 등)를 글쓰기 시 태그로 등록하면, 검색창에
  // 그 카테고리명을 입력하는 것이 곧 카테고리 필터 역할을 한다.
  items: story({
    slug: "items",
    title_ko: "보물 목록",
    title_en: "Item List",
    parent: "silo-store",
    description:
      "물품을 카테고리별로 탐색하는 게시판 — 태그에 카테고리를 등록하고 검색으로 필터링",
  }),
  "adoption-library": story({
    slug: "adoption-library",
    title_ko: "입양신청서 라이브러리",
    title_en: "Adoption Library",
    parent: "silo-store",
    description: "입양신청서 및 스토리 아카이브",
  }),
  "adoption-review": story({
    slug: "adoption-review",
    title_ko: "분양 후기",
    title_en: "Adoption Review",
    parent: "silo-store",
    description: "분양 후기를 소개하는 스토리 게시판",
  }),

  "online-docent": hub({
    slug: "online-docent",
    title_ko: "Online Docent",
    title_en: "Online Docent",
    description: "도슨트 시대별 카테고리의 최신글/인기글/추천글 종합",
  }),
  renaissance: story({
    slug: "renaissance",
    title_ko: "르네상스",
    title_en: "Renaissance",
    parent: "online-docent",
    description: "르네상스 시대 도슨트 이야기",
  }),
  baroque: story({
    slug: "baroque",
    title_ko: "바로크",
    title_en: "Baroque",
    parent: "online-docent",
    description: "바로크 시대 도슨트 이야기",
  }),
  rococo: story({
    slug: "rococo",
    title_ko: "로코코",
    title_en: "Rococo",
    parent: "online-docent",
    description: "로코코 시대 도슨트 이야기",
  }),
  neoclassicism: story({
    slug: "neoclassicism",
    title_ko: "신고전주의",
    title_en: "Neoclassicism",
    parent: "online-docent",
    description: "신고전주의 시대 도슨트 이야기",
  }),
  regency: story({
    slug: "regency",
    title_ko: "리젠시",
    title_en: "Regency",
    parent: "online-docent",
    description: "리젠시 시대 도슨트 이야기",
  }),
  victoria: story({
    slug: "victoria",
    title_ko: "빅토리아",
    title_en: "Victoria",
    parent: "online-docent",
    description: "빅토리아 시대 도슨트 이야기",
  }),
  "art-nouveau": story({
    slug: "art-nouveau",
    title_ko: "아르누보",
    title_en: "Art Nouveau",
    parent: "online-docent",
    description: "아르누보 시대 도슨트 이야기",
  }),
  "art-deco": story({
    slug: "art-deco",
    title_ko: "아르데코",
    title_en: "Art Deco",
    parent: "online-docent",
    description: "아르데코 시대 도슨트 이야기",
  }),
  "beat-generation": story({
    slug: "beat-generation",
    title_ko: "비트 세대",
    title_en: "Beat Generation",
    parent: "online-docent",
    description: "비트 세대 도슨트 이야기",
  }),
  "counter-culture": story({
    slug: "counter-culture",
    title_ko: "카운터 컬처",
    title_en: "Counter Culture",
    parent: "online-docent",
    description: "카운터 컬처 시대 도슨트 이야기",
  }),
  digital: story({
    slug: "digital",
    title_ko: "디지털",
    title_en: "Digital",
    parent: "online-docent",
    description: "디지털 시대 도슨트 이야기",
  }),

  heritage: hub({
    slug: "heritage",
    title_ko: "Heritage",
    title_en: "Heritage",
    description: "Grandmas/Grandpas 게시판의 최신글/인기글 종합",
  }),
  grandmas: story({
    slug: "grandmas",
    title_ko: "Grandmas",
    title_en: "Grandmas",
    parent: "heritage",
    description: "할머니들의 이야기를 나누는 스토리 게시판",
  }),
  grandpas: story({
    slug: "grandpas",
    title_ko: "Grandpas",
    title_en: "Grandpas",
    parent: "heritage",
    description: "할아버지들의 이야기를 나누는 스토리 게시판",
  }),
} as const satisfies Record<string, BoardDefinition>;

export type IndividualBoardSlug = keyof typeof INDIVIDUAL_BOARD_DEFINITIONS;

// 특정 hub(부모 slug)의 자식 게시판 slug 목록을 정의 선언 순서 그대로 반환.
export function getChildBoardSlugs(parentSlug: string): IndividualBoardSlug[] {
  return (Object.keys(INDIVIDUAL_BOARD_DEFINITIONS) as IndividualBoardSlug[]).filter(
    (slug) => INDIVIDUAL_BOARD_DEFINITIONS[slug].parent === parentSlug,
  );
}

// boards.category(=개별 게시판 slug) → boards.board_type + category(그룹
// 분기)로부터 BoardDefinition을 찾는다. 개별 slug가 먼저 매치되고, 없으면
// 기존 8개 그룹 로직으로 폴백 — 알 수 없는 board_type이 들어오면(마이그
// 레이션 누락 등) 가장 보수적인 기본값인 "topic" 정의로 대체한다.
export function resolveBoardDefinition(board: {
  board_type: string;
  category: string | null;
}): BoardDefinition {
  if (board.category && board.category in INDIVIDUAL_BOARD_DEFINITIONS) {
    return INDIVIDUAL_BOARD_DEFINITIONS[board.category as IndividualBoardSlug];
  }

  if (board.board_type === "topic") {
    return board.category === "general"
      ? BOARD_DEFINITIONS.general
      : BOARD_DEFINITIONS.topic;
  }

  return (
    BOARD_DEFINITIONS[board.board_type as BoardGroupKey] ??
    BOARD_DEFINITIONS.topic
  );
}
