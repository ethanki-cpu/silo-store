// Board Definition System (EPIC-047 Part 2): 게시판마다 화면/API를 새로
// 만드는 대신, 이 파일의 BOARD_DEFINITIONS 하나만 보고 BoardRenderer +
// 관련 API 라우트가 동작을 결정한다. 새 게시판 "종류"를 추가할 때는
// (1) DB `boards` 테이블에 해당 board_type의 행을 시딩하고 (2) 여기에
// BoardDefinition 항목 하나만 추가하면 되고, 페이지/컴포넌트 코드는
// 건드릴 필요가 없다 — 다만 지금 이 저장소의 `boards.board_type`은
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
// 별도 상수로 둔다.
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

// boards.board_type + category(topic의 general/그 외 분기)로부터
// BoardDefinition을 찾는다. 알 수 없는 board_type이 들어오면(마이그레이션
// 누락 등) 가장 보수적인 기본값인 "topic" 정의로 대체한다.
export function resolveBoardDefinition(board: {
  board_type: string;
  category: string | null;
}): BoardDefinition {
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
