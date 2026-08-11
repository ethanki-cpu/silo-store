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

import type { JSONContent } from "@/lib/blockEditorCore";

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
  // EPIC-079-PHASE-2: URL 라우팅 키(/boards/[board_slug]/[slug]) — API가
  // 항상 채워서 내려주지만(폴백 포함), 마이그레이션 전 legacy select 경로를
  // 위해 optional로 둔다(id로 폴백해서 링크를 구성하면 됨).
  slug?: string;
  title: string | null;
  body: string | null;
  is_docent_post: boolean;
  is_best: boolean;
  like_count: number;
  view_count: number | null;
  comment_count: number;
  photo_url: string | null;
  /** EPIC-053.1: Block Editor에서 지정한 대표 이미지 — 있으면 photo_url보다 우선해서 썸네일로 쓴다. */
  featured_image_url?: string | null;
  /** EPIC-079: false면 featured_image_url/photo_url이 있어도 목록/상세에서 썸네일을 렌더링하지 않는다. */
  thumbnail_visible?: boolean | null;
  category?: string | null;
  tags: string[] | null;
  author_id: string;
  author_name: string;
  created_at: string;
  updated_at?: string;
  is_answered?: boolean;
  /** EPIC-092 후속(갤러리 호버 미리보기): 목록 조회에도 body_json을 포함시켜
   * 카드 hover 시 본문 갤러리/영상을 별도 fetch 없이 바로 미리 볼 수 있게 한다. */
  body_json?: JSONContent | null;
};

// EPIC-050: "timeline"은 연/월/일 순으로 묶어 보여주는 5번째 레이아웃 —
// 사일로상점+살롱데상 전체 이벤트를 시간순으로 훑어보는 Archive 전용 게시판.
// EPIC-066: 관리자 게시판 관리의 "Board Type" 10종 중 forum/collection은
// 기존 community/gallery 레이아웃을 그대로 재사용(별칭)하므로 새 키가
// 필요 없고, survey/calendar/application/slide 4종만 실제로 새 레이아웃
// 키로 추가한다 — survey/calendar/application은 이 코드베이스에 데이터
// 모델이 아직 없어(Page Builder의 survey/calendar 위젯도 boards와 무관한
// 정적 데모) 스텁 렌더러다(안내 배지 + 기존 글 목록), slide는 HubRenderer가
// 쓰는 기존 SlideModule을 게시판 자기 자신의 글로 재사용하는 실렌더러다.
export type BoardLayoutType =
  | "community"
  | "story"
  | "gallery"
  | "hub"
  | "timeline"
  | "slide"
  | "survey"
  | "calendar"
  | "application";

export type BoardDefinition = {
  id: string;
  slug: string;
  title_ko: string;
  title_en: string;
  parent: string | null;
  boardType: BoardLayoutType;
  visibility: "public" | "private";
  membership: number; // 이 그룹의 최소 열람 등급(0=전체 공개) — 표시/안내용, 실제 인가는 serverAuth.ts
  // EPIC-050: board_type(등급 판정 축)과 별개로, 이 개별 게시판에 특수
  // 접근 규칙이 있음을 표시하는 태그. 지금은 "patron"만 serverAuth.ts에
  // 실제로 연결돼 있고(canReadBoard/canWriteToBoard), 그 외 값(예:
  // "secret_room")은 향후 실제 인가 로직을 연결하기 전까지 구조만
  // 유지하는 표시용 필드다(NEXT_TASK.md 참고).
  accessLevel?: "patron" | "secret_room";
  searchable: boolean;
  pageable: boolean;
  sortable: boolean;
  thumbnail: boolean;
  comments: boolean;
  likes: boolean;
  bookmarks: boolean;
  tags: boolean;
  allowPosting: boolean;
  // EPIC-066: 관리자 게시판 관리의 "View Count 사용 여부" 토글 — optional로
  // 둬서(대부분의 기존 정의는 명시하지 않음) undefined는 "보임"(true)과
  // 동일하게 취급한다(사용하는 쪽에서 `!== false`로 판정).
  showViewCount?: boolean;
  defaultSort: SortOption;
  pageSize: number;
  description: string;
  // EPIC-051: "문의하기"/"예약하기" 같은 액션 버튼 — 기존 예약 Flow(예:
  // `/rental?floor=...`) 등 이미 있는 페이지로 연결하기 위한 순수 config
  // 필드다. 새 예약 시스템/컴포넌트를 만들지 않고, BoardHeader가 이 값을
  // 그대로 링크 버튼으로 렌더링만 한다.
  ctas?: { label: string; href: string }[];
  // EPIC-079: 글쓰기 폼의 카테고리 드롭다운 — 게시판별 고정 목록(정규화
  // 테이블 없음). 생략하면 DEFAULT_POST_CATEGORIES로 폴백한다.
  categories?: string[];
};

