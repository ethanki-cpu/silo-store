"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/lib/AuthProvider";
import { PostForm, type PostFormSubmitPayload } from "@/components/boards/PostForm";
import type { JSONContent } from "@/lib/blockEditorCore";

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
  } | null>(null);
  const [board, setBoard] = useState<{ board_type: string; category: string | null } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

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
        if (!member || data.post.author_id !== member.id) {
          setNotAllowed(true);
          setLoadingPost(false);
          return;
        }
        setPost(data.post);
        setBoard(data.board);
        setLoadingPost(false);
      });
  }, [id, postId, session, member, memberLoading]);

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
        initialTitle={post.title}
        initialBodyJson={post.body_json}
        initialLegacyHtml={post.body_json ? undefined : post.body}
        initialTags={post.tags ?? []}
        initialIsDocentPost={post.is_docent_post}
        initialFeaturedImageUrl={post.featured_image_url}
        initialFeaturedImagePath={post.featured_image_path}
        draftStorageKey={`draft-edit-${postId}`}
        submitLabel="수정 완료"
        onSubmit={handleSubmit}
        submitting={submitting}
        error={error}
      />
    </main>
  );
}
