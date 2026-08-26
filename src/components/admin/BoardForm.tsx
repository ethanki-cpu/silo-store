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
import { DEFAULT_POST_LAYOUT_ORDER, type PostLayoutBlock } from "@/lib/postLayout";
import { PostLayoutOrderEditor } from "@/components/admin/PostLayoutOrderEditor";
import { FontPicker } from "@/components/admin/FontPicker";
import type { PostMetaStyle } from "@/components/boards/PostDetailHeader";
import { uploadFile } from "@/lib/storage";
import type { SlideItem } from "@/components/HeroSlideshow";

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
  // "" = 미지정(HOTFIX-095부터 기본값은 grid/가로 채움). widget_settings.galleryLayout/
  // galleryColumns로 저장된다.
  gallery_layout: string; // "" | "masonry" | "grid"
  gallery_columns: number;
  // 사용자 신고(2026-08-12): 썸네일 크기를 관리자가 직접 지정할 수 있게 —
  // 0 = 미지정(한 행당 개수로 자동 계산, EPIC-096 기존 동작 그대로).
  gallery_thumbnail_max_px: number;
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
  // 사용자 지시(2026-08-12): "수정 YYYY.MM.DD" 줄 숨기기 + 각 항목별 폰트.
  post_meta_hide_updated_date: boolean;
  post_meta_date_font_family: string; // "" = 미지정
  // HOTFIX-099(사용자 지시): 글 번호/작성자 이름을 날짜와 별도로 크기·색상
  // 지정 — widget_settings.postMetaStyle.postNumber*/authorName*로 저장.
  post_meta_post_number_size_px: number; // 0 = 미지정
  post_meta_post_number_color_hex: string; // "" = 미지정
  post_meta_post_number_font_family: string; // "" = 미지정
  post_meta_author_name_size_px: number; // 0 = 미지정
  post_meta_author_name_color_hex: string; // "" = 미지정
  post_meta_author_name_font_family: string; // "" = 미지정
  // 사용자 지시(2026-08-12): 제목 폰트(크기/색상은 반응형 h1 스타일 유지).
  post_meta_title_font_family: string; // "" = 미지정
  // 사용자 지시(2026-08-12): "좋아요 · 조회 · 댓글" 통계 줄 — 지금까지
  // 스타일 지정 자체가 불가능했다.
  post_meta_stat_size_px: number; // 0 = 미지정
  post_meta_stat_color_hex: string; // "" = 미지정
  post_meta_stat_font_family: string; // "" = 미지정
  // HOTFIX-097(사용자 지시): 타임라인(render_type="timeline")에서만 의미
  // 있음 — widget_settings.timelineOrientation/timelineShowPreview로 저장.
  timeline_orientation: string; // "" | "vertical" | "horizontal" ("" = vertical과 동일)
  timeline_show_preview: boolean; // hover 시 썸네일+본문 일부 미리보기 카드
  // HOTFIX-100(사용자 지시): 게시판마다 다른 선/마커 색상.
  timeline_accent_color_hex: string; // "" = 미지정(기본 회색)
  // HOTFIX-103(사용자 지시 — "타임라인 아직도 구리다"): 선 굵기/마커 크기/
  // 미리보기 카드 테마.
  timeline_line_width_px: number; // 0 = 미지정(기본 2px)
  timeline_marker_size_px: number; // 0 = 미지정(기본 14px)
  timeline_card_theme: string; // "" | "light" | "dark" ("" = light과 동일)
  // EPIC-147-후속(사용자 지시 — "타임라인의 윗부분... 위아래 폭이 너무
  // 좁아 설정할수 있게 해줘"): Timeline NG(클래식 TimelineJS3) 슬라이드
  // 영역 높이(px) — TL.Timeline의 `height` 옵션으로 그대로 전달된다.
  timeline_ng_stage_height_px: number; // 0 = 미지정(TimelineJS3 기본값)
  // HOTFIX-147.3(사용자 지시 — "페이지 첫 화면 대표사진 슬라이드 + 그 위에
  // 중첩되는 텍스트(제목/요약)"): Timeline NG 리프 게시판 전용 히어로 —
  // widget_settings.timelineHeroSlides로 저장. 비어있으면(기본) 기존처럼
  // 히어로 없이 브레드크럼+게시판 이름 헤더부터 바로 시작한다.
  timeline_hero_slides: SlideItem[];
  // EPIC-096(요구사항 3.1): 게시글 상세 페이지의 5개 블록(메타데이터/태그/
  // 본문/좋아요·북마크/댓글) 노출 순서 — widget_settings.postLayoutOrder로
  // 저장된다. 기본 순서(DEFAULT_POST_LAYOUT_ORDER)와 같으면 저장하지 않는다
  // (postMetaStyle과 동일한 관례 — 값이 없으면 PostDetailClient가 기존
  // 하드코딩 순서를 그대로 쓴다, 회귀 없음).
  post_layout_order: PostLayoutBlock[];
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
  { value: "timeline_ng", label: "Timeline NG (인터랙티브 슬라이드)" },
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
  gallery_thumbnail_max_px: 0,
  gallery_hover_auto_slide: false,
  post_meta_date_size_px: 0,
  post_meta_date_color_hex: "",
  post_meta_font_weight: 0,
  post_meta_position: "",
  post_meta_hide_updated_date: false,
  post_meta_date_font_family: "",
  post_meta_post_number_size_px: 0,
  post_meta_post_number_color_hex: "",
  post_meta_post_number_font_family: "",
  post_meta_author_name_size_px: 0,
  post_meta_author_name_color_hex: "",
  post_meta_author_name_font_family: "",
  post_meta_title_font_family: "",
  post_meta_stat_size_px: 0,
  post_meta_stat_color_hex: "",
  post_meta_stat_font_family: "",
  timeline_orientation: "",
  timeline_show_preview: true,
  timeline_accent_color_hex: "",
  timeline_line_width_px: 0,
  timeline_marker_size_px: 0,
  timeline_card_theme: "",
  timeline_ng_stage_height_px: 0,
  timeline_hero_slides: [],
  post_layout_order: DEFAULT_POST_LAYOUT_ORDER,
};

