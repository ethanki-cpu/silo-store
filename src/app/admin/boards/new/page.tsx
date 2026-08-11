"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/AuthProvider";
import { BoardForm, DEFAULT_BOARD_FORM_VALUES, type BoardFormValues } from "@/components/admin/BoardForm";

export default function AdminBoardNewPage() {
  const { session } = useAuth();
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  async function handleSubmit(values: BoardFormValues) {
    if (!session) return;
    setSubmitting(true);
    setSubmitError(null);

    const res = await fetch("/api/admin/boards", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({
        name: values.name,
        category: values.category,
        description: values.description || null,
        group_key: values.group_key || null,
        render_type: values.render_type || null,
        default_card_type: values.default_card_type || null,
        is_public: values.is_public,
        use_search: values.use_search,
        use_like: values.use_like,
        use_comment: values.use_comment,
        use_view_count: values.use_view_count,
        default_page_size: values.default_page_size,
        default_sort: values.default_sort,
        widget_settings: {
          ...(values.gallery_layout ? { galleryLayout: values.gallery_layout } : {}),
          ...(values.gallery_columns ? { galleryColumns: values.gallery_columns } : {}),
          galleryHoverAutoSlide: values.gallery_hover_auto_slide,
          ...(values.timeline_orientation ? { timelineOrientation: values.timeline_orientation } : {}),
          timelineShowPreview: values.timeline_show_preview,
          ...(values.post_meta_date_size_px ||
          values.post_meta_date_color_hex ||
          values.post_meta_font_weight ||
          values.post_meta_position ||
          values.post_meta_post_number_size_px ||
          values.post_meta_post_number_color_hex ||
          values.post_meta_author_name_size_px ||
          values.post_meta_author_name_color_hex
            ? {
                postMetaStyle: {
                  ...(values.post_meta_date_size_px ? { dateSizePx: values.post_meta_date_size_px } : {}),
                  ...(values.post_meta_date_color_hex ? { dateColorHex: values.post_meta_date_color_hex } : {}),
                  ...(values.post_meta_font_weight ? { fontWeight: values.post_meta_font_weight } : {}),
                  ...(values.post_meta_position ? { position: values.post_meta_position } : {}),
                  ...(values.post_meta_post_number_size_px
                    ? { postNumberSizePx: values.post_meta_post_number_size_px }
                    : {}),
                  ...(values.post_meta_post_number_color_hex
                    ? { postNumberColorHex: values.post_meta_post_number_color_hex }
                    : {}),
                  ...(values.post_meta_author_name_size_px
                    ? { authorNameSizePx: values.post_meta_author_name_size_px }
                    : {}),
                  ...(values.post_meta_author_name_color_hex
                    ? { authorNameColorHex: values.post_meta_author_name_color_hex }
                    : {}),
                },
              }
            : {}),
        },
      }),
    });

    const data = await res.json();
    setSubmitting(false);

    if (!res.ok) {
      setSubmitError(data.error ?? "게시판 생성에 실패했어요.");
      return;
    }

    router.push(`/admin/boards/${data.id}`);
  }

  return (
    <main className="flex-1 px-8 pb-8 max-w-5xl mx-auto w-full">
      <h1 className="text-2xl font-bold mb-6 pt-2">새 게시판 만들기</h1>
      <BoardForm
        mode="create"
        initial={DEFAULT_BOARD_FORM_VALUES}
        submitting={submitting}
        submitError={submitError}
        onSubmit={handleSubmit}
      />
    </main>
  );
}
