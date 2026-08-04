"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/lib/AuthProvider";
import { BoardForm, DEFAULT_BOARD_FORM_VALUES, type BoardFormValues } from "@/components/admin/BoardForm";
import { ConfirmModal } from "@/components/admin/ConfirmModal";

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
