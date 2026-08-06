"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/lib/AuthProvider";
import type { JSONContent } from "@/lib/blockEditorCore";
import { PostDetailHeader } from "@/components/boards/PostDetailHeader";
import { PostTags } from "@/components/boards/PostTags";
import { PostActions } from "@/components/boards/PostActions";
import { PostBody } from "@/components/boards/PostBody";
import { CommentSection } from "@/components/boards/CommentSection";
import { BoardPostListPanel } from "@/components/boards/BoardPostListPanel";
import { resolveBoardDefinition } from "@/lib/boardLayout";
import { PageEditButton } from "@/components/admin/PageEditButton";

type PostDetail = {
  id: string;
  slug?: string;
  title: string;
  body: string;
  is_docent_post: boolean;
  like_count: number;
  is_best: boolean;
  photo_url: string | null;
  body_json: JSONContent | null;
  featured_image_url: string | null;
  thumbnail_visible: boolean | null;
  tags: string[] | null;
  view_count: number | null;
  author_id: string;
  author_name: string;
  created_at: string;
  updated_at?: string;
  post_number: number | null;
};

type Board = {
  id: string;
  name: string;
  category: string | null;
  board_type: string;
};

type Comment = {
  id: string;
  body: string;
  author_id: string;
  author_name: string;
  created_at: string;
};

