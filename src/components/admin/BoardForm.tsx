"use client";

import { useMemo, useState } from "react";
import { resolveBoardDefinition, type BoardPost } from "@/lib/boardLayout";
import { BoardRenderer } from "@/components/boards/BoardRenderer";

export type BoardFormValues = {
  name: string;
  category: string; // 슬러그
  description: string;
  group_key: string; // "" = 미지정
  render_type: string; // "" = 미지정(하드코딩 기본값 사용)
  default_card_type: string; // "" = 미지정
  is_public: boolean;
  use_search: boolean;
  use_like: boolean;
  use_comment: boolean;
  use_view_count: boolean;
  default_page_size: number;
  default_sort: string;
  min_rank_to_write: number;
};

export const GROUP_OPTIONS: { value: string; label: string }[] = [
  { value: "community", label: "Community" },
  { value: "gallery", label: "Gallery" },
  { value: "membership", label: "Membership" },
  { value: "archive", label: "Archive" },
  { value: "studio", label: "Studio" },
  { value: "heritage", label: "Heritage" },
  { value: "docent", label: "Docent" },
  { value: "mypage", label: "MyPage" },
  { value: "silo_store", label: "Silo Store" },
];

export const RENDER_TYPE_OPTIONS: { value: string; label: string }[] = [
  { value: "story", label: "Story" },
  { value: "community", label: "Community" },
  { value: "gallery", label: "Gallery" },
  { value: "timeline", label: "Timeline" },
  { value: "survey", label: "Survey" },
  { value: "slide", label: "Slide" },
  { value: "calendar", label: "Calendar" },
  { value: "application", label: "Application" },
  { value: "collection", label: "Collection" },
  { value: "forum", label: "Forum" },
];

export const CARD_TYPE_OPTIONS: { value: string; label: string }[] = [
  { value: "list", label: "List" },
  { value: "thumbnail", label: "Thumbnail" },
  { value: "gallery", label: "Gallery" },
  { value: "carousel", label: "Carousel" },
];

export const PAGE_SIZE_OPTIONS = [12, 24, 48, 100];

export const SORT_OPTIONS: { value: string; label: string }[] = [
  { value: "latest", label: "최신순" },
  { value: "views", label: "조회순" },
  { value: "popular", label: "좋아요순" },
  { value: "comments", label: "댓글순" },
  { value: "oldest", label: "오래된순" },
];

export const DEFAULT_BOARD_FORM_VALUES: BoardFormValues = {
  name: "",
  category: "",
  description: "",
  group_key: "",
  render_type: "",
  default_card_type: "",
  is_public: true,
  use_search: true,
  use_like: true,
  use_comment: true,
  use_view_count: true,
  default_page_size: 24,
  default_sort: "latest",
  min_rank_to_write: 0,
};

const PREVIEW_POSTS: BoardPost[] = [
  {
    id: "preview-1",
    title: "샘플 게시글 제목입니다",
    body: "미리보기용 예시 내용이에요. 실제 게시글이 아니라 레이아웃 확인용입니다.",
    is_docent_post: false,
    is_best: false,
    like_count: 12,
    view_count: 34,
    comment_count: 3,
    photo_url: null,
    tags: ["예시"],
    author_id: "preview",
    author_name: "미리보기",
    created_at: new Date().toISOString(),
  },
  {
    id: "preview-2",
    title: "두 번째 샘플 게시글",
    body: "레이아웃이 카드형인지 목록형인지 여기서 바로 확인할 수 있어요.",
    is_docent_post: false,
    is_best: true,
    like_count: 7,
    view_count: 21,
    comment_count: 1,
    photo_url: null,
    tags: [],
    author_id: "preview",
    author_name: "미리보기",
    created_at: new Date().toISOString(),
  },
];

