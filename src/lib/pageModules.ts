import type { ReactNode, FormEvent } from "react";
import type {
  BoardDefinition,
  BoardPost,
  HubFeed,
  HubChildBoard,
} from "@/lib/boardLayout";
import type { TimelineEntry } from "@/lib/timelineEngine";
import type { Comment as BoardComment } from "@/components/boards/CommentSection";

// EPIC-054B: Page(화면)와 Board(게시판)를 분리하는 최상위 개념.
// Page는 순서가 있는 PageModuleConfig[] 배열로 구성된다 — 배열이 곧 화면
// 순서이므로 모듈 추가(push)/삭제(filter)/순서 변경(재정렬)은 전부 표준
// 배열 연산으로 표현되고, 별도 트리/그래프 구조가 필요 없다.
//
// 이 파일은 타입/구조만 정의한다. 실제 데이터 조회·게시판·콘텐츠 생성은
// 이번 EPIC 범위 밖 — 각 모듈의 props는 호출하는 Page(Server/Client
// Component)가 채워 넣는다. Board 계열 모듈(story/gallery/list/slide
// board)은 기존 BoardDefinition/BoardRenderer를 그대로 재사용하고 새
// 레이아웃 로직을 만들지 않는다.

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
// Board 계열 모듈은 기존 BoardDefinition/BoardPost/HubFeed 타입을 그대로
// 재사용한다(새 타입 중복 정의 없음). definition.boardType은 관례상 모듈
// 종류와 일치해야 한다(story_board → "story" 등) — BoardRenderer 자체는
// definition.boardType만 보고 레이아웃을 고른다.

export type HeroModuleProps = {
  slides: { imageUrl: string; title: string; description: string }[];
  autoAdvanceSeconds?: number;
  objectFit?: "cover" | "contain";
  wallpaperUrls?: string[];
};

export type BoardModuleProps = {
  definition: BoardDefinition;
  boardId: string;
  posts: BoardPost[];
  isQna?: boolean;
};

export type SlideBoardModuleProps = {
  definition: BoardDefinition; // boardType이 "hub"인 정의
  hubFeed: HubFeed;
  hubChildBoards?: HubChildBoard[];
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
  | { id: string; kind: "slide_board"; props: SlideBoardModuleProps }
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