// EPIC-079: categories를 명시하지 않은 게시판이 쓰는 기본 카테고리 목록.
export const DEFAULT_POST_CATEGORIES = ["공지", "자유", "질문", "정보", "후기", "기타"];

export function getPostCategories(definition: Pick<BoardDefinition, "categories">): string[] {
  return definition.categories ?? DEFAULT_POST_CATEGORIES;
}

// hub 레이아웃이 화면에 보여줄 종합 피드(최신글/인기글/추천글) 한 건.
export type HubFeedItem = {
  id: string;
  // EPIC-079-PHASE-2: URL 라우팅 키 — /api/boards/feed가 항상 채워서
  // 내려준다(폴백 포함, id로 대체될 수 있음).
  slug?: string;
  board_id: string;
  board_slug?: string;
  board_name: string;
  title: string | null;
  like_count: number;
  author_name: string;
  created_at: string;
  // EPIC-051: Studio처럼 대표 이미지가 중요한 도메인의 hub 슬라이드에서
  // 썸네일을 보여주기 위해 추가 — 없으면(기존 도메인) 카드가 텍스트만
  // 보여주던 대로 그대로 동작(하위 호환).
  photo_url: string | null;
  // EPIC-066: Slide Module도 다른 레이아웃들과 동일하게 댓글/조회/태그를
  // 보여줘야 한다는 요구 — 전부 optional로 둬서(기존 호출부는 undefined로
  // 자연히 생략) 하위 호환을 깨지 않는다.
  comment_count?: number;
  view_count?: number | null;
  tags?: string[];
};

export type HubFeed = {
  latest: HubFeedItem[];
  popular: HubFeedItem[];
  recommended: HubFeedItem[];
};

