"use client";

import { useEffect, useMemo, useState } from "react";
import { resolveBoardDefinition, type BoardPost } from "@/lib/boardLayout";
import { BoardRenderer } from "@/components/boards/BoardRenderer";
import { supabase } from "@/lib/supabaseClient";
import { fetchNavBranches, fetchBoardBranchMap, type NavBranchNode } from "@/lib/adminTreeGrouping";
import { ensurePageForSlug } from "@/lib/pageTemplates";
import { WIDGET_DEFAULT_SETTINGS } from "@/lib/pageBuilder";
import { CategoryBranchPicker } from "@/components/common/CategoryBranchPicker";
import { RANK_OPTIONS } from "@/lib/membershipTiers";

export { RANK_OPTIONS };

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
  // EPIC-092 후속(요구사항): 갤러리(render_type="gallery")에서만 의미 있음 —
  // "" = 미지정(기존과 동일한 masonry). widget_settings.galleryLayout/
  // galleryColumns로 저장된다.
  gallery_layout: string; // "" | "masonry" | "grid"
  gallery_columns: number;
  // EPIC-092 후속 2차: 호버 시 이미지 슬라이드 자동 전환 여부(기본 false —
  // 좌우 화살표로 직접 넘김). 영상은 이 값과 무관하게 항상 자동재생.
  gallery_hover_auto_slide: boolean;
  // HOTFIX-093-B(요구사항 1.3): 게시글 상세의 날짜/작성자 영역 커스텀
  // 스타일 — widget_settings.postMetaStyle로 저장된다. 값이 비어있으면
  // (post_meta_date_size_px=0 등) 기존 기본 스타일을 그대로 쓴다.
  post_meta_date_size_px: number; // 0 = 미지정
  post_meta_date_color_hex: string; // "" = 미지정
  post_meta_font_weight: number; // 0 = 미지정
  post_meta_position: string; // "" | "left" | "center" | "right"
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
  min_rank_to_read: null,
  gallery_layout: "",
  gallery_columns: 3,
  gallery_hover_auto_slide: false,
  post_meta_date_size_px: 0,
  post_meta_date_color_hex: "",
  post_meta_font_weight: 0,
  post_meta_position: "",
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

  // EPIC-088(요구사항 6): "Category" 필드 — 이 게시판이 사이트 메뉴 트리의
  // 어느 분기에 속하는지를 CategoryBranchPicker(다열 캐스케이딩 창)로
  // 고른다. 실제 "종속"은 CategoryDetailModal.saveBoardLink()/
  // CategoryTreeManager의 handleBoardDragEnd()와 동일한 매커니즘
  // (page_modules의 module_type='board' 행)으로 저장한다 — 새 컬럼을
  // 추가하지 않고 기존 사이트 메뉴 연동 방식을 그대로 재사용.
  const [branches, setBranches] = useState<NavBranchNode[]>([]);
  const [boardBranchMap, setBoardBranchMap] = useState<Map<string, string>>(new Map());
  const [selectedBranchId, setSelectedBranchId] = useState<string | null>(null);
  const [branchSaving, setBranchSaving] = useState(false);
  const [branchSaved, setBranchSaved] = useState(false);
  const [branchError, setBranchError] = useState<string | null>(null);

  useEffect(() => {
    if (!boardId) return;
    let cancelled = false;
    fetchNavBranches().then(async (fetchedBranches) => {
      if (cancelled) return;
      setBranches(fetchedBranches);
      const map = await fetchBoardBranchMap(fetchedBranches);
      if (cancelled) return;
      setBoardBranchMap(map);
      setSelectedBranchId(map.get(boardId) ?? null);
    });
    return () => {
      cancelled = true;
    };
  }, [boardId]);

  async function saveBranchLink(branchId: string | null) {
    if (!boardId) return;
    setBranchSaving(true);
    setBranchError(null);
    setBranchSaved(false);

    try {
      let destPageId: string | null = null;
      if (branchId) {
        const branch = branches.find((b) => b.id === branchId);
        if (!branch?.slug) {
          setBranchError("이 카테고리는 아직 연결된 URL(href)이 없어 게시판을 배정할 수 없어요.");
          setBranchSaving(false);
          return;
        }
        const { data: existingPage } = await supabase
          .from("page_builder")
          .select("id")
          .eq("slug", branch.slug)
          .maybeSingle();
        if (existingPage) {
          destPageId = (existingPage as { id: string }).id;
        } else {
          await ensurePageForSlug(branch.slug, branch.title, null);
          const { data: createdPage } = await supabase
            .from("page_builder")
            .select("id")
            .eq("slug", branch.slug)
            .maybeSingle();
          destPageId = (createdPage as { id: string } | null)?.id ?? null;
        }
        if (!destPageId) {
          setBranchError("이 카테고리의 페이지를 만들지 못했어요.");
          setBranchSaving(false);
          return;
        }
      }

      const { data: existingLinks, error: fetchLinksError } = await supabase
        .from("page_modules")
        .select("id")
        .eq("board_id", boardId)
        .eq("module_type", "board");
      if (fetchLinksError) throw fetchLinksError;

      if (destPageId) {
        if (existingLinks && existingLinks.length > 0) {
          const [first, ...rest] = existingLinks as { id: string }[];
          const { error: updateError } = await supabase
            .from("page_modules")
            .update({ page_id: destPageId })
            .eq("id", first.id);
          if (updateError) throw updateError;
          if (rest.length > 0) {
            const { error: deleteError } = await supabase
              .from("page_modules")
              .delete()
              .in("id", rest.map((r) => r.id));
            if (deleteError) throw deleteError;
          }
        } else {
          // EPIC-088: destPageId가 방금 ensurePageForSlug로 새로 만들어진
          // 페이지라면, 그 함수의 기본 템플릿(DEFAULT_TEMPLATE_TYPES)에
          // board_id가 비어있는 "board" 위젯이 이미 하나 심어져 있다 —
          // 그걸 무시하고 새로 insert하면 같은 페이지에 board 위젯이 2개
          // (하나는 영원히 미연결) 남는다. 그 빈 슬롯이 있으면 재활용
          // (board_id만 채움)하고, 없을 때만 새로 insert한다.
          const { data: emptyBoardSlot } = await supabase
            .from("page_modules")
            .select("id")
            .eq("page_id", destPageId)
            .eq("module_type", "board")
            .is("board_id", null)
            .limit(1)
            .maybeSingle();

          if (emptyBoardSlot) {
            const { error: fillError } = await supabase
              .from("page_modules")
              .update({ board_id: boardId })
              .eq("id", (emptyBoardSlot as { id: string }).id);
            if (fillError) throw fillError;
          } else {
            const { error: insertError } = await supabase.from("page_modules").insert({
              page_id: destPageId,
              module_type: "board",
              board_id: boardId,
              settings: WIDGET_DEFAULT_SETTINGS.board ?? {},
              sort_order: 0,
              is_hidden: false,
            });
            if (insertError) throw insertError;
          }
        }
      } else if (existingLinks && existingLinks.length > 0) {
        const { error: deleteError } = await supabase
          .from("page_modules")
          .delete()
          .in("id", (existingLinks as { id: string }[]).map((r) => r.id));
        if (deleteError) throw deleteError;
      }

      setSelectedBranchId(branchId);
      setBoardBranchMap((prev) => {
        const next = new Map(prev);
        if (branchId) next.set(boardId, branchId);
        else next.delete(boardId);
        return next;
      });
      setBranchSaved(true);
    } catch (err) {
      setBranchError(err instanceof Error ? err.message : "카테고리 배정에 실패했어요.");
    }
    setBranchSaving(false);
  }

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
            value={values.category}
            onChange={(e) => update("category", e.target.value.trim())}
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
            placeholder="예: free-board"
          />
          {mode === "edit" && (
            <p className="text-xs text-amber-600 mt-1">
              주의: 이 값은 Board Definition/기존 링크가 참조할 수 있어요 — 바꾸면 그 화면들이
              깨질 수 있으니 신중하게 변경하세요(다른 게시판과 중복되면 저장이 거부돼요).
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

        {/* EPIC-088(요구사항 6): 하드코딩된 단일 Category 드롭다운(group_key)을
            제거하고, 이 게시판이 사이트 메뉴 트리의 어느 분기에 속하는지
            직접 클릭해 매칭하는 다열 캐스케이딩 선택창으로 대체한다. 이
            연결은 site menu tree의 실제 연동 방식(page_modules)을 그대로
            쓰므로 board id가 있어야(=수정 모드) 저장할 수 있다 — 생성
            직후엔 아직 board_id가 없어 이 섹션 자체를 보여주지 않는다
            (min_rank_to_write/read와 동일한 "edit 모드 전용" 관례). */}
        {mode === "edit" && (
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-xs font-medium text-gray-600">
                Category (사이트 메뉴 위치)
              </label>
              <button
                type="button"
                onClick={() => saveBranchLink(selectedBranchId)}
                disabled={branchSaving}
                className="text-xs rounded-md border border-gray-300 px-2 py-1 hover:bg-gray-50 disabled:opacity-50"
              >
                {branchSaving ? "저장 중..." : "위치 저장"}
              </button>
            </div>
            <CategoryBranchPicker
              branches={branches}
              value={selectedBranchId}
              onChange={setSelectedBranchId}
            />
            {branchSaved && <p className="text-xs text-green-600 mt-1">저장됐어요.</p>}
            {branchError && <p className="text-xs text-red-600 mt-1">{branchError}</p>}
          </div>
        )}

        {values.render_type === "gallery" && (
          <div className="grid grid-cols-2 gap-4 rounded-md border border-gray-200 p-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">갤러리 배치 방향</label>
              <select
                value={values.gallery_layout}
                onChange={(e) => update("gallery_layout", e.target.value)}
                className="w-full rounded-md border border-gray-300 px-2 py-1.5 text-sm"
              >
                <option value="">(기본값 — 세로 채움 masonry)</option>
                <option value="masonry">세로 채움 (Masonry)</option>
                <option value="grid">가로 채움 (Grid)</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">한 행당 개수 (가로 채움일 때)</label>
              <select
                value={values.gallery_columns}
                onChange={(e) => update("gallery_columns", Number(e.target.value))}
                className="w-full rounded-md border border-gray-300 px-2 py-1.5 text-sm"
              >
                {[2, 3, 4, 5, 6].map((n) => (
                  <option key={n} value={n}>
                    {n}개
                  </option>
                ))}
              </select>
            </div>
            <div className="col-span-2">
              <label className="flex items-center gap-2 text-xs font-medium text-gray-600">
                <input
                  type="checkbox"
                  checked={values.gallery_hover_auto_slide}
                  onChange={(e) => update("gallery_hover_auto_slide", e.target.checked)}
                />
                썸네일 호버 시 이미지 자동 슬라이드 (끄면 좌우 화살표로 직접 넘김 — 영상은 항상 자동재생)
              </label>
            </div>
          </div>
        )}

        {/* HOTFIX-093-B(요구사항 1.3): "게시물 출력방식" — 게시글 상세의
            날짜/작성자 텍스트 스타일 커스텀. 값을 비워두면(0/"") 기존
            기본 스타일 그대로 렌더링된다(PostDetailHeader.tsx). */}
        <details className="rounded-md border border-gray-200 p-3">
          <summary className="cursor-pointer text-xs font-medium text-gray-600">
            게시물 출력방식 — 날짜/작성자 스타일
          </summary>
          <div className="mt-3 grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">날짜 크기 (px)</label>
              <input
                type="number"
                min={8}
                max={48}
                value={values.post_meta_date_size_px || ""}
                onChange={(e) => update("post_meta_date_size_px", Number(e.target.value) || 0)}
                placeholder="기본값(12px)"
                className="w-full rounded-md border border-gray-300 px-2 py-1.5 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">색상 (Hex)</label>
              <input
                type="text"
                value={values.post_meta_date_color_hex}
                onChange={(e) => update("post_meta_date_color_hex", e.target.value)}
                placeholder="#9CA3AF"
                className="w-full rounded-md border border-gray-300 px-2 py-1.5 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">폰트 웨이트</label>
              <select
                value={values.post_meta_font_weight || ""}
                onChange={(e) => update("post_meta_font_weight", Number(e.target.value) || 0)}
                className="w-full rounded-md border border-gray-300 px-2 py-1.5 text-sm"
              >
                <option value="">(기본값)</option>
                {[400, 500, 600, 700, 800].map((w) => (
                  <option key={w} value={w}>
                    {w}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">정렬 위치</label>
              <select
                value={values.post_meta_position}
                onChange={(e) => update("post_meta_position", e.target.value)}
                className="w-full rounded-md border border-gray-300 px-2 py-1.5 text-sm"
              >
                <option value="">(기본값)</option>
                <option value="left">왼쪽</option>
                <option value="center">가운데</option>
                <option value="right">오른쪽</option>
              </select>
            </div>
          </div>
        </details>

        <div className="grid grid-cols-2 gap-4">
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
            galleryLayout={values.gallery_layout === "grid" ? "grid" : values.gallery_layout === "masonry" ? "masonry" : undefined}
            galleryColumns={values.gallery_columns}
            galleryHoverAutoSlide={values.gallery_hover_auto_slide}
          />
        </div>
      </div>
    </form>
  );
}
