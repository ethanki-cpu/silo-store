"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/lib/AuthProvider";
import { PostForm, type PostFormSubmitPayload } from "@/components/boards/PostForm";
import type { JSONContent } from "@/lib/blockEditorCore";
import { resolveBoardDefinition, getPostCategories } from "@/lib/boardLayout";

// EPIC-053.1: 게시글 수정 — Board Engine의 모든 게시판이 write와 동일한
// PostForm/BlockEditor를 재사용한다(새 Editor 생성 금지). JSON Block이
// 정본이므로 body_json을 그대로 에디터에 복원한다.
export default function EditPostPage() {
  const { id, postId } = useParams<{ id: string; postId: string }>();
  const { session, member, memberLoading } = useAuth();
  const router = useRouter();

  const [loadingPost, setLoadingPost] = useState(true);
  const [notAllowed, setNotAllowed] = useState(false);
  const [post, setPost] = useState<{
    title: string;
    body: string;
    body_json: JSONContent | null;
    tags: string[] | null;
    is_docent_post: boolean;
    author_id: string;
    featured_image_url: string | null;
    featured_image_path: string | null;
    thumbnail_visible: boolean | null;
    category: string | null;
  } | null>(null);
  const [board, setBoard] = useState<{ board_type: string; category: string | null } | null>(null);
  const [existingTags, setExistingTags] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (memberLoading) return;

    fetch(`/api/boards/${id}/posts/${postId}`, {
      headers: session ? { Authorization: `Bearer ${session.access_token}` } : {},
    })
      .then((res) => res.json())
      .then((data) => {
        if (!data.post) {
          setLoadingPost(false);
          return;
        }
        // 관리자는 본인 글이 아니어도 수정할 수 있다(PATCH API도 동일하게
        // 허용) — 이전에는 client-side 게이트가 이 예외를 놓쳐 실제 admin도
        // 여기서 막혔었다.
        if (!member || (data.post.author_id !== member.id && !member.is_admin)) {
          setNotAllowed(true);
          setLoadingPost(false);
          return;
        }
        // AuthProvider의 session/member 로딩 타이밍에 따라 이 effect가
        // member=null인 상태로 먼저 한 번 돌아 notAllowed=true를 남겼다가,
        // member가 뒤늦게 채워져 다시 성공적으로 돌 수 있다(AuthProvider.tsx
        // 수정으로 이 레이스 자체는 줄였지만, 남아있는 재실행 케이스에서도
        // notAllowed가 true로 고정된 채 남지 않도록 성공 경로에서 명시적으로
        // 되돌린다 — render가 notAllowed를 post 유무보다 먼저 체크하므로.
        setNotAllowed(false);
        setPost(data.post);
        setBoard(data.board);
        setLoadingPost(false);
      });
  }, [id, postId, session, member, memberLoading]);

  useEffect(() => {
    fetch(`/api/boards/${id}/posts?pageSize=1`)
      .then((res) => res.json())
      .then((data) => setExistingTags(data.availableTags ?? []))
      .catch(() => {});
  }, [id]);

  async function handleSubmit(payload: PostFormSubmitPayload) {
    setError(null);
    setSubmitting(true);

    const res = await fetch(`/api/boards/${id}/posts/${postId}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        ...(session ? { Authorization: `Bearer ${session.access_token}` } : {}),
      },
      body: JSON.stringify({
        title: payload.title,
        bodyJson: payload.bodyJson,
        bodyHtml: payload.bodyHtml,
        featuredImageUrl: payload.featuredImageUrl,
        featuredImagePath: payload.featuredImagePath,
        thumbnailVisible: payload.thumbnailVisible,
        category: payload.category,
        isDocentPost: payload.isDocentPost,
        tags: payload.tags,
      }),
    });

    const data = await res.json();
    setSubmitting(false);

    if (!res.ok) {
      setError(data.error);
      return;
    }

    router.push(`/boards/${id}/${postId}`);
  }

  async function handleDelete() {
    if (!window.confirm("이 글을 삭제할까요? 되돌릴 수 없어요.")) return;

    setDeleting(true);
    const res = await fetch(`/api/boards/${id}/posts/${postId}`, {
      method: "DELETE",
      headers: session ? { Authorization: `Bearer ${session.access_token}` } : {},
    });

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "삭제에 실패했어요.");
      setDeleting(false);
      return;
    }

    router.push(`/boards/${id}`);
  }

  if (loadingPost || memberLoading) {
    return <main className="flex-1 p-8 bg-white">불러오는 중...</main>;
  }

  if (notAllowed) {
    return (
      <main className="flex-1 bg-white p-8 max-w-2xl mx-auto w-full">
        <p className="text-red-600">본인이 작성한 글만 수정할 수 있어요.</p>
      </main>
    );
  }

  if (!post) {
    return (
      <main className="flex-1 bg-white p-8 max-w-2xl mx-auto w-full">
        <p className="text-red-600">게시글을 찾을 수 없어요.</p>
      </main>
    );
  }

  return (
    <main className="flex-1 bg-white p-8 max-w-2xl mx-auto w-full">
      <h1 className="font-serif text-2xl font-bold mb-6">글 수정</h1>
      <PostForm
        mode="edit"
        boardId={id}
        boardType={board?.board_type ?? null}
        showTags={(post.tags ?? []).length > 0 || (post.tags != null)}
        categories={board ? getPostCategories(resolveBoardDefinition(board)) : undefined}
        existingTags={existingTags}
        initialTitle={post.title}
        initialBodyJson={post.body_json}
        initialLegacyHtml={post.body_json ? undefined : post.body}
        initialTags={post.tags ?? []}
        initialIsDocentPost={post.is_docent_post}
        initialFeaturedImageUrl={post.featured_image_url}
        initialFeaturedImagePath={post.featured_image_path}
        initialThumbnailVisible={post.thumbnail_visible ?? true}
        initialCategory={post.category}
        draftStorageKey={`draft-edit-${postId}`}
        submitLabel="수정 완료"
        onSubmit={handleSubmit}
        submitting={submitting}
        error={error}
      />

      <div className="mt-8 pt-6 border-t border-gray-100">
        <button
          type="button"
          onClick={handleDelete}
          disabled={deleting}
          className="text-sm text-red-600 hover:underline disabled:opacity-50"
        >
          {deleting ? "삭제 중..." : "글 삭제"}
        </button>
      </div>
    </main>
  );
}