// 사용자 지시(2026-08-12): postMetaStyle 조립 로직이 저장(2곳: 생성/수정
// 페이지)·전체 게시판 기본값 저장·실시간 프리뷰까지 4곳에서 완전히
// 똑같이 반복되고 있었다 — 필드를 늘릴 때마다 4곳을 매번 손으로 맞추면
// 어긋나기 쉬워 하나로 뽑았다. 값이 전부 미지정이면 undefined를 반환해
// widget_settings에 아예 postMetaStyle 키 자체를 안 남기는 기존 관례를
// 그대로 유지한다.
export function buildPostMetaStyle(values: BoardFormValues): PostMetaStyle | undefined {
  const hasAny =
    values.post_meta_date_size_px ||
    values.post_meta_date_color_hex ||
    values.post_meta_font_weight ||
    values.post_meta_position ||
    values.post_meta_hide_updated_date ||
    values.post_meta_date_font_family ||
    values.post_meta_post_number_size_px ||
    values.post_meta_post_number_color_hex ||
    values.post_meta_post_number_font_family ||
    values.post_meta_author_name_size_px ||
    values.post_meta_author_name_color_hex ||
    values.post_meta_author_name_font_family ||
    values.post_meta_title_font_family ||
    values.post_meta_stat_size_px ||
    values.post_meta_stat_color_hex ||
    values.post_meta_stat_font_family;
  if (!hasAny) return undefined;

  return {
    ...(values.post_meta_date_size_px ? { dateSizePx: values.post_meta_date_size_px } : {}),
    ...(values.post_meta_date_color_hex ? { dateColorHex: values.post_meta_date_color_hex } : {}),
    ...(values.post_meta_font_weight ? { fontWeight: values.post_meta_font_weight } : {}),
    ...(values.post_meta_position
      ? { position: values.post_meta_position as "left" | "center" | "right" }
      : {}),
    ...(values.post_meta_hide_updated_date ? { hideUpdatedDate: true } : {}),
    ...(values.post_meta_date_font_family ? { dateFontFamily: values.post_meta_date_font_family } : {}),
    ...(values.post_meta_post_number_size_px
      ? { postNumberSizePx: values.post_meta_post_number_size_px }
      : {}),
    ...(values.post_meta_post_number_color_hex
      ? { postNumberColorHex: values.post_meta_post_number_color_hex }
      : {}),
    ...(values.post_meta_post_number_font_family
      ? { postNumberFontFamily: values.post_meta_post_number_font_family }
      : {}),
    ...(values.post_meta_author_name_size_px
      ? { authorNameSizePx: values.post_meta_author_name_size_px }
      : {}),
    ...(values.post_meta_author_name_color_hex
      ? { authorNameColorHex: values.post_meta_author_name_color_hex }
      : {}),
    ...(values.post_meta_author_name_font_family
      ? { authorNameFontFamily: values.post_meta_author_name_font_family }
      : {}),
    ...(values.post_meta_title_font_family ? { titleFontFamily: values.post_meta_title_font_family } : {}),
    ...(values.post_meta_stat_size_px ? { statSizePx: values.post_meta_stat_size_px } : {}),
    ...(values.post_meta_stat_color_hex ? { statColorHex: values.post_meta_stat_color_hex } : {}),
    ...(values.post_meta_stat_font_family ? { statFontFamily: values.post_meta_stat_font_family } : {}),
  };
}

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
// HOTFIX-147.3: HeroSlideshowWidgetBlock(craft/primitives)의 슬라이드
// 목록 편집 UI와 동일한 패턴(이미지 업로드+제목+설명, 추가/삭제) — Craft가
// 아닌 일반 관리자 폼이라 useNode 대신 props로 값/변경 콜백을 받는다.
function TimelineHeroSlidesEditor({
  slides,
  onChange,
}: {
  slides: SlideItem[];
  onChange: (next: SlideItem[]) => void;
}) {
  function updateSlide(index: number, patch: Partial<SlideItem>) {
    onChange(slides.map((s, i) => (i === index ? { ...s, ...patch } : s)));
  }
  function addSlide() {
    onChange([...slides, { imageUrl: "", title: "", description: "" }]);
  }
  function removeSlide(index: number) {
    onChange(slides.filter((_, i) => i !== index));
  }
  async function uploadSlideImage(index: number, file: File | null) {
    if (!file) return;
    const { url, error } = await uploadFile(file, "post-images", "timeline-hero");
    if (!error && url) updateSlide(index, { imageUrl: url });
  }

  return (
    <div className="rounded-md border border-gray-200 p-3 space-y-3">
      <p className="text-sm font-medium text-gray-700">첫 화면 대표사진 히어로 ({slides.length})</p>
      <p className="text-xs text-gray-400">
        비어있으면 히어로 없이 기존처럼 브레드크럼+게시판 이름부터 바로 시작해요. 여러 장을 등록하면 자동으로 넘어가는 슬라이드쇼가 돼요.
      </p>
      <div className="space-y-3">
        {slides.map((slide, i) => (
          <div key={i} className="space-y-1.5 rounded border border-gray-200 p-2">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-medium text-gray-400">#{i + 1}</span>
              <button type="button" onClick={() => removeSlide(i)} className="text-[10px] text-red-500 hover:underline">
                삭제
              </button>
            </div>
            {slide.imageUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={slide.imageUrl} alt="" className="h-20 w-full rounded object-cover" />
            )}
            <label className="block text-[10px] text-gray-500">
              이미지 업로드
              <input
                type="file"
                accept="image/*"
                onChange={(e) => uploadSlideImage(i, e.target.files?.[0] ?? null)}
                className="mt-0.5 block w-full text-[10px]"
              />
            </label>
            <input
              type="text"
              value={slide.title}
              placeholder="제목"
              onChange={(e) => updateSlide(i, { title: e.target.value })}
              className="w-full rounded border border-gray-300 px-2 py-1 text-xs"
            />
            <input
              type="text"
              value={slide.description}
              placeholder="요약"
              onChange={(e) => updateSlide(i, { description: e.target.value })}
              className="w-full rounded border border-gray-300 px-2 py-1 text-xs"
            />
          </div>
        ))}
      </div>
      <button
        type="button"
        onClick={addSlide}
        className="w-full rounded border border-dashed border-gray-300 py-1.5 text-xs text-gray-500 hover:border-gray-400"
      >
        + 슬라이드 추가
      </button>
    </div>
  );
}

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
  // 사용자 지시(2026-08-12): "게시물 출력방식"(날짜/작성자 스타일 + 블록
  // 레이아웃 순서)을 이 게시판 하나가 아니라 사이트 전체 게시판의 기본값
  // 으로 저장하는 기능 — site_settings.default_post_display_style(신설
  // 키)에 저장하고, 자기 것을 따로 지정하지 않은 다른 모든 게시판이 이
  // 값을 기본으로 물려받는다(PostDetailClient.tsx 참고). 이 게시판
  // 자체에도 이미 값이 있으면(post_meta_*/post_layout_order) 그게 여전히
  // 우선한다 — "기본값"이지 "강제 값"이 아니다.
  const [savingSiteDefault, setSavingSiteDefault] = useState(false);
  const [siteDefaultSaved, setSiteDefaultSaved] = useState(false);

  async function handleSaveAsSiteDefault() {
    setSavingSiteDefault(true);
    setSiteDefaultSaved(false);
    const postMetaStyle = buildPostMetaStyle(values) ?? {};
    const { error: saveError } = await supabase.from("site_settings").upsert(
      {
        setting_key: "default_post_display_style",
        setting_value: { postMetaStyle, postLayoutOrder: values.post_layout_order },
        updated_at: new Date().toISOString(),
      },
      { onConflict: "setting_key" },
    );
    setSavingSiteDefault(false);
    if (!saveError) {
      setSiteDefaultSaved(true);
      setTimeout(() => setSiteDefaultSaved(false), 3000);
    }
  }
  const [linkedPages, setLinkedPages] = useState<
    { moduleId: string; pageId: string; slug: string; title: string; moduleType: string }[] | null
  >(null);
  // HOTFIX-102(사용자 지시): "이 게시판을 사용 중인 페이지"에서 직접
  // 추가/삭제할 수 있게 — 연결 추가용 전체 페이지 목록 + 선택값 + 처리 상태.
  const [allPages, setAllPages] = useState<{ id: string; slug: string; title: string }[]>([]);
  const [pageIdToAdd, setPageIdToAdd] = useState("");
  const [addingPageLink, setAddingPageLink] = useState(false);
  const [removingModuleId, setRemovingModuleId] = useState<string | null>(null);
  const [pageLinkError, setPageLinkError] = useState<string | null>(null);

  // EPIC-087-PHASE-A: "카테고리 드롭다운에서 연결된 페이지 목록" 요청의 실제
  // 대상 — board → page 방향 링크는 이 화면에 없었다(그 반대 방향, page →
  // board는 CategoryDetailModal의 "관리" 모달이 이미 편집). HOTFIX-102부터
  // 읽기 전용이 아니라 여기서 직접 추가/삭제할 수 있다.
  async function loadLinkedPages() {
    if (!boardId) return;
    const { data } = await supabase
      .from("page_modules")
      .select("id, module_type, page_builder(id, slug, title)")
      .eq("board_id", boardId);
    const rows = (data ?? []) as unknown as {
      id: string;
      module_type: string;
      page_builder: { id: string; slug: string; title: string } | null;
    }[];
    setLinkedPages(
      rows
        .filter((r) => r.page_builder)
        .map((r) => ({
          moduleId: r.id,
          pageId: r.page_builder!.id,
          slug: r.page_builder!.slug,
          title: r.page_builder!.title,
          moduleType: r.module_type,
        })),
    );
  }

  useEffect(() => {
    loadLinkedPages();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [boardId]);

  useEffect(() => {
    if (!boardId) return;
    supabase
      .from("page_builder")
      .select("id, slug, title")
      .order("title", { ascending: true })
      .then(({ data }) => setAllPages((data ?? []) as { id: string; slug: string; title: string }[]));
  }, [boardId]);

  // HOTFIX-102: 선택한 페이지에 이 게시판을 새 "board" 위젯으로 연결한다
  // (BoardForm.tsx의 "Category (사이트 메뉴 위치)"가 쓰는 것과 동일한
  // page_modules insert 패턴 — 다만 여기는 여러 페이지에 동시에 연결하는
  // 용도라 branch/사이트 메뉴 배정과는 독립적으로 동작한다).
  async function handleAddPageLink() {
    if (!boardId || !pageIdToAdd) return;
    setAddingPageLink(true);
    setPageLinkError(null);
    const { error } = await supabase.from("page_modules").insert({
      page_id: pageIdToAdd,
      module_type: "board",
      board_id: boardId,
      settings: WIDGET_DEFAULT_SETTINGS.board ?? {},
      sort_order: 0,
      is_hidden: false,
    });
    setAddingPageLink(false);
    if (error) {
      setPageLinkError(error.message);
      return;
    }
    setPageIdToAdd("");
    await loadLinkedPages();
  }

  async function handleRemovePageLink(moduleId: string) {
    setRemovingModuleId(moduleId);
    setPageLinkError(null);
    const { error } = await supabase.from("page_modules").delete().eq("id", moduleId);
    setRemovingModuleId(null);
    if (error) {
      setPageLinkError(error.message);
      return;
    }
    setLinkedPages((prev) => (prev ? prev.filter((p) => p.moduleId !== moduleId) : prev));
  }

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
            value={values.category}
            onChange={(e) => update("category", e.target.value.trim())}
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
            placeholder="예: free-board"
          />
          {/* 사용자 신고(2026-08-24) — "수정할 때마다 슬러그를 입력하라는
              알림이 뜬다": 이 필드는 boards.category(nullable, 미지정 시
              BOARD_DEFINITIONS.topic으로 자동 폴백 — src/lib/boardLayout.ts)에
              연결돼 있어 원래 선택 항목이다(URL 라우팅에 쓰이는 진짜 slug는
              별도 컬럼 boards.slug로, 이 폼에서 편집하지 않음). required가
              붙어있어 category가 비어있는 기존 게시판(사일로 타임라인 등)은
              저장 시도할 때마다 브라우저 기본 필수 입력 경고가 떴다. */}
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
                  <li key={p.moduleId} className="flex items-center justify-between gap-2 text-xs">
                    <span>
                      <a
                        href={`/admin/pages/${p.pageId}`}
                        target="_blank"
                        rel="noreferrer"
                        className="text-blue-600 hover:underline"
                      >
                        {p.title}
                      </a>
                      <span className="text-gray-400"> ({p.slug} · {p.moduleType})</span>
                    </span>
                    <button
                      type="button"
                      onClick={() => handleRemovePageLink(p.moduleId)}
                      disabled={removingModuleId === p.moduleId}
                      className="shrink-0 text-gray-400 hover:text-red-600 disabled:opacity-50"
                    >
                      {removingModuleId === p.moduleId ? "삭제 중..." : "연결 해제"}
                    </button>
                  </li>
                ))}
              </ul>
            )}
            {/* HOTFIX-102(사용자 지시): 이 목록에서 직접 다른 페이지에도
                게시판 위젯으로 추가 연결할 수 있게 — "Category (사이트 메뉴
                위치)"가 관리하는 단일 브랜치 배정과 별개로, 여러 페이지에
                동시에 노출하고 싶을 때(예: 허브 페이지 + 이 게시판 전용
                페이지) 쓴다. */}
            <div className="mt-2 flex items-center gap-2">
              <select
                value={pageIdToAdd}
                onChange={(e) => setPageIdToAdd(e.target.value)}
                className="flex-1 rounded-md border border-gray-300 px-2 py-1 text-xs"
              >
                <option value="">페이지 선택...</option>
                {allPages
                  .filter((p) => !linkedPages?.some((lp) => lp.pageId === p.id))
                  .map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.title} ({p.slug})
                    </option>
                  ))}
              </select>
              <button
                type="button"
                onClick={handleAddPageLink}
                disabled={!pageIdToAdd || addingPageLink}
                className="shrink-0 rounded-md border border-gray-300 px-2 py-1 text-xs hover:bg-gray-50 disabled:opacity-50"
              >
                {addingPageLink ? "추가 중..." : "+ 연결 추가"}
              </button>
            </div>
            {pageLinkError && <p className="mt-1 text-xs text-red-600">{pageLinkError}</p>}
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
                <option value="">(기본값 — 가로 채움 Grid)</option>
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
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">썸네일 최대 크기 (px)</label>
              <input
                type="number"
                min={0}
                max={800}
                value={values.gallery_thumbnail_max_px || ""}
                onChange={(e) => update("gallery_thumbnail_max_px", Number(e.target.value) || 0)}
                placeholder="비우면 위 개수로 자동 계산"
                className="w-full rounded-md border border-gray-300 px-2 py-1.5 text-sm"
              />
              <p className="mt-1 text-[11px] text-gray-400">
                비워두면 한 행당 개수를 기준으로 자동 계산돼요 — 직접 지정하면 그 값이 항상 우선해요.
              </p>
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

        {/* HOTFIX-097(사용자 지시): "타임라인 설정" — 배치 방향(세로/가로)과
            hover 시 썸네일+본문 일부 미리보기 카드 노출 여부. 게시판이
            render_type="timeline"일 때만 보여준다(갤러리 설정 섹션과 동일한
            조건부 노출 관례).
            HOTFIX-100(사용자 지시): 선/마커 색상 추가 — 정렬(왼쪽/가운데/
            오른쪽)은 아래 "게시물 출력방식" 섹션의 "정렬 위치"를 그대로
            공유한다(같은 게시판 메타 정보 정렬 설정 하나로 통일, 세로형에서
            선·마커 위치도 함께 따라간다). */}
        {values.render_type === "timeline" && (
          <div className="grid grid-cols-2 gap-4 rounded-md border border-gray-200 p-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">타임라인 배치 방향</label>
              <select
                value={values.timeline_orientation}
                onChange={(e) => update("timeline_orientation", e.target.value)}
                className="w-full rounded-md border border-gray-300 px-2 py-1.5 text-sm"
              >
                <option value="">(기본값 — 세로형)</option>
                <option value="vertical">세로형</option>
                <option value="horizontal">가로형</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">선·마커 색상 (Hex)</label>
              <input
                type="text"
                value={values.timeline_accent_color_hex}
                onChange={(e) => update("timeline_accent_color_hex", e.target.value)}
                placeholder="#166534"
                className="w-full rounded-md border border-gray-300 px-2 py-1.5 text-sm"
              />
            </div>
            <div className="col-span-2">
              <label className="flex items-center gap-2 text-xs font-medium text-gray-600">
                <input
                  type="checkbox"
                  checked={values.timeline_show_preview}
                  onChange={(e) => update("timeline_show_preview", e.target.checked)}
                />
                항목에 마우스를 올리면 썸네일+본문 일부 미리보기 카드 보이기
              </label>
            </div>
            {/* HOTFIX-103(사용자 지시 — "타임라인 아직도 구리다"): 선 굵기/
                마커 크기/미리보기 카드 테마 — 더 화려하고 존재감 있게
                꾸밀 수 있는 세부 설정. */}
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">선 굵기 (px)</label>
              <input
                type="number"
                min={1}
                max={8}
                value={values.timeline_line_width_px || ""}
                onChange={(e) => update("timeline_line_width_px", Number(e.target.value) || 0)}
                placeholder="기본값(2px)"
                className="w-full rounded-md border border-gray-300 px-2 py-1.5 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">마커 크기 (px)</label>
              <input
                type="number"
                min={8}
                max={32}
                value={values.timeline_marker_size_px || ""}
                onChange={(e) => update("timeline_marker_size_px", Number(e.target.value) || 0)}
                placeholder="기본값(14px)"
                className="w-full rounded-md border border-gray-300 px-2 py-1.5 text-sm"
              />
            </div>
            <div className="col-span-2">
              <label className="block text-xs font-medium text-gray-600 mb-1">미리보기 카드 테마</label>
              <select
                value={values.timeline_card_theme}
                onChange={(e) => update("timeline_card_theme", e.target.value)}
                className="w-full rounded-md border border-gray-300 px-2 py-1.5 text-sm"
              >
                <option value="">(기본값 — 라이트)</option>
                <option value="light">라이트 (흰 배경)</option>
                <option value="dark">다크 (검은 배경, 참고 이미지의 빨간 라인 스타일)</option>
              </select>
            </div>
            <p className="col-span-2 text-xs text-gray-400">
              세로형에서 선/마커의 좌우 위치는 아래 &ldquo;게시물 출력방식 → 정렬 위치&rdquo;를 따라갑니다.
            </p>
          </div>
        )}

        {/* EPIC-147-후속(사용자 지시 — "타임라인의 윗부분 '미디어 와 제목,
            설명'의 위아래 폭이 너무 좁아 설정할수 있게 해줘"): Timeline
            NG(클래식 TimelineJS3) 전용 설정 — 슬라이드 영역 높이만 우선
            노출한다(다른 세부 스타일은 TimelineJS3 자체 기본값을 그대로 씀). */}
        {values.render_type === "timeline_ng" && (
          <div className="grid grid-cols-2 gap-4 rounded-md border border-gray-200 p-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">슬라이드 영역 높이 (px)</label>
              <input
                type="number"
                min={300}
                max={1200}
                value={values.timeline_ng_stage_height_px || ""}
                onChange={(e) => update("timeline_ng_stage_height_px", Number(e.target.value) || 0)}
                placeholder="기본값(자동)"
                className="w-full rounded-md border border-gray-300 px-2 py-1.5 text-sm"
              />
            </div>
            <p className="col-span-2 text-xs text-gray-400">
              미디어/제목/설명이 표시되는 위쪽 영역의 세로 크기예요. 하단 연대표(TimeNav)는 이 값과 무관하게 항상 같은 높이를 유지해요.
            </p>
          </div>
        )}

        {/* HOTFIX-147.3(사용자 지시): 게시판 이름/검색창 헤더 위에 얹는
            대표사진 슬라이드쇼 + 오버레이 텍스트(제목/요약) — 기존
            HeroSlideshow.tsx(홈페이지 슬라이드쇼)를 그대로 재사용한다(새
            슬라이드쇼 구현 금지 원칙). */}
        {values.render_type === "timeline_ng" && (
          <TimelineHeroSlidesEditor
            slides={values.timeline_hero_slides}
            onChange={(next) => update("timeline_hero_slides", next)}
          />
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
            <FontPicker
              label="날짜 폰트"
              value={values.post_meta_date_font_family}
              onChange={(v) => update("post_meta_date_font_family", v)}
            />
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
            <div className="flex items-end pb-2">
              <label className="flex items-center gap-2 text-xs font-medium text-gray-600">
                <input
                  type="checkbox"
                  checked={values.post_meta_hide_updated_date}
                  onChange={(e) => update("post_meta_hide_updated_date", e.target.checked)}
                />
                &quot;수정 YYYY.MM.DD&quot; 줄 숨기기
              </label>
            </div>
          </div>

          {/* HOTFIX-099(사용자 지시): 글 번호/작성자 이름도 날짜와 별도로
              크기·색상을 지정할 수 있게 — 굵기/정렬은 위 값을 그대로 공유.
              사용자 지시(2026-08-12): 폰트도 각각 추가. */}
          <div className="mt-4 grid grid-cols-3 gap-4 border-t border-gray-100 pt-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">글 번호 크기 (px)</label>
              <input
                type="number"
                min={8}
                max={48}
                value={values.post_meta_post_number_size_px || ""}
                onChange={(e) => update("post_meta_post_number_size_px", Number(e.target.value) || 0)}
                placeholder="기본값(12px)"
                className="w-full rounded-md border border-gray-300 px-2 py-1.5 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">글 번호 색상 (Hex)</label>
              <input
                type="text"
                value={values.post_meta_post_number_color_hex}
                onChange={(e) => update("post_meta_post_number_color_hex", e.target.value)}
                placeholder="#9CA3AF"
                className="w-full rounded-md border border-gray-300 px-2 py-1.5 text-sm"
              />
            </div>
            <FontPicker
              label="글 번호 폰트"
              value={values.post_meta_post_number_font_family}
              onChange={(v) => update("post_meta_post_number_font_family", v)}
            />
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">작성자 이름 크기 (px)</label>
              <input
                type="number"
                min={8}
                max={48}
                value={values.post_meta_author_name_size_px || ""}
                onChange={(e) => update("post_meta_author_name_size_px", Number(e.target.value) || 0)}
                placeholder="기본값(14px)"
                className="w-full rounded-md border border-gray-300 px-2 py-1.5 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">작성자 이름 색상 (Hex)</label>
              <input
                type="text"
                value={values.post_meta_author_name_color_hex}
                onChange={(e) => update("post_meta_author_name_color_hex", e.target.value)}
                placeholder="#1F2937"
                className="w-full rounded-md border border-gray-300 px-2 py-1.5 text-sm"
              />
            </div>
            <FontPicker
              label="작성자 이름 폰트"
              value={values.post_meta_author_name_font_family}
              onChange={(v) => update("post_meta_author_name_font_family", v)}
            />
          </div>

          {/* 사용자 지시(2026-08-12): 제목 폰트 — 크기/색상은 반응형 h1
              스타일을 그대로 유지한다(임의 크기를 허용하면 레이아웃이
              쉽게 깨져서 폰트만 열어둔다). */}
          <div className="mt-4 max-w-xs border-t border-gray-100 pt-3">
            <FontPicker
              label="제목 폰트"
              value={values.post_meta_title_font_family}
              onChange={(v) => update("post_meta_title_font_family", v)}
            />
          </div>

          {/* 사용자 지시(2026-08-12): "좋아요 · 조회 · 댓글" 통계 줄 —
              지금까지 스타일 지정 자체가 불가능했다. 세 값이 항상 한 줄에
              같이 붙어 나오므로(PostDetailHeader.tsx의 statParts) 하나로
              묶어 크기/색상/폰트를 지정한다. */}
          <div className="mt-4 grid grid-cols-3 gap-4 border-t border-gray-100 pt-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">좋아요·조회·댓글 크기 (px)</label>
              <input
                type="number"
                min={8}
                max={48}
                value={values.post_meta_stat_size_px || ""}
                onChange={(e) => update("post_meta_stat_size_px", Number(e.target.value) || 0)}
                placeholder="기본값(12px)"
                className="w-full rounded-md border border-gray-300 px-2 py-1.5 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">좋아요·조회·댓글 색상 (Hex)</label>
              <input
                type="text"
                value={values.post_meta_stat_color_hex}
                onChange={(e) => update("post_meta_stat_color_hex", e.target.value)}
                placeholder="#9CA3AF"
                className="w-full rounded-md border border-gray-300 px-2 py-1.5 text-sm"
              />
            </div>
            <FontPicker
              label="좋아요·조회·댓글 폰트"
              value={values.post_meta_stat_font_family}
              onChange={(v) => update("post_meta_stat_font_family", v)}
            />
          </div>
        </details>

        {/* EPIC-096(요구사항 3.1): 게시글 상세 블록(메타데이터/태그/본문/
            좋아요·북마크/댓글) 배치 순서 — 드래그로 바꾸면 우측 프리뷰가
            바로 다시 그려진다. */}
        <details className="rounded-md border border-gray-200 p-3" open>
          <summary className="cursor-pointer text-xs font-medium text-gray-600">
            게시물 출력방식 — 블록 레이아웃 순서
          </summary>
          <div className="mt-3">
            <PostLayoutOrderEditor
              order={values.post_layout_order}
              onChange={(next) => update("post_layout_order", next)}
            />
          </div>
          {/* 사용자 지시(2026-08-12): 위 "날짜/작성자 스타일" + "블록
              레이아웃 순서" 두 섹션의 현재 값을 사이트 전체 게시판의
              기본값으로 저장 — 자기 것을 따로 지정 안 한 다른 게시판들이
              이 값을 물려받는다(강제 적용이 아니라 기본값). 이 폼 자체의
              "저장하기"(게시판 하나 저장)와는 별개 동작이라 여기서 바로
              실행되고 별도 확인 없이 즉시 저장된다(다른 site_settings
              upsert 버튼들과 동일한 관례).*/}
          <div className="mt-3 flex items-center gap-3 border-t border-gray-100 pt-3">
            <button
              type="button"
              onClick={handleSaveAsSiteDefault}
              disabled={savingSiteDefault}
              className="rounded-md border border-gray-300 bg-white px-3 py-1.5 text-xs text-gray-700 hover:bg-gray-50 disabled:opacity-50"
            >
              {savingSiteDefault ? "저장 중..." : "🌐 이 설정을 전체 게시판 기본값으로 저장"}
            </button>
            {siteDefaultSaved && <span className="text-xs text-green-600">전체 게시판 기본값으로 저장됐어요.</span>}
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
            galleryThumbnailMaxPx={values.gallery_thumbnail_max_px || undefined}
            galleryHoverAutoSlide={values.gallery_hover_auto_slide}
            timelineOrientation={values.timeline_orientation === "horizontal" ? "horizontal" : values.timeline_orientation === "vertical" ? "vertical" : undefined}
            timelineShowPreview={values.timeline_show_preview}
            timelineAccentColorHex={values.timeline_accent_color_hex || undefined}
            timelineLineWidthPx={values.timeline_line_width_px || undefined}
            timelineMarkerSizePx={values.timeline_marker_size_px || undefined}
            timelineCardTheme={values.timeline_card_theme === "dark" ? "dark" : values.timeline_card_theme === "light" ? "light" : undefined}
            timelineNgStageHeightPx={values.timeline_ng_stage_height_px || undefined}
            postMetaStyle={buildPostMetaStyle(values) ?? {}}
          />
        </div>
      </div>
    </form>
  );
}
