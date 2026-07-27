"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useParams } from "next/navigation";
import { useAuth } from "@/lib/AuthProvider";
import { PostDetailHeader } from "@/components/boards/PostDetailHeader";
import { PostTags } from "@/components/boards/PostTags";
import { CommentSection } from "@/components/boards/CommentSection";

type PostDetail = {
  id: string;
  title: string;
  body: string;
  is_docent_post: boolean;
  like_count: number;
  is_best: boolean;
  photo_url: string | null;
  author_name: string;
  created_at: string;
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
  author_name: string;
  created_at: string;
};

export default function PostDetailPage() {
  const { id, postId } = useParams<{ id: string; postId: string }>();
  const { session, loading: authLoading } = useAuth();

  const [board, setBoard] = useState<Board | null>(null);
  const [post, setPost] = useState<PostDetail | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [likedByMe, setLikedByMe] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fetching, setFetching] = useState(true);

  const [commentBody, setCommentBody] = useState("");
  const [commentSubmitting, setCommentSubmitting] = useState(false);
  const [likeSubmitting, setLikeSubmitting] = useState(false);

  async function load() {
    setFetching(true);
    setError(null);

    const res = await fetch(`/api/boards/${id}/posts/${postId}`, {
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
    setFetching(false);
  }

  useEffect(() => {
    if (authLoading) return;
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, postId, session, authLoading]);

  async function handleLike() {
    setLikeSubmitting(true);

    const res = await fetch(`/api/boards/${id}/posts/${postId}/like`, {
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

  async function handleComment(e: FormEvent) {
    e.preventDefault();
    setCommentSubmitting(true);

    const res = await fetch(`/api/boards/${id}/posts/${postId}/comments`, {
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

  // EPIC-046: 별도 태그 컬럼이 없어 게시판 카테고리/도슨트·개념글 여부를
  // 태그처럼 파생 표시(자세한 배경은 PostTags.tsx 참고).
  const derivedTags = [
    board?.category,
    post.is_docent_post ? "도슨트" : null,
    post.is_best ? "개념글" : null,
  ].filter((t): t is string => Boolean(t));

  return (
    <main className="flex-1 bg-white px-6 py-12">
      <div className="max-w-4xl mx-auto w-full">
        <PostDetailHeader
          postNumber={post.post_number}
          createdAt={post.created_at}
          title={post.title}
          authorName={post.author_name}
          photoUrl={post.photo_url}
        />

        <div className="max-w-2xl mx-auto w-full">
          <PostTags tags={derivedTags} />

          <p className="text-gray-800 leading-relaxed whitespace-pre-wrap mt-8 text-[15px]">
            {post.body}
          </p>

          <button
            onClick={handleLike}
            disabled={likeSubmitting}
            className={`mt-8 rounded-md px-4 py-2 text-sm border ${
              likedByMe
                ? "bg-red-50 border-red-300 text-red-600"
                : "bg-white border-gray-300 text-gray-700"
            }`}
          >
            {likedByMe ? "♥" : "♡"} 좋아요 {post.like_count}
          </button>

          {error && <p className="text-sm text-red-600 mt-2">{error}</p>}

          <CommentSection
            comments={comments}
            commentBody={commentBody}
            onCommentBodyChange={setCommentBody}
            onSubmit={handleComment}
            submitting={commentSubmitting}
          />
        </div>
      </div>
    </main>
  );
}
