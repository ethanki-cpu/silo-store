"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useParams } from "next/navigation";
import { useAuth } from "@/lib/AuthProvider";

type PostDetail = {
  id: string;
  title: string;
  body: string;
  is_docent_post: boolean;
  like_count: number;
  is_best: boolean;
  author_name: string;
  created_at: string;
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
    return <main className="flex-1 p-8">불러오는 중...</main>;
  }

  if (error && !post) {
    return (
      <main className="flex-1 p-8">
        <p className="text-red-600">{error}</p>
      </main>
    );
  }

  if (!post) return null;

  return (
    <main className="flex-1 p-8 max-w-2xl mx-auto w-full">
      <div className="flex items-center gap-2 mb-2">
        {post.is_best && (
          <span className="text-xs font-semibold bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded">
            개념글
          </span>
        )}
        {post.is_docent_post && (
          <span className="text-xs font-semibold bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded">
            도슨트
          </span>
        )}
      </div>

      <h1 className="text-2xl font-bold">{post.title}</h1>
      <p className="text-xs text-gray-500 mt-1">
        {post.author_name} · {new Date(post.created_at).toLocaleString()}
      </p>

      <p className="text-gray-800 whitespace-pre-wrap mt-6">{post.body}</p>

      <button
        onClick={handleLike}
        disabled={likeSubmitting}
        className={`mt-6 rounded-md px-4 py-2 text-sm border ${
          likedByMe
            ? "bg-red-50 border-red-300 text-red-600"
            : "bg-white border-gray-300 text-gray-700"
        }`}
      >
        {likedByMe ? "♥" : "♡"} 좋아요 {post.like_count}
      </button>

      {error && <p className="text-sm text-red-600 mt-2">{error}</p>}

      <h2 className="text-lg font-semibold mt-10 mb-3">
        댓글 {comments.length}
      </h2>

      <form onSubmit={handleComment} className="flex gap-2 mb-4">
        <input
          type="text"
          required
          value={commentBody}
          onChange={(e) => setCommentBody(e.target.value)}
          placeholder="댓글을 입력하세요"
          className="flex-1 rounded-md border border-gray-300 px-3 py-2 text-sm"
        />
        <button
          type="submit"
          disabled={commentSubmitting}
          className="rounded-md bg-gray-800 text-white px-3 py-2 text-sm disabled:opacity-50"
        >
          등록
        </button>
      </form>

      <div className="space-y-3">
        {comments.map((c) => (
          <div key={c.id} className="border-b border-gray-100 pb-2">
            <p className="text-sm text-gray-800">{c.body}</p>
            <p className="text-xs text-gray-400 mt-1">
              {c.author_name} · {new Date(c.created_at).toLocaleString()}
            </p>
          </div>
        ))}
      </div>
    </main>
  );
}
