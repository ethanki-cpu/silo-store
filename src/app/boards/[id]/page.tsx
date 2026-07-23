"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/lib/AuthProvider";

type Post = {
  id: string;
  title: string;
  is_docent_post: boolean;
  like_count: number;
  is_best: boolean;
  author_name: string;
  created_at: string;
  is_answered?: boolean;
};

type Board = {
  id: string;
  name: string;
  category: string | null;
  board_type: string;
};

export default function BoardPostsPage() {
  const { id } = useParams<{ id: string }>();
  const { session, loading: authLoading } = useAuth();
  const [board, setBoard] = useState<Board | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [fetching, setFetching] = useState(true);

  useEffect(() => {
    if (authLoading) return;

    async function load() {
      setFetching(true);
      setError(null);

      const res = await fetch(`/api/boards/${id}/posts`, {
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
      setPosts(data.posts);
      setFetching(false);
    }

    load();
  }, [id, session, authLoading]);

  if (fetching) {
    return <main className="flex-1 p-8">불러오는 중...</main>;
  }

  if (error) {
    return (
      <main className="flex-1 p-8">
        <p className="text-red-600">{error}</p>
      </main>
    );
  }

  return (
    <main className="flex-1 p-8 max-w-2xl mx-auto w-full">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">{board?.name}</h1>
        <Link
          href={`/boards/${id}/write`}
          className="rounded-md bg-gray-800 text-white px-3 py-1.5 text-sm"
        >
          글쓰기
        </Link>
      </div>

      {posts.length === 0 ? (
        <p className="text-gray-500">아직 게시글이 없어요.</p>
      ) : (
        <div className="space-y-2">
          {posts.map((post) => (
            <Link
              key={post.id}
              href={`/boards/${id}/${post.id}`}
              className="block rounded-lg border border-gray-200 p-3 hover:shadow-md transition-shadow"
            >
              <div className="flex items-center gap-2">
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
                {board?.board_type === "qna" && (
                  <span
                    className={`text-xs font-semibold px-1.5 py-0.5 rounded ${
                      post.is_answered
                        ? "bg-green-100 text-green-700"
                        : "bg-gray-100 text-gray-500"
                    }`}
                  >
                    {post.is_answered ? "답변완료" : "답변대기"}
                  </span>
                )}
                <h2 className="font-medium">{post.title}</h2>
              </div>
              <p className="text-xs text-gray-500 mt-1">
                {post.author_name} · 좋아요 {post.like_count} ·{" "}
                {new Date(post.created_at).toLocaleString()}
              </p>
            </Link>
          ))}
        </div>
      )}
    </main>
  );
}
