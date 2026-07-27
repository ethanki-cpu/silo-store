// Board Engine (EPIC-047): boards.board_type(기존 8종, 등급/쓰기 권한 판정용)과
// 화면 레이아웃(community/story/gallery)은 서로 다른 축이다. 전용 컬럼을
// 추가하는 대신(스키마 변경 최소화 원칙) board_type으로부터 파생한다 —
// "hub"는 특정 게시판이 아니라 /boards(게시판 디렉토리) 자체의 레이아웃이라
// 이 함수의 반환값에는 포함하지 않는다.
export type BoardLayoutType = "community" | "story" | "gallery";

const STORY_BOARD_TYPES = new Set(["adoption_story"]);
const GALLERY_BOARD_TYPES = new Set(["archive"]);

export function getBoardLayoutType(boardType: string): BoardLayoutType {
  if (STORY_BOARD_TYPES.has(boardType)) return "story";
  if (GALLERY_BOARD_TYPES.has(boardType)) return "gallery";
  return "community";
}

export type SortOption = "latest" | "popular" | "views" | "comments" | "oldest";

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