// hub 하단 "하위 게시판 카드"에 쓰이는 자식 게시판 요약 정보.
export type HubChildBoard = {
  id: string;
  // EPIC-079-PHASE-2: URL 라우팅 키 — /api/boards가 항상 채워서 내려준다.
  slug?: string;
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

// EPIC-054B: Page Module 시스템(src/lib/pageModules.ts)이 임시 BoardDefinition을
// 만들어 BoardRenderer를 재사용할 수 있도록 export — BOARD_DEFINITIONS 레지스트리
// 자체(실제 게시판 목록)는 이 EPIC에서 건드리지 않는다.
export function story(input: {
  slug: string;
  title_ko: string;
  title_en: string;
  parent: string;
  description: string;
  // EPIC-051: Studio 서비스 게시판처럼 실제 예약/문의 페이지로 연결하는
  // 버튼이 필요한 경우에만 채운다(그 외 story 게시판은 생략).
  ctas?: { label: string; href: string }[];
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
    ctas: input.ctas,
  };
}

// EPIC-049: community() — 썸네일 없는 목록형 게시판(자유게시판/클럽/모임방
// 등). story()/hub()와 같은 이유로 반복 하드코딩을 피하려고 만든 헬퍼.
// EPIC-050: accessLevel(선택)을 추가 — "patron"을 주면 membership도 함께
// 3으로 맞춰(표시용) serverAuth.ts의 실제 게이팅과 안내 문구가 어긋나지
// 않게 한다.
export function community(input: {
  slug: string;
  title_ko: string;
  title_en: string;
  parent: string;
  description: string;
  accessLevel?: BoardDefinition["accessLevel"];
}): BoardDefinition {
  return {
    id: input.slug,
    slug: input.slug,
    title_ko: input.title_ko,
    title_en: input.title_en,
    parent: input.parent,
    boardType: "community",
    visibility: "public",
    membership: input.accessLevel === "patron" ? 3 : 0,
    accessLevel: input.accessLevel,
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
    description: input.description,
  };
}

export function hub(input: {
  slug: string;
  title_ko: string;
  title_en: string;
  description: string;
  // EPIC-049: Community 허브 아래 "주제별 소통 게시판"/"요일별 클럽"/
  // "설문"처럼 hub가 다른 hub의 자식이 되는 중첩 구조가 처음 생겨서 옵션화
  // — 생략하면 EPIC-048의 최상위 hub(Silo Store 등)처럼 parent가 없다.
  parent?: string;
}): BoardDefinition {
  return {
    id: input.slug,
    slug: input.slug,
    title_ko: input.title_ko,
    title_en: input.title_en,
    parent: input.parent ?? null,
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

// EPIC-050: timeline() — 연/월/일 순으로 묶어 보여주는 게시판(Timeline
// Engine, BoardRenderer.tsx의 TimelineView 참고).
export function timeline(input: {
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
    boardType: "timeline",
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

  // EPIC-049: Salon des Cent(살롱데상) Community 영역. 최상위 hub는
  // "community" — Silo Store/Online Docent/Heritage와 형제 관계의 4번째
  // 최상위 hub.
  community: hub({
    slug: "community",
    title_ko: "Community",
    title_en: "Community",
    description: "Salon des Cent Community 메인 허브",
  }),
  // "매일 출석 체크 버튼"/"오늘의 예술가·음악가·화가·작가·경제학자·과학자·
  // 심리학자·역사 속 사건·명언" 등은 새 컴포넌트를 만들지 않기 위해(주의
  // 사항: BoardRenderer만 사용) 이 게시판의 일반 글(제목/본문/태그)로
  // 작성하는 방식으로 구현 — 실제 출석 체크(`/attendance`, `daily_checkins`)
  // 와는 별개 시스템이며, "출석 성공 시 배지/포인트 연동 가능하도록 구조
  // 유지"라는 지시대로 지금은 연동하지 않고 좋아요/댓글/태그 등 기존 필드만
  // 그대로 둔다(NEXT_TASK.md 참고).
  attendance: community({
    slug: "attendance",
    title_ko: "출석체크 / 예술가의 달력",
    title_en: "Attendance / Artist's Calendar",
    parent: "community",
    description:
      "매일 출석 체크 + 오늘의 예술가/음악가/화가/작가/경제학자/과학자/심리학자/역사 속 사건/명언을 나누는 게시판",
  }),
  free: community({
    slug: "free",
    title_ko: "자유게시판",
    title_en: "Free Board",
    parent: "community",
    description: "Salon des Cent Community 자유게시판(썸네일 없음)",
  }),

  "salon-topics": hub({
    slug: "salon-topics",
    title_ko: "주제별 소통 게시판",
    title_en: "Topic Clubs",
    parent: "community",
    description: "13개 주제별 클럽 게시판의 최신글/인기글/추천글 종합",
  }),
  // 아래 13개는 EPIC-018 이전부터 이미 boards(board_type='topic')에 시딩돼
  // 있던 실제 클럽 게시판을 그대로 재사용한다(신규 DB 행 아님) — category
  // 값(economy/art/...)이 이미 slug 역할을 하고 있어 그대로 키로 썼다.
  economy: community({
    slug: "economy",
    title_ko: "경제 클럽",
    title_en: "Economy Club",
    parent: "salon-topics",
    description: "경제 클럽 주제 게시판",
  }),
  art: community({
    slug: "art",
    title_ko: "예술 클럽",
    title_en: "Art Club",
    parent: "salon-topics",
    description: "예술 클럽 주제 게시판",
  }),
  history: community({
    slug: "history",
    title_ko: "세계역사 클럽",
    title_en: "World History Club",
    parent: "salon-topics",
    description: "세계역사 클럽 주제 게시판",
  }),
  science: community({
    slug: "science",
    title_ko: "과학 클럽",
    title_en: "Science Club",
    parent: "salon-topics",
    description: "과학 클럽 주제 게시판",
  }),
  comedy: community({
    slug: "comedy",
    title_ko: "코메디 클럽",
    title_en: "Comedy Club",
    parent: "salon-topics",
    description: "코메디 클럽 주제 게시판",
  }),
  literature: community({
    slug: "literature",
    title_ko: "문학 클럽",
    title_en: "Literature Club",
    parent: "salon-topics",
    description: "문학 클럽 주제 게시판",
  }),
  health: community({
    slug: "health",
    title_ko: "건강 클럽",
    title_en: "Health Club",
    parent: "salon-topics",
    description: "건강 클럽 주제 게시판",
  }),
  politics: community({
    slug: "politics",
    title_ko: "정치 클럽",
    title_en: "Politics Club",
    parent: "salon-topics",
    description: "정치 클럽 주제 게시판",
  }),
  movie: community({
    slug: "movie",
    title_ko: "영화 클럽",
    title_en: "Movie Club",
    parent: "salon-topics",
    description: "영화 클럽 주제 게시판",
  }),
  psychology: community({
    slug: "psychology",
    title_ko: "심리 클럽",
    title_en: "Psychology Club",
    parent: "salon-topics",
    description: "심리 클럽 주제 게시판",
  }),
  sports: community({
    slug: "sports",
    title_ko: "스포츠 클럽",
    title_en: "Sports Club",
    parent: "salon-topics",
    description: "스포츠 클럽 주제 게시판",
  }),
  pets: community({
    slug: "pets",
    title_ko: "인간 집사들 클럽",
    title_en: "Pet Owners Club",
    parent: "salon-topics",
    description: "인간 집사들 클럽 주제 게시판",
  }),
  warmth: community({
    slug: "warmth",
    title_ko: "따듯한 세상 클럽",
    title_en: "Warm World Club",
    parent: "salon-topics",
    description: "따듯한 세상 클럽 주제 게시판",
  }),

  "salon-weekday": hub({
    slug: "salon-weekday",
    title_ko: "요일별 클럽",
    title_en: "Weekday Clubs",
    parent: "community",
    description: "요일별(월~일) 클럽 모임방 게시판의 최신글/인기글/추천글 종합",
  }),
  // 아래 7개도 위 13개와 동일하게 기존 boards(board_type='group') 행을
  // 재사용한다(신규 DB 행 아님). "주간 참석 신청/참석 버튼/참석 인원 표시/
  // 주간 일정 표시/모임 설명"은 새 컴포넌트를 만들지 않기 위해 이 게시판의
  // 일반 글(공지성 게시글)로 안내하는 방식으로 구현 — 실제 예약(`club_sessions`/
  // `reservations`)과는 별개 시스템이며 연동하지 않는다(NEXT_TASK.md 참고).
  mon: community({
    slug: "mon",
    title_ko: "월요반란",
    title_en: "Monday Rebellion",
    parent: "salon-weekday",
    description: "월요반란 클럽 모임방 게시판 — 주간 참석 신청/일정/모임 설명 안내",
  }),
  tue: community({
    slug: "tue",
    title_ko: "책 낭송",
    title_en: "Book Read-along",
    parent: "salon-weekday",
    description: "책 낭송 클럽 모임방 게시판 — 주간 참석 신청/일정/모임 설명 안내",
  }),
  wed: community({
    slug: "wed",
    title_ko: "행간의 조각가",
    title_en: "Text Sculptor",
    parent: "salon-weekday",
    description: "행간의 조각가 모임방 게시판 — 주간 참석 신청/일정/모임 설명 안내",
  }),
  thu: community({
    slug: "thu",
    title_ko: "놀아보자 영어클럽",
    title_en: "Have Fun English Club",
    parent: "salon-weekday",
    description: "놀아보자 영어클럽 모임방 게시판 — 주간 참석 신청/일정/모임 설명 안내",
  }),
  fri: community({
    slug: "fri",
    title_ko: "비포 선라이즈",
    title_en: "Before Sunrise Social",
    parent: "salon-weekday",
    description: "비포 선라이즈 소셜클럽 모임방 게시판 — 주간 참석 신청/일정/모임 설명 안내",
  }),
  sat: community({
    slug: "sat",
    title_ko: "무슨일이든 일어날수있어",
    title_en: "Whatever Can Happen",
    parent: "salon-weekday",
    description: "무슨일이든 일어날수있어 클럽 모임방 게시판 — 주간 참석 신청/일정/모임 설명 안내",
  }),
  sun: community({
    slug: "sun",
    title_ko: "연극이 끝나고 난 뒤",
    title_en: "After Theater",
    parent: "salon-weekday",
    description: "연극이 끝나고 난 뒤 클럽 모임방 게시판 — 주간 참석 신청/일정/모임 설명 안내",
  }),

  "monthly-salon": community({
    slug: "monthly-salon",
    title_ko: "월별 모임",
    title_en: "Monthly Salon",
    parent: "community",
    description: "월별 정기 모임 안내 게시판",
  }),

  // "설문 카드/종료일/참여자 수/진행중·종료" 같은 전용 카드 UI는 새
  // 컴포넌트를 만들지 않기 위해 구현하지 않음 — hub 레이아웃(자식 게시판
  // 피드+카드)만 그대로 적용한다. 지시문에는 이 hub의 하위 게시판이 명시돼
  // 있지 않아 자식 게시판 없이 생성함(NEXT_TASK.md 참고).
  survey: hub({
    slug: "survey",
    title_ko: "설문 [우리들 맴]",
    title_en: "Survey",
    parent: "community",
    description: "설문 모음 — 하위 설문 게시판이 추가되면 이 hub에 자동 집계됨",
  }),

  events: story({
    slug: "events",
    title_ko: "공연 / 전시회 소개",
    title_en: "Events & Exhibitions",
    parent: "community",
    description: "공연/전시회를 소개하는 스토리 게시판",
  }),

  notice: story({
    slug: "notice",
    title_ko: "이벤트 공지",
    title_en: "Notice",
    parent: "community",
    description: "이벤트 공지를 소개하는 스토리 게시판",
  }),

  qna: community({
    slug: "qna",
    title_ko: "Q&A 고민 게시판",
    title_en: "Q&A",
    parent: "community",
    description: "고민을 나누는 Q&A 게시판(사이트 전역 질문과 답변 게시판과는 별개)",
  }),

  // EPIC-050: Membership 영역 — Silo Store/Online Docent/Heritage/
  // Community와 형제 관계인 5번째 최상위 hub.
  membership: hub({
    slug: "membership",
    title_ko: "Membership",
    title_en: "Membership",
    description: "Membership 메인 허브 — 하위 게시판의 최신글/인기글/추천글 종합",
  }),
  "my-treasures": story({
    slug: "my-treasures",
    title_ko: "나의 보물 이야기",
    title_en: "My Treasures",
    parent: "membership",
    description:
      "회원들의 '나의 보물' 스토리 게시판. 마이페이지 '나의 컬렉션 > 나의 보물'과 연동 가능한 구조를 유지(현재는 미연동 — NEXT_TASK.md 참고)",
  }),
  "artist-intro": community({
    slug: "artist-intro",
    title_ko: "나의 아티스트 소개",
    title_en: "My Artist Introduction",
    parent: "membership",
    description: "회원 본인을 아티스트로 소개하는 게시판",
  }),
  "mind-diary": community({
    slug: "mind-diary",
    title_ko: "마음일기",
    title_en: "Mind Diary",
    parent: "membership",
    description: "마음일기를 나누는 게시판",
  }),
  // "멤버십 권한 적용" 지시를 실제로 반영 — accessLevel:"patron"이면
  // community()가 membership:3으로도 맞추고, serverAuth.ts의
  // canReadBoard/canWriteToBoard가 이 accessLevel을 읽어 패트론 등급
  // 미만은 읽기/쓰기 모두 막는다(이 EPIC에서 유일하게 실제로 인가 로직을
  // 연결한 게시판 — 나머지 accessLevel은 구조만 유지).
  "patron-board": community({
    slug: "patron-board",
    title_ko: "패트론 게시판",
    title_en: "Patron Board",
    parent: "membership",
    description: "패트론 등급 전용 게시판(실제 읽기/쓰기 권한 적용)",
    accessLevel: "patron",
  }),
  "one-line-novel": community({
    slug: "one-line-novel",
    title_ko: "한문장 소설 프로젝트",
    title_en: "One-Line Novel Project",
    parent: "membership",
    description: "한 문장씩 이어 쓰는 소설 프로젝트 게시판",
  }),
  // "권한 필요(accessLevel만 지정)" 지시대로, accessLevel 필드만 표시용으로
  // 지정하고 실제 인가 로직은 아직 연결하지 않는다(향후 salon_rooms/
  // salon_room_access 같은 실제 시험/권한 시스템과 연결할 자리 — NEXT_TASK.md 참고).
  "secret-room-docent": community({
    slug: "secret-room-docent",
    title_ko: "비밀의 방 도슨트",
    title_en: "Secret Room Docent",
    parent: "membership",
    description: "비밀의 방 전용 도슨트 게시판(접근 조건은 향후 확정 — 현재는 표시만)",
    accessLevel: "secret_room",
  }),

  // EPIC-050: Gallery 영역 — docs/content-blueprint.md에 "전부 미구현
  // (ComingSoon)"으로 기록돼 있던 /salon/gallery/* 5개 서브페이지와 동일한
  // 주제를 Board Definition으로 실제 구현. 기존 ComingSoon 페이지 자체는
  // 건드리지 않음(새 페이지 생성/수정 금지) — 실제 콘텐츠는 이 게시판들이
  // 대신 담당하게 된다(NEXT_TASK.md에 내비게이션 연결 필요 항목 기록).
  gallery: hub({
    slug: "gallery",
    title_ko: "Gallery",
    title_en: "Gallery",
    description: "Gallery 메인 허브 — 하위 게시판의 최신글/인기글/추천글 종합",
  }),
  awards: story({
    slug: "awards",
    title_ko: "시상식",
    title_en: "Awards",
    parent: "gallery",
    description: "시상식을 소개하는 스토리 게시판",
  }),
  performances: story({
    slug: "performances",
    title_ko: "공연들",
    title_en: "Performances",
    parent: "gallery",
    description: "공연을 소개하는 스토리 게시판",
  }),
  parties: story({
    slug: "parties",
    title_ko: "파티",
    title_en: "Parties",
    parent: "gallery",
    description: "파티를 소개하는 스토리 게시판",
  }),
  "gallery-visitors": story({
    slug: "gallery-visitors",
    title_ko: "운명의 방문자들",
    title_en: "Fateful Visitors",
    parent: "gallery",
    description: "방문자들의 이야기를 소개하는 스토리 게시판",
  }),
  patrons: story({
    slug: "patrons",
    title_ko: "패트론들",
    title_en: "Patrons",
    parent: "gallery",
    description: "패트론들을 소개하는 스토리 게시판",
  }),

  // EPIC-050: Archive 영역.
  archive: hub({
    slug: "archive",
    title_ko: "Archive",
    title_en: "Archive",
    description: "Archive 메인 허브 — 하위 게시판의 최신글/인기글/추천글 종합",
  }),
  brochure: story({
    slug: "brochure",
    title_ko: "소개지",
    title_en: "Brochure",
    parent: "archive",
    description: "소개지를 아카이빙하는 스토리 게시판",
  }),
  poster: story({
    slug: "poster",
    title_ko: "포스터",
    title_en: "Poster",
    parent: "archive",
    description: "포스터를 아카이빙하는 스토리 게시판",
  }),
  // "Timeline Engine" — 독립 컴포넌트가 아니라 BoardRenderer.tsx 안의
  // TimelineView(+groupPostsByYearMonth)를 재사용. 향후 마이페이지
  // 타임라인 탭(현재 PlaceholderPanel)도 같은 그룹핑 로직을 재사용할 수
  // 있도록 posts 형태(제목/작성일 등 범용 필드)에만 의존하게 만들었다.
  timeline: timeline({
    slug: "timeline",
    title_ko: "타임라인",
    title_en: "Timeline",
    parent: "archive",
    description:
      "사일로상점과 살롱데상의 모든 이벤트를 연/월/일 순으로 보여주는 반응형 타임라인",
  }),

  // EPIC-051: Studio(공간 문의) 영역 — Silo Store/Online Docent/Heritage/
  // Community/Membership/Gallery/Archive와 형제 관계인 8번째 최상위 hub.
  // 예약/신청 버튼은 새 예약 시스템을 만들지 않고 전부 기존 실제 페이지
  // (/rental, /space-inquiry/*)로 연결한다 — ctas 필드 참고.
  studio: hub({
    slug: "studio",
    title_ko: "Studio",
    title_en: "Studio",
    description:
      "Studio 메인 허브 — 4개 서비스(공간 대관 1F/2F, 물품 대여, 공간 스타일링)의 최신 포트폴리오/대표 이미지/추천 콘텐츠 종합",
  }),
  "studio-1f": story({
    slug: "studio-1f",
    title_ko: "공간 촬영 대관 (1층 사일로상점)",
    title_en: "Studio Rental (1F)",
    parent: "studio",
    description:
      "공간 소개/이용 안내/이용 요금/시설 안내/촬영 사례/FAQ. 실제 예약은 기존 /rental 페이지(1층 사일로상점) 재사용",
    // 문의/예약 모두 같은 /rental 페이지로 연결 — 이 프로젝트에는 예약과
    // 별개인 "단순 문의" 전용 채널이 없어(새 시스템을 만들지 않기 위해)
    // 두 버튼이 같은 실제 예약 Flow로 이어진다(NEXT_TASK.md 참고).
    ctas: [
      { label: "문의하기", href: "/rental?floor=1f_silostore" },
      { label: "예약하기", href: "/rental?floor=1f_silostore" },
    ],
  }),
  "studio-2f": story({
    slug: "studio-2f",
    title_ko: "공간 촬영 대관 (2층 살롱데상)",
    title_en: "Studio Rental (2F)",
    parent: "studio",
    description:
      "구조는 1층과 동일. 실제 예약은 기존 /rental 페이지(2층 살롱데상) 재사용",
    ctas: [
      { label: "문의하기", href: "/rental?floor=2f_salon" },
      { label: "예약하기", href: "/rental?floor=2f_salon" },
    ],
  }),
  rental: story({
    slug: "rental",
    title_ko: "물품 대여",
    title_en: "Item Rental",
    parent: "studio",
    description:
      "대여 안내/대여 절차/대여 사례/이용 규정. 신청은 기존 /space-inquiry/item-rental 페이지 재사용",
    ctas: [
      { label: "문의하기", href: "/space-inquiry/item-rental" },
      { label: "예약하기", href: "/space-inquiry/item-rental" },
    ],
  }),
  styling: story({
    slug: "styling",
    title_ko: "공간 스타일링",
    title_en: "Space Styling",
    parent: "studio",
    description:
      "공간 스타일링 소개/진행 절차. 대표 프로젝트는 별도 DB 없이 기존 styling_projects를 그대로 보여주는 기존 /shop/projects 페이지를 재사용하고, 신청은 기존 /space-inquiry/styling 페이지 재사용",
    ctas: [
      { label: "대표 프로젝트 보기", href: "/shop/projects" },
      { label: "문의하기", href: "/space-inquiry/styling" },
      { label: "신청하기", href: "/space-inquiry/styling" },
    ],
  }),
} as const satisfies Record<string, BoardDefinition>;

export type IndividualBoardSlug = keyof typeof INDIVIDUAL_BOARD_DEFINITIONS;

// 특정 hub(부모 slug)의 자식 게시판 slug 목록을 정의 선언 순서 그대로 반환.
export function getChildBoardSlugs(parentSlug: string): IndividualBoardSlug[] {
  return (Object.keys(INDIVIDUAL_BOARD_DEFINITIONS) as IndividualBoardSlug[]).filter(
    (slug) => INDIVIDUAL_BOARD_DEFINITIONS[slug].parent === parentSlug,
  );
}

// EPIC-066: 관리자 게시판 관리에서 편집 가능한 boards의 신규 컬럼 —
// resolveBoardDefinition의 입력 타입에 전부 optional로 추가한다. 호출부가
// 이 필드들을 select하지 않았거나(기존 API 라우트 다수, 마이그레이션 전)
// 라이브 DB에 컬럼 자체가 아직 없으면 전부 undefined로 들어오고, 아래
// applyAdminOverrides가 undefined는 "오버라이드 없음"으로 취급해 기존
// 하드코딩 값을 그대로 쓴다 — 하위 호환 100%, 신규 admin UI로 만지작인
// 게시판만 실제로 값이 채워져 즉시 반영된다.
export type BoardRow = {
  id?: string;
  name?: string;
  board_type: string;
  category: string | null;
  // EPIC-079-PHASE-2: URL 라우팅 키(/boards/[slug]) — DB에서는 NOT NULL
  // UNIQUE지만, 마이그레이션 전 legacy select 경로/구 데이터를 위해 여기선
  // optional로 둔다(다른 EPIC-066/077 신규 컬럼과 동일한 패턴).
  slug?: string | null;
  min_rank_to_write?: number | null;
  // EPIC-087-PHASE-C: min_rank_to_write의 읽기판 — null이면 게이트 없음
  // (기존과 동일하게 전체 공개), 값이 있으면 canReadBoard()가 이 랭크
  // 미만인 방문자/회원을 막는다.
  min_rank_to_read?: number | null;
  is_public?: boolean | null;
  group_key?: string | null;
  render_type?: string | null;
  default_card_type?: string | null;
  use_search?: boolean | null;
  use_like?: boolean | null;
  use_comment?: boolean | null;
  use_view_count?: boolean | null;
  default_page_size?: number | null;
  default_sort?: string | null;
  description?: string | null;
  widget_settings?: Record<string, unknown> | null;
  // EPIC-075: 관리자 트리 화면의 드래그앤드롭 순서 — 컬럼 없으면(마이그레이션
  // 전) BOARD_LEGACY_FIELDS 폴백 경로를 타 undefined로 남는다.
  sort_order?: number | null;
  // EPIC-077: "사이트 구성 관리" 통합 트리의 게시판 관리 모달용 주제/대표
  // 이미지 — 컬럼 없으면(마이그레이션 전) BOARD_RICH_FIELDS 폴백 경로를 타
  // undefined로 남는다(3단 폴백, BOARD_RICH_FIELDS_EXT 참고).
  topic?: string | null;
  thumbnail_url?: string | null;
};

// EPIC-066: boards.select()에 쓸 두 필드 목록 — 신규 admin 컬럼 포함(rich)
// vs 기존 4컬럼만(legacy). posts.tags/view_count와 동일한 rich/legacy 폴백
// 패턴(호출부에서 rich로 먼저 시도하고 42703 에러면 legacy로 재시도, 자세한
// 배경은 src/app/api/boards/[id]/posts/route.ts 참고) — 라이브 DB에 EPIC-066
// 마이그레이션이 아직 안 됐어도 게시판 읽기 자체는 멈추지 않는다.
export const BOARD_RICH_FIELDS =
  "id, name, category, slug, board_type, min_rank_to_write, min_rank_to_read, is_public, group_key, render_type, default_card_type, use_search, use_like, use_comment, use_view_count, default_page_size, default_sort, description, widget_settings, sort_order";
// EPIC-079-PHASE-2: slug는 RICH 단계에만 포함한다 — LEGACY는 "docs/sql/
// epic-079-phase-2-slug.sql이 아직 적용되지 않은 라이브 DB"를 위한
// 최후 폴백 단계라, 여기에도 slug를 넣으면 마이그레이션 전엔 게시판
// 목록 조회 자체가 완전히 실패한다(다른 rich/legacy 폴백들과 동일하게
// "읽기는 절대 멈추지 않는다" 원칙 유지) — 호출부는 board.slug가
// undefined면 board.id로 폴백해서 링크를 구성한다.
export const BOARD_LEGACY_FIELDS = "id, name, category, board_type, min_rank_to_write";
// EPIC-077: BOARD_RICH_FIELDS + topic/thumbnail_url — 3단 폴백의 첫 단계
// (EXT → RICH → LEGACY). 기존 BOARD_RICH_FIELDS 시그니처는 그대로 둬서
// 다른 호출부에 영향 없음.
export const BOARD_RICH_FIELDS_EXT = `${BOARD_RICH_FIELDS}, topic, thumbnail_url`;

// render_type(admin 편집용 10종) → BoardLayoutType(실제 렌더러 키) 매핑.
// forum/collection은 새 레이아웃을 만들지 않고 기존 community/gallery를
// 그대로 재사용(별칭)한다 — "Board Type" 드롭다운에는 10개가 다 뜨고
// 즉시 전환도 되지만, 화면은 가장 가까운 기존 레이아웃을 보여준다.
const RENDER_TYPE_TO_LAYOUT: Record<string, BoardLayoutType> = {
  story: "story",
  community: "community",
  gallery: "gallery",
  timeline: "timeline",
  slide: "slide",
  survey: "survey",
  calendar: "calendar",
  application: "application",
  forum: "community",
  collection: "gallery",
};

function applyAdminOverrides(base: BoardDefinition, board: BoardRow): BoardDefinition {
  const overriddenLayout = board.render_type
    ? RENDER_TYPE_TO_LAYOUT[board.render_type]
    : undefined;

  return {
    ...base,
    boardType: overriddenLayout ?? base.boardType,
    visibility: board.is_public === false ? "private" : base.visibility,
    searchable: board.use_search ?? base.searchable,
    likes: board.use_like ?? base.likes,
    comments: board.use_comment ?? base.comments,
    showViewCount: board.use_view_count ?? base.showViewCount,
    pageSize: board.default_page_size ?? base.pageSize,
    defaultSort: isSortOption(board.default_sort ?? "") ? (board.default_sort as SortOption) : base.defaultSort,
    description: board.description ?? base.description,
  };
}

// boards.category(=개별 게시판 slug) → boards.board_type + category(그룹
// 분기)로부터 BoardDefinition을 찾는다. 개별 slug가 먼저 매치되고, 없으면
// 기존 8개 그룹 로직으로 폴백 — 알 수 없는 board_type이 들어오면(마이그
// 레이션 누락 등) 가장 보수적인 기본값인 "topic" 정의로 대체한다. 마지막에
// applyAdminOverrides를 거쳐 EPIC-066 admin 컬럼 값이 있으면 덮어쓴다.
// EPIC-093(요구사항 6): "+ 새 게시판 추가"(src/app/admin/pages/[id]/page.tsx)가
// 관리자가 이름을 아직 정하기 전까지 임시로 채워 넣는 category 값
// (`new-board-<8자리 랜덤>`)이 그대로 게시글 태그로 노출되던 문제 —
// 이 패턴에 해당하는 category는 "실제 카테고리"로 취급하지 않는다.
const PLACEHOLDER_BOARD_CATEGORY_RE = /^new-board-[a-z0-9]+$/i;

export function isRealBoardCategory(
  category: string | null | undefined,
): category is string {
  return Boolean(category) && !PLACEHOLDER_BOARD_CATEGORY_RE.test(category as string);
}

export function resolveBoardDefinition(board: BoardRow): BoardDefinition {
  let base: BoardDefinition;

  if (board.category && board.category in INDIVIDUAL_BOARD_DEFINITIONS) {
    base = INDIVIDUAL_BOARD_DEFINITIONS[board.category as IndividualBoardSlug];
  } else if (board.board_type === "topic") {
    base = board.category === "general" ? BOARD_DEFINITIONS.general : BOARD_DEFINITIONS.topic;
  } else {
    base = BOARD_DEFINITIONS[board.board_type as BoardGroupKey] ?? BOARD_DEFINITIONS.topic;
  }

  return applyAdminOverrides(base, board);
}
