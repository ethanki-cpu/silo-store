import type { ReactNode, FormEvent } from "react";
import type { TimelineEntry } from "@/lib/timelineEngine";
import type { Comment as BoardComment } from "@/components/boards/CommentSection";

// EPIC-054B: Page(화면)와 Board(게시판)를 분리하는 최상위 개념.
// Page는 순서가 있는 PageModuleConfig[] 배열로 구성된다 — 배열이 곧 화면
// 순서이므로 모듈 추가(push)/삭제(filter)/순서 변경(재정렬)은 전부 표준
// 배열 연산으로 표현되고, 별도 트리/그래프 구조가 필요 없다.
//
// EPIC-054C: Board 계열 모듈(story/gallery/list/slide board)은 이제
// src/components/modules/BoardModule.tsx로 실제 Board와 연결된다 —
// boardId만 넘기면 데이터 조회+Search/Sort/Pagination까지 자기완결형으로
// 처리하므로, 여러 Board를 한 Page 안에 나란히 배치해도 상태가 섞이지
// 않는다. 콘텐츠가 없는 Board/Page는 Placeholder Module이 아니라
// src/components/modules/EmptyState.tsx를 사용한다(BoardRenderer/
// PageModuleRenderer가 공유).

export type PageModuleKind =
  | "hero"
  | "story_board"
  | "gallery_board"
  | "list_board"
  | "slide_board"
  | "timeline"
  | "comment"
  | "search"
  | "pagination"
  | "notice"
  | "cta"
  | "form"
  | "calendar"
  | "survey"
  | "ranking"
  | "profile_card";

// 향후 "Page 편집" 관리자 UI(모듈 추가/삭제/순서 변경) 등에서 쓸 사람이
// 읽는 라벨 — 이번 EPIC은 그 UI 자체는 만들지 않고 구조만 준비해둔다.
export const PAGE_MODULE_LABELS: Record<PageModuleKind, string> = {
  hero: "Hero",
  story_board: "Story Board",
  gallery_board: "Gallery Board",
  list_board: "List Board",
  slide_board: "Slide Board",
  timeline: "Timeline",
  comment: "Comment",
  search: "Search",
  pagination: "Pagination",
  notice: "Notice",
  cta: "CTA",
  form: "Form",
  calendar: "Calendar",
  survey: "Survey",
  ranking: "Ranking",
  profile_card: "Profile Card",
};

export const PAGE_MODULE_KINDS = Object.keys(
  PAGE_MODULE_LABELS,
) as PageModuleKind[];

// ---- 모듈별 props 타입 ----

export type HeroModuleProps = {
  slides: { imageUrl: string; title: string; description: string }[];
  autoAdvanceSeconds?: number;
  objectFit?: "cover" | "contain";
  wallpaperUrls?: string[];
};

// EPIC-054C: Story/Gallery/List/Slide Board 4종 모두 이 props 하나로
// 통일한다 — 게시판 자체를 자기완결형으로 감싼 src/components/modules/
// BoardModule.tsx가 boardId만으로 정의(BoardDefinition) 조회부터 posts
// 조회, Search/Sort/Pagination 상태 관리까지 전부 스스로 처리하기 때문에,
// Page를 조립하는 쪽은 "이 자리에 어떤 게시판(boardId)을 놓을지"만
// 결정하면 된다. 실제 레이아웃(story/gallery/community/hub)은 여전히
// BoardDefinition.boardType이 결정하므로 kind는 조립 시점의 의도를 나타내는
// 라벨일 뿐, 렌더링 로직 자체를 분기하지 않는다(중복 코드 없음). 이 구조
// 덕분에 한 Page 안에 여러 BoardModule을 나란히 배치해도 서로의 검색어/
// 정렬/페이지 상태가 섞이지 않는다(Page 하나 = Board 하나 구조를 강제하지
// 않음) — 또한 boardId 하나만 넘기면 되므로 추후 Block Editor의 "게시판
// 임베드" 블록과도 그대로 연동 가능하다.
export type BoardModuleProps = {
  boardId: string;
  // hub 게시판일 때 하위 게시판 카드 그리드까지 보여줄지 여부(기본 true).
  // 여러 hub를 한 Page에 나란히 배치할 때(예: /boards 디렉토리) 각 hub
  // 아래 별도 게시판 목록 섹션이 있으면 false로 꺼서 중복을 피한다.
  includeChildBoards?: boolean;
};

