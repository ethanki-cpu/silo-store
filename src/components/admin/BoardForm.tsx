"use client";

import { useEffect, useMemo, useState } from "react";
import { resolveBoardDefinition, type BoardPost } from "@/lib/boardLayout";
import { BoardRenderer } from "@/components/boards/BoardRenderer";
import { supabase } from "@/lib/supabaseClient";

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
  // EPIC-087-PHASE-C: null이면 게이트 없음(전체 공개, 기존과 동일).
  min_rank_to_read: number | null;
};

export const RANK_OPTIONS: { rank: number; label: string }[] = [
  { rank: 0, label: "Silo Angel" },
  { rank: 1, label: "Alice" },
  { rank: 2, label: "Great Gatsby" },
  { rank: 3, label: "Patron" },
  { rank: 4, label: "Lautrec" },
  { rank: 99, label: "Artist" },
];

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
  min_rank_to_read: null,
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
  boardId,
}: {
  mode: "create" | "edit";
  initial: BoardFormValues;
  submitting: boolean;
  submitError: string | null;
  onSubmit: (values: BoardFormValues) => void;
  // EPIC-087-PHASE-A: edit 모드에서만 넘어옴 — "이 게시판을 사용 중인 페이지"
  // 역방향 조회에 쓴다(create 모드는 아직 board_id가 없어 조회 불가).
  boardId?: string;
}) {
  const [values, setValues] = useState<BoardFormValues>(initial);
  const [linkedPages, setLinkedPages] = useState<
    { pageId: string; slug: string; title: string; moduleType: string }[] | null
  >(null);

  // EPIC-087-PHASE-A: "카테고리 드롭다운에서 연결된 페이지 목록" 요청의 실제
  // 대상 — board → page 방향 링크는 이 화면에 없었다(그 반대 방향, page →
  // board는 CategoryDetailModal의 "관리" 모달이 이미 편집). 여기서는 읽기
  // 전용으로 "이 게시판을 위젯으로 쓰는 페이지"만 보여준다.
  useEffect(() => {
    if (!boardId) return;
    let cancelled = false;
    supabase
      .from("page_modules")
      .select("module_type, page_builder(id, slug, title)")
      .eq("board_id", boardId)
      .then(({ data }) => {
        if (cancelled) return;
        const rows = (data ?? []) as unknown as {
          module_type: string;
          page_builder: { id: string; slug: string; title: string } | null;
        }[];
        setLinkedPages(
          rows
            .filter((r) => r.page_builder)
            .map((r) => ({
              pageId: r.page_builder!.id,
              slug: r.page_builder!.slug,
              title: r.page_builder!.title,
              moduleType: r.module_type,
            })),
        );
      });
    return () => {
      cancelled = true;
    };
  }, [boardId]);

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

        {boardId && (
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">
              이 게시판을 사용 중인 페이지
            </label>
            {linkedPages === null ? (
              <p className="text-xs text-gray-400">불러오는 중...</p>
            ) : linkedPages.length === 0 ? (
              <p className="text-xs text-gray-400">이 게시판을 위젯으로 연결한 페이지가 없어요.</p>
            ) : (
              <ul className="space-y-1">
                {linkedPages.map((p) => (
                  <li key={`${p.pageId}-${p.moduleType}`} className="text-xs">
                    <a
                      href={`/admin/pages/${p.pageId}`}
                      target="_blank"
                      rel="noreferrer"
                      className="text-blue-600 hover:underline"
                    >
                      {p.title}
                    </a>
                    <span className="text-gray-400"> ({p.slug} · {p.moduleType})</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

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

        {/* EPIC-087-PHASE-C: 티어 접근 제한 — 글쓰기 최소 등급(min_rank_to_write,
            기존 컬럼이지만 이 화면에 편집 UI가 없어 저장이 안 되고 있었다)과
            열람 최소 등급(min_rank_to_read, 신규)을 함께 편집한다. 생성
            직후엔 /api/admin/boards POST가 의도적으로 min_rank_to_write를
            0으로 고정하고 이 값을 body에서 받지 않으므로(EPIC-066, "특수
            권한이 필요한 게시판은 생성 후 조정") edit 모드에서만 보여준다. */}
        {mode === "edit" && (
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">최소 글쓰기 등급</label>
            <select
              value={values.min_rank_to_write}
              onChange={(e) => update("min_rank_to_write", Number(e.target.value))}
              className="w-full rounded-md border border-gray-300 px-2 py-1.5 text-sm"
            >
              {RANK_OPTIONS.map((o) => (
                <option key={o.rank} value={o.rank}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">최소 열람 등급</label>
            <select
              value={values.min_rank_to_read ?? ""}
              onChange={(e) => update("min_rank_to_read", e.target.value === "" ? null : Number(e.target.value))}
              className="w-full rounded-md border border-gray-300 px-2 py-1.5 text-sm"
            >
              <option value="">(제한 없음)</option>
              {RANK_OPTIONS.map((o) => (
                <option key={o.rank} value={o.rank}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>
        </div>
        )}

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