// EPIC-079-PHASE-2: URL이 UUID(/boards/[id]/[postId])에서 slug
// (/boards/[board_slug]/[post_slug])로 바뀌었다 — 이 페이지 자체는 slug를
// 그대로 API에 전달하기만 하면 되고(API가 내부적으로 slug→실제 id를
// 해석), 하위 액션(좋아요/북마크/댓글/삭제)도 같은 board_slug/post_slug
// 경로를 재사용한다.
export default function PostDetailPage() {
  const { board_slug: boardSlug, post_slug: postSlug } = useParams<{
    board_slug: string;
    post_slug: string;
  }>();
  const { session, member, loading: authLoading } = useAuth();
  const router = useRouter();
  const [deleting, setDeleting] = useState(false);

  const [board, setBoard] = useState<Board | null>(null);
  const [post, setPost] = useState<PostDetail | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [likedByMe, setLikedByMe] = useState(false);
  const [bookmarkedByMe, setBookmarkedByMe] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fetching, setFetching] = useState(true);

  const [commentBody, setCommentBody] = useState("");
  const [commentSubmitting, setCommentSubmitting] = useState(false);
  const [likeSubmitting, setLikeSubmitting] = useState(false);
  const [bookmarkSubmitting, setBookmarkSubmitting] = useState(false);

  async function load() {
    setFetching(true);
    setError(null);

    const res = await fetch(`/api/boards/${boardSlug}/posts/${postSlug}`, {
      headers: session
        ? { Authorization: `Bearer ${session.access_token}` }
        : {},
    });

    const data = await res.json();

    if (!res.ok) {
      setError(data.error ?? "게시글을 불러오지 못했어요.");
      setFetching(false);
      return;
    }

    setBoard(data.board);
    setPost(data.post);
    setComments(data.comments);
    setLikedByMe(data.likedByMe);
    setBookmarkedByMe(data.bookmarkedByMe);
    setFetching(false);
  }

  useEffect(() => {
    if (authLoading) return;
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [boardSlug, postSlug, session, authLoading]);

  async function handleLike() {
    setLikeSubmitting(true);

    const res = await fetch(`/api/boards/${boardSlug}/posts/${postSlug}/like`, {
      method: "POST",
      headers: session
        ? { Authorization: `Bearer ${session.access_token}` }
        : {},
    });

    const data = await res.json();
    setLikeSubmitting(false);

    if (!res.ok) {
      setError(data.error);
      return;
    }

    setLikedByMe(data.liked);
    setPost((prev) =>
      prev
        ? {
            ...prev,
            like_count: data.likeCount,
            is_best: prev.is_best || Boolean(data.promoted),
          }
        : prev,
    );
  }

  async function handleBookmark() {
    if (!session) {
      setError("로그인이 필요해요.");
      return;
    }

    setBookmarkSubmitting(true);

    const res = await fetch(`/api/boards/${boardSlug}/posts/${postSlug}/bookmark`, {
      method: "POST",
      headers: { Authorization: `Bearer ${session.access_token}` },
    });

    const data = await res.json();
    setBookmarkSubmitting(false);

    if (!res.ok) {
      setError(data.error ?? "북마크 기능을 아직 사용할 수 없어요.");
      return;
    }

    setBookmarkedByMe(data.bookmarked);
  }

  async function handleComment(e: FormEvent) {
    e.preventDefault();
    setCommentSubmitting(true);

    const res = await fetch(`/api/boards/${boardSlug}/posts/${postSlug}/comments`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(session
          ? { Authorization: `Bearer ${session.access_token}` }
          : {}),
      },
      body: JSON.stringify({ body: commentBody }),
    });

    const data = await res.json();
    setCommentSubmitting(false);

    if (!res.ok) {
      setError(data.error);
      return;
    }

    setCommentBody("");
    load();
  }

  async function handleDelete() {
    if (!window.confirm("이 글을 삭제할까요? 되돌릴 수 없어요.")) return;

    setDeleting(true);
    const res = await fetch(`/api/boards/${boardSlug}/posts/${postSlug}`, {
      method: "DELETE",
      headers: session ? { Authorization: `Bearer ${session.access_token}` } : {},
    });

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "삭제에 실패했어요.");
      setDeleting(false);
      return;
    }

    router.push(`/boards/${boardSlug}`);
  }

  if (fetching) {
    return <main className="flex-1 p-8 bg-white">불러오는 중...</main>;
  }

  if (error && !post) {
    return (
      <main className="flex-1 p-8 bg-white">
        <p className="text-red-600">{error}</p>
      </main>
    );
  }

  if (!post) return null;

  // Board Definition System(EPIC-047): 좋아요/북마크/댓글 노출 여부는 이
  // 정의 하나로 결정한다(board_type별 하드코딩 분기 없음).
  const definition = resolveBoardDefinition(
    board ?? { board_type: "topic", category: null },
  );

  // EPIC-046/047: 별도 태그 컬럼 값(post.tags)에 게시판 카테고리/도슨트·
  // 개념글 여부를 함께 얹어 보여준다.
  const displayTags = [
    ...(post.tags ?? []),
    board?.category,
    post.is_docent_post ? "도슨트" : null,
    post.is_best ? "개념글" : null,
  ].filter((t): t is string => Boolean(t));

  return (
    <>
      <PageEditButton slug="boards-id-postid" />
      <main className="flex-1 bg-white px-6 py-12">
      <div className="max-w-4xl mx-auto w-full">
        <PostDetailHeader
          postNumber={post.post_number}
          createdAt={post.created_at}
          updatedAt={post.updated_at}
          title={post.title}
          authorId={post.author_id}
          authorName={post.author_name}
          likeCount={post.like_count}
          viewCount={post.view_count}
          commentCount={comments.length}
          showLikes={definition.likes}
          showComments={definition.comments}
          showViewCount={definition.showViewCount}
          editHref={
            member?.id === post.author_id || member?.is_admin
              ? `/boards/${boardSlug}/${postSlug}/edit`
              : undefined
          }
          onDelete={member?.id === post.author_id || member?.is_admin ? handleDelete : undefined}
          deleting={deleting}
        />

        <div className="max-w-2xl mx-auto w-full">
          <PostTags tags={displayTags} />

          <PostBody body={post.body} />

          <PostActions
            likeCount={post.like_count}
            likedByMe={likedByMe}
            onToggleLike={handleLike}
            likeSubmitting={likeSubmitting}
            showLike={definition.likes}
            bookmarkedByMe={bookmarkedByMe}
            onToggleBookmark={handleBookmark}
            bookmarkSubmitting={bookmarkSubmitting}
            showBookmark={definition.bookmarks}
          />

          {error && <p className="text-sm text-red-600 mt-2">{error}</p>}

          {definition.comments && (
            <CommentSection
              comments={comments}
              commentBody={commentBody}
              onCommentBodyChange={setCommentBody}
              onSubmit={handleComment}
              submitting={commentSubmitting}
            />
          )}

          <BoardPostListPanel boardId={boardSlug} currentPostId={postSlug} />
        </div>
      </div>
      </main>
    </>
  );
}