// EPIC-066: 게시판 생성/수정 공용 폼. Board Type을 바꾸면 즉시 아래
// 미리보기(BoardRenderer, 샘플 글 2건)가 다시 그려져 "변경 즉시 Renderer
// 변경"(요구사항 ③)을 화면에서 바로 확인할 수 있다.
export function BoardForm({
  mode,
  initial,
  submitting,
  submitError,
  onSubmit,
}: {
  mode: "create" | "edit";
  initial: BoardFormValues;
  submitting: boolean;
  submitError: string | null;
  onSubmit: (values: BoardFormValues) => void;
}) {
  const [values, setValues] = useState<BoardFormValues>(initial);

  function update<K extends keyof BoardFormValues>(key: K, value: BoardFormValues[K]) {
    setValues((prev) => ({ ...prev, [key]: value }));
  }

  // resolveBoardDefinition의 applyAdminOverrides가 그대로 이 폼 값을
  // 오버라이드로 받아들이므로, 실제 admin API가 저장할 값과 동일한 로직으로
  // 미리보기를 만든다(미리보기와 저장 후 실제 화면이 어긋날 일이 없다).
  const previewDefinition = useMemo(() => {
    const definition = resolveBoardDefinition({
      board_type: "topic",
      category: null,
      render_type: values.render_type || null,
      use_search: values.use_search,
      use_like: values.use_like,
      use_comment: values.use_comment,
      use_view_count: values.use_view_count,
      default_page_size: values.default_page_size,
      default_sort: values.default_sort,
      description: values.description,
    });
    return { ...definition, title_ko: values.name || "미리보기" };
  }, [values]);

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit(values);
      }}
      className="grid grid-cols-1 lg:grid-cols-2 gap-8"
    >
      <div className="space-y-4">
        {submitError && (
          <div className="rounded-lg border border-red-300 bg-red-50 p-3 text-sm text-red-700">
            {submitError}
          </div>
        )}

        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">제목</label>
          <input
            type="text"
            required
            value={values.name}
            onChange={(e) => update("name", e.target.value)}
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">슬러그</label>
          <input
            type="text"
            required
            disabled={mode === "edit"}
            value={values.category}
            onChange={(e) => update("category", e.target.value.trim())}
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm disabled:bg-gray-50 disabled:text-gray-400"
            placeholder="예: free-board"
          />
          {mode === "edit" && (
            <p className="text-xs text-gray-400 mt-1">
              슬러그는 다른 화면(Board Definition, 링크)이 참조하고 있어 여기서는 바꿀 수 없어요.
            </p>
          )}
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">설명</label>
          <textarea
            value={values.description}
            onChange={(e) => update("description", e.target.value)}
            rows={2}
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Category</label>
            <select
              value={values.group_key}
              onChange={(e) => update("group_key", e.target.value)}
              className="w-full rounded-md border border-gray-300 px-2 py-1.5 text-sm"
            >
              <option value="">(미지정)</option>
              {GROUP_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Board Type</label>
            <select
              value={values.render_type}
              onChange={(e) => update("render_type", e.target.value)}
              className="w-full rounded-md border border-gray-300 px-2 py-1.5 text-sm"
            >
              <option value="">(기본값)</option>
              {RENDER_TYPE_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">기본 카드 타입</label>
            <select
              value={values.default_card_type}
              onChange={(e) => update("default_card_type", e.target.value)}
              className="w-full rounded-md border border-gray-300 px-2 py-1.5 text-sm"
            >
              <option value="">(미지정)</option>
              {CARD_TYPE_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">공개 여부</label>
            <select
              value={values.is_public ? "public" : "private"}
              onChange={(e) => update("is_public", e.target.value === "public")}
              className="w-full rounded-md border border-gray-300 px-2 py-1.5 text-sm"
            >
              <option value="public">공개</option>
              <option value="private">비공개</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">페이지당 개수</label>
            <select
              value={values.default_page_size}
              onChange={(e) => update("default_page_size", Number(e.target.value))}
              className="w-full rounded-md border border-gray-300 px-2 py-1.5 text-sm"
            >
              {PAGE_SIZE_OPTIONS.map((n) => (
                <option key={n} value={n}>
                  {n}개
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">기본 정렬</label>
            <select
              value={values.default_sort}
              onChange={(e) => update("default_sort", e.target.value)}
              className="w-full rounded-md border border-gray-300 px-2 py-1.5 text-sm"
            >
              {SORT_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2">
          {(
            [
              ["use_search", "검색 사용"],
              ["use_like", "좋아요 사용"],
              ["use_comment", "댓글 사용"],
              ["use_view_count", "조회수 사용"],
            ] as const
          ).map(([key, label]) => (
            <label key={key} className="flex items-center gap-2 text-sm text-gray-700">
              <input
                type="checkbox"
                checked={values[key]}
                onChange={(e) => update(key, e.target.checked)}
              />
              {label}
            </label>
          ))}
        </div>

        <button
          type="submit"
          disabled={submitting}
          className="rounded-md bg-gray-900 px-4 py-2 text-sm text-white hover:bg-gray-800 disabled:opacity-50"
        >
          {submitting ? "저장 중..." : mode === "create" ? "게시판 만들기" : "저장"}
        </button>
      </div>

      <div>
        <p className="text-xs uppercase tracking-wide text-gray-400 mb-2">
          미리보기 (샘플 글 2건 · Board Type 변경 시 즉시 반영)
        </p>
        <div className="rounded-lg border border-gray-200 p-4 max-h-[600px] overflow-y-auto">
          <BoardRenderer
            definition={previewDefinition}
            boardId="preview"
            posts={PREVIEW_POSTS}
            isQna={false}
          />
        </div>
      </div>
    </form>
  );
}