export type TimelineModuleProps<T extends TimelineEntry = TimelineEntry> = {
  entries: T[];
  renderItem: (entry: T) => ReactNode;
  emptyMessage?: string;
};

export type CommentModuleProps = {
  comments: BoardComment[];
  commentBody: string;
  onCommentBodyChange: (value: string) => void;
  onSubmit: (e: FormEvent) => void;
  submitting: boolean;
};

export type SearchModuleProps = {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
};

export type PaginationModuleProps = {
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
};

export type NoticeModuleProps = {
  title: string;
  body: string;
  tone?: "info" | "warning";
};

export type CtaModuleProps = {
  ctas: { label: string; href: string }[];
};

export type FormFieldConfig = {
  name: string;
  label: string;
  type: "text" | "email" | "password" | "textarea" | "select" | "checkbox";
  options?: { label: string; value: string }[];
  required?: boolean;
};

export type FormModuleProps = {
  title?: string;
  fields: FormFieldConfig[];
  submitLabel?: string;
  onSubmit?: (e: FormEvent<HTMLFormElement>) => void;
};

export type CalendarModuleProps = {
  year: number;
  month: number; // 1-12
  markedDates?: string[]; // "YYYY-MM-DD"
  onDateClick?: (date: string) => void;
};

export type SurveyOption = { label: string; votes?: number };

export type SurveyModuleProps = {
  question: string;
  options: SurveyOption[];
  hasVoted?: boolean;
  onVote?: (optionIndex: number) => void;
};

export type RankingEntry = { rank: number; name: string; score: number | string };

export type RankingModuleProps = {
  title?: string;
  entries: RankingEntry[];
};

export type ProfileCardModuleProps = {
  name: string;
  subtitle?: string;
  avatarUrl?: string;
  stats?: { label: string; value: string | number }[];
};

// ---- 판별 유니온(discriminated union) ----
// PageModuleRenderer가 kind로 분기해 알맞은 컴포넌트에 props를 그대로
// 전달한다. id는 React key + 향후 편집 UI에서 모듈 하나를 식별하는 용도.
export type PageModuleConfig =
  | { id: string; kind: "hero"; props: HeroModuleProps }
  | { id: string; kind: "story_board"; props: BoardModuleProps }
  | { id: string; kind: "gallery_board"; props: BoardModuleProps }
  | { id: string; kind: "list_board"; props: BoardModuleProps }
  | { id: string; kind: "slide_board"; props: BoardModuleProps }
  | { id: string; kind: "timeline"; props: TimelineModuleProps }
  | { id: string; kind: "comment"; props: CommentModuleProps }
  | { id: string; kind: "search"; props: SearchModuleProps }
  | { id: string; kind: "pagination"; props: PaginationModuleProps }
  | { id: string; kind: "notice"; props: NoticeModuleProps }
  | { id: string; kind: "cta"; props: CtaModuleProps }
  | { id: string; kind: "form"; props: FormModuleProps }
  | { id: string; kind: "calendar"; props: CalendarModuleProps }
  | { id: string; kind: "survey"; props: SurveyModuleProps }
  | { id: string; kind: "ranking"; props: RankingModuleProps }
  | { id: string; kind: "profile_card"; props: ProfileCardModuleProps };

// Page = 이름 있는 모듈 배열. 배열 순서가 곧 화면 순서이므로 추가/삭제/
// 순서 변경이 전부 표준 배열 연산(push/filter/splice/재정렬)으로 표현된다.
// 이번 EPIC은 이 타입을 실제로 채운 Page 인스턴스를 만들지 않는다(콘텐츠
// 생성 금지) — 향후 EPIC이 실제 데이터를 채워 사용한다.
export type PageDefinition = {
  key: string;
  title: string;
  modules: PageModuleConfig[];
};
