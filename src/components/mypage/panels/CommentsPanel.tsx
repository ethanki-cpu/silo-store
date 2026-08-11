"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";
import { EmptyState } from "@/components/modules/EmptyState";

type RecentComment = {
  id: string;
  body: string;
  created_at: string;
  post_id: string | null;
  post_slug: string | null;
  post_title: string | null;
  post_like_count: number | null;
  board_id: string | null;
  board_slug: string | null;
  board_name: string | null;
};

// EPIC-052: "내가 쓴 댓글" — 기존 목록에 "원글 이동" 링크를 추가하려면
// post_id/board_id가 필요해 select를 확장했다(댓글 자체에는 좋아요 개념이
// 없어, "좋아요 수"는 원글의 like_count로 표시 — 새 스키마 추측 없음).
export function CommentsPanel({ memberId }: { memberId: string }) {
  const [comments, setComments] = useState<RecentComment[]>([]);
  const [loadingData, setLoadingData] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      const { data } = await supabase
        .from("comments")
        .select(
          "id, body, created_at, posts(id, slug, title, like_count, board_id, boards(name, slug))",
        )
        .eq("author_id", memberId)
        .order("created_at", { ascending: false })
        .limit(30);

      if (cancelled) return;

      const rows = (data ?? []) as unknown as {
        id: string;
        body: string;
        created_at: string;
        posts: {
          id: string;
          slug: string | null;
          title: string | null;
          like_count: number;
          board_id: string | null;
          boards: { name: string; slug: string | null } | null;
        } | null;
      }[];

      setComments(
        rows.map((c) => ({
          id: c.id,
          body: c.body,
          created_at: c.created_at,
          post_id: c.posts?.id ?? null,
          post_slug: c.posts?.slug ?? null,
          post_title: c.posts?.title ?? null,
          post_like_count: c.posts?.like_count ?? null,
          board_id: c.posts?.board_id ?? null,
          board_slug: c.posts?.boards?.slug ?? null,
          board_name: c.posts?.boards?.name ?? null,
        })),
      );
      setLoadingData(false);
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [memberId]);

  if (loadingData) return <p className="text-gray-500">불러오는 중...</p>;
  if (comments.length === 0) {
    return <EmptyState title="아직 작성한 댓글이 없어요." />;
  }

  return (
    <div className="space-y-2">
      {comments.map((c) => {
        const content = (
          <>
            <p className="text-gray-800">{c.body}</p>
            <p className="text-xs text-gray-400 mt-2">
              {c.board_name ?? c.post_title ?? "게시글"}
              {c.post_title ? ` · ${c.post_title}` : ""}
              {c.post_like_count !== null && ` · 좋아요 ${c.post_like_count}`}{" "}
              · {new Date(c.created_at).toLocaleString()}
            </p>
          </>
        );

        return c.board_id && c.post_id ? (
          <Link
            key={c.id}
            href={`/boards/${c.board_slug ?? c.board_id}/${c.post_slug ?? c.post_id}`}
            className="block rounded-lg border border-gray-200 p-3 hover:shadow-md transition-shadow"
          >
            {content}
          </Link>
        ) : (
          <div key={c.id} className="rounded-lg border border-gray-200 p-3">
            {content}
          </div>
        );
      })}
    </div>
  );
}
