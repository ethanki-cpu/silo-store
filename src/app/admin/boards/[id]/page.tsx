"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/lib/AuthProvider";
import { BoardForm, DEFAULT_BOARD_FORM_VALUES, type BoardFormValues } from "@/components/admin/BoardForm";
import { ConfirmModal } from "@/components/admin/ConfirmModal";
import { DEFAULT_POST_LAYOUT_ORDER, normalizePostLayoutOrder } from "@/lib/postLayout";

export default function AdminBoardEditPage() {
  const { id } = useParams<{ id: string }>();
  const { session } = useAuth();
  const router = useRouter();

  const [values, setValues] = useState<BoardFormValues | null>(null);
  // EPIC-079-PHASE-2: "미리보기" 링크가 이제 board id(UUID) 대신 slug로
  // 라우팅되므로(/boards/[board_slug]), 폼 값과 별개로 slug만 따로 보관한다.
  const [boardSlug, setBoardSlug] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (!session) return;

    async function load() {
      const res = await fetch(`/api/admin/boards/${id}`, {
        headers: { Authorization: `Bearer ${session!.access_token}` },
      });
      const data = await res.json();
      if (!res.ok) {
        setLoadError(data.error ?? "게시판을 불러오지 못했어요.");
        return;
      }
      setBoardSlug(data.slug ?? null);
      setValues({
        ...DEFAULT_BOARD_FORM_VALUES,
        name: data.name ?? "",
        category: data.category ?? "",
        description: data.description ?? "",
        group_key: data.group_key ?? "",
        render_type: data.render_type ?? "",
        default_card_type: data.default_card_type ?? "",
        is_public: data.is_public ?? true,
        use_search: data.use_search ?? true,
        use_like: data.use_like ?? true,
        use_comment: data.use_comment ?? true,
        use_view_count: data.use_view_count ?? true,
        default_page_size: data.default_page_size ?? 24,
        default_sort: data.default_sort ?? "latest",
        min_rank_to_write: data.min_rank_to_write ?? 0,
        min_rank_to_read: data.min_rank_to_read ?? null,
        gallery_layout: data.widget_settings?.galleryLayout ?? "",
        gallery_columns: data.widget_settings?.galleryColumns ?? 3,
        gallery_hover_auto_slide: data.widget_settings?.galleryHoverAutoSlide ?? false,
        post_meta_date_size_px: data.widget_settings?.postMetaStyle?.dateSizePx ?? 0,
        post_meta_date_color_hex: data.widget_settings?.postMetaStyle?.dateColorHex ?? "",
        post_meta_font_weight: data.widget_settings?.postMetaStyle?.fontWeight ?? 0,
        post_meta_position: data.widget_settings?.postMetaStyle?.position ?? "",
        post_meta_post_number_size_px: data.widget_settings?.postMetaStyle?.postNumberSizePx ?? 0,
        post_meta_post_number_color_hex: data.widget_settings?.postMetaStyle?.postNumberColorHex ?? "",
        post_meta_author_name_size_px: data.widget_settings?.postMetaStyle?.authorNameSizePx ?? 0,
        post_meta_author_name_color_hex: data.widget_settings?.postMetaStyle?.authorNameColorHex ?? "",
        timeline_orientation: data.widget_settings?.timelineOrientation ?? "",
        timeline_show_preview: data.widget_settings?.timelineShowPreview ?? true,
        timeline_accent_color_hex: data.widget_settings?.timelineAccentColorHex ?? "",
        timeline_line_width_px: data.widget_settings?.timelineLineWidthPx ?? 0,
        timeline_marker_size_px: data.widget_settings?.timelineMarkerSizePx ?? 0,
        timeline_card_theme: data.widget_settings?.timelineCardTheme ?? "",
        post_layout_order: normalizePostLayoutOrder(data.widget_settings?.postLayoutOrder),
      });
    }

    load();
  }, [session, id]);

  async function handleSubmit(next: BoardFormValues) {
    if (!session) return;
    setSubmitting(true);
    setSubmitError(null);

    const res = await fetch(`/api/admin/boards/${id}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({
        name: next.name,
        description: next.description || null,
        group_key: next.group_key || null,
        render_type: next.render_type || null,
        default_card_type: next.default_card_type || null,
        is_public: next.is_public,
        use_search: next.use_search,
        use_like: next.use_like,
        use_comment: next.use_comment,
        use_view_count: next.use_view_count,
        default_page_size: next.default_page_size,
        default_sort: next.default_sort,
        min_rank_to_write: next.min_rank_to_write,
        min_rank_to_read: next.min_rank_to_read,
        // EPIC-092 후속: 갤러리 배치 방향/한 행당 개수 — render_type이
        // "gallery"가 아니어도 그냥 저장해둔다(나중에 갤러리로 바꿔도 값 유지).
        widget_settings: {
          ...(next.gallery_layout ? { galleryLayout: next.gallery_layout } : {}),
          ...(next.gallery_columns ? { galleryColumns: next.gallery_columns } : {}),
          galleryHoverAutoSlide: next.gallery_hover_auto_slide,
          // HOTFIX-097(사용자 지시): 타임라인 배치 방향/미리보기 여부 —
          // render_type이 "timeline"이 아니어도 그냥 저장해둔다(나중에
          // 타임라인으로 바꿔도 값 유지, 갤러리 설정과 동일한 관례).
          ...(next.timeline_orientation ? { timelineOrientation: next.timeline_orientation } : {}),
          timelineShowPreview: next.timeline_show_preview,
          ...(next.timeline_accent_color_hex ? { timelineAccentColorHex: next.timeline_accent_color_hex } : {}),
          ...(next.timeline_line_width_px ? { timelineLineWidthPx: next.timeline_line_width_px } : {}),
          ...(next.timeline_marker_size_px ? { timelineMarkerSizePx: next.timeline_marker_size_px } : {}),
          ...(next.timeline_card_theme ? { timelineCardTheme: next.timeline_card_theme } : {}),
          // HOTFIX-093-B(요구사항 1.3)/HOTFIX-099: 값이 전부 미지정이면
          // postMetaStyle 자체를 저장하지 않는다(PostDetailHeader가
          // undefined일 때 기존 기본 스타일을 그대로 쓰도록 이미 구현돼 있음).
          ...(next.post_meta_date_size_px ||
          next.post_meta_date_color_hex ||
          next.post_meta_font_weight ||
          next.post_meta_position ||
          next.post_meta_post_number_size_px ||
          next.post_meta_post_number_color_hex ||
          next.post_meta_author_name_size_px ||
          next.post_meta_author_name_color_hex
            ? {
                postMetaStyle: {
                  ...(next.post_meta_date_size_px ? { dateSizePx: next.post_meta_date_size_px } : {}),
                  ...(next.post_meta_date_color_hex ? { dateColorHex: next.post_meta_date_color_hex } : {}),
                  ...(next.post_meta_font_weight ? { fontWeight: next.post_meta_font_weight } : {}),
                  ...(next.post_meta_position ? { position: next.post_meta_position } : {}),
                  ...(next.post_meta_post_number_size_px
                    ? { postNumberSizePx: next.post_meta_post_number_size_px }
                    : {}),
                  ...(next.post_meta_post_number_color_hex
                    ? { postNumberColorHex: next.post_meta_post_number_color_hex }
                    : {}),
                  ...(next.post_meta_author_name_size_px
                    ? { authorNameSizePx: next.post_meta_author_name_size_px }
                    : {}),
                  ...(next.post_meta_author_name_color_hex
                    ? { authorNameColorHex: next.post_meta_author_name_color_hex }
                    : {}),
                },
              }
            : {}),
          // EPIC-096(요구사항 3.1): 기본 순서와 같으면 저장하지 않는다(다른
          // widget_settings 필드들과 동일한 관례 — 값이 없으면
          // PostDetailClient가 하드코딩된 기본 순서를 그대로 쓴다).
          ...(next.post_layout_order.join(",") !== DEFAULT_POST_LAYOUT_ORDER.join(",")
            ? { postLayoutOrder: next.post_layout_order }
            : {}),
        },
      }),
    });

    const data = await res.json();
    setSubmitting(false);

    if (!res.ok) {
      setSubmitError(data.error ?? "저장에 실패했어요.");
      return;
    }
  }

  async function handleDelete() {
    if (!session) return;
    setDeleting(true);
    const res = await fetch(`/api/admin/boards/${id}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${session.access_token}` },
    });
    const data = await res.json();
    setDeleting(false);

    if (!res.ok) {
      setDeleteOpen(false);
      setSubmitError(data.error ?? "삭제에 실패했어요.");
      return;
    }

    router.push("/admin/site-structure");
  }

  if (loadError) {
    return (
      <main className="flex-1 px-8 pb-8 max-w-5xl mx-auto w-full">
        <div className="rounded-lg border border-red-300 bg-red-50 p-3 text-sm text-red-700 mt-6">
          {loadError}
        </div>
      </main>
    );
  }

  if (!values) {
    return (
      <main className="flex-1 px-8 pb-8 max-w-5xl mx-auto w-full">
        <p className="text-gray-500 pt-6">불러오는 중...</p>
      </main>
    );
  }

  return (
    <main className="flex-1 px-8 pb-8 max-w-5xl mx-auto w-full">
      <div className="flex items-center justify-between mb-6 pt-2">
        <h1 className="text-2xl font-bold">게시판 수정</h1>
        <div className="flex gap-2">
          <a
            href={`/boards/${boardSlug ?? id}`}
            target="_blank"
            rel="noreferrer"
            className="rounded-md border border-gray-300 px-3 py-1.5 text-sm hover:bg-gray-50"
          >
            미리보기 (저장된 화면)
          </a>
          <button
            type="button"
            onClick={() => setDeleteOpen(true)}
            className="rounded-md border border-red-300 px-3 py-1.5 text-sm text-red-600 hover:bg-red-50"
          >
            삭제
          </button>
        </div>
      </div>

      <BoardForm
        mode="edit"
        initial={values}
        submitting={submitting}
        submitError={submitError}
        onSubmit={handleSubmit}
        boardId={id}
      />

      <ConfirmModal
        open={deleteOpen}
        title="게시판 삭제"
        message={`"${values.name}" 게시판을 정말 삭제하시겠습니까?`}
        confirmLabel={deleting ? "삭제 중..." : "삭제"}
        onConfirm={handleDelete}
        onCancel={() => setDeleteOpen(false)}
      />
    </main>
  );
}
