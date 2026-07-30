"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/lib/AuthProvider";
import type { BoardPost } from "@/lib/boardLayout";

// EPIC-075: 게시글 상세 화면 하단에 "이 게시판의 다른 글" 목록을 항상 함께
// 보여줘 뒤로가기 없이 다른 글로 바로 이동할 수 있게 한다. `BoardModule`
// 전체(검색/정렬/헤더 포함)를 그대로 다시 넣으면 상세 화면 안에 또 다른
// 게시판 화면이 통째로 얹히는 셈이라 무거워서, 목록 + 현재 글 하이라이트만
// 담당하는 가벼운 전용 컴포넌트로 새로 만들었다 — 기존 게시글 목록 API
// (`GET /api/boards/[id]/posts`)를 그대로 재사용한다(새 API 없음).
export function BoardPostListPanel({
  boardId,
  currentPostId,
}: {
  boardId: string;
  currentPostId: string;
}) {
  const { session } = useAuth();
  const [posts, setPosts] = useState<BoardPost[]>([]);
  const [fetching, setFetching] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setFetching(true);

    fetch(`/api/boards/${boardId}/posts?page=1&sort=latest&q=`, {
      headers: session ? { Authorization: `Bearer ${session.access_token}` } : {},
    })
      .then((res) => res.json())
      .then((data) => {
        if (cancelled) return;
        setPosts(Array.isArray(data.posts) ? data.posts : []);
        setFetching(false);
      })
      .catch(() => {
        if (!cancelled) setFetching(false);
      });

    return () => {
      cancelled = true;
    };
  }, [boardId, session]);

  if (fetching || posts.length === 0) return null;

  return (
    <section className="mt-12 border-t border-gray-200 pt-8">
      <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
        이 게시판의 다른 글
      </h2>
      <div className="divide-y divide-gray-100 text-sm">
        {posts.map((post) => {
          const isCurrent = post.id === currentPostId;
          return (
            <Link
              key={post.id}
              href={`/boards/${boardId}/${post.id}`}
              className={`flex items-center gap-3 py-2.5 rounded-md ${
                isCurrent ? "bg-amber-50 border border-amber-200 px-3 -mx-3" : "hover:bg-gray-50 px-3 -mx-3"
              }`}
            >
              <span
                className={`min-w-0 flex-1 truncate ${
                  isCurrent ? "font-semibold text-gray-900" : "text-gray-700"
                }`}
              >
                {isCurrent && "▶ "}
                {post.title}
              </span>
              <span className="hidden sm:block w-20 shrink-0 truncate text-xs text-gray-400 text-right">
                {post.author_name}
              </span>
              <span className="w-20 shrink-0 text-xs text-gray-400 text-right tabular-nums">
                {new Date(post.created_at).toLocaleDateString()}
              </span>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
