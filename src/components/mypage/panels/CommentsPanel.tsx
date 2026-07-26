"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { EmptyState } from "../EmptyState";

type RecentComment = {
  id: string;
  body: string;
  created_at: string;
  post_title: string | null;
  board_name: string | null;
};

export function CommentsPanel({ memberId }: { memberId: string }) {
  const [comments, setComments] = useState<RecentComment[]>([]);
  const [loadingData, setLoadingData] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      const { data } = await supabase
        .from("comments")
        .select("id, body, created_at, posts(title, boards(name))")
        .eq("author_id", memberId)
        .order("created_at", { ascending: false })
        .limit(30);

      if (cancelled) return;

      const rows = (data ?? []) as unknown as {
        id: string;
        body: string;
        created_at: string;
        posts: { title: string | null; boards: { name: string } | null } | null;
      }[];

      setComments(
        rows.map((c) => ({
          id: c.id,
          body: c.body,
          created_at: c.created_at,
          post_title: c.posts?.title ?? null,
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
    return <EmptyState message="아직 작성한 댓글이 없어요." />;
  }

  return (
    <div className="space-y-2">
      {comments.map((c) => (
        <div key={c.id} className="rounded-lg border border-gray-200 p-3">
          <p className="text-gray-800">{c.body}</p>
          <p className="text-xs text-gray-400 mt-2">
            {c.board_name ?? c.post_title ?? "게시글"}
            {c.post_title ? ` · ${c.post_title}` : ""} ·{" "}
            {new Date(c.created_at).toLocaleString()}
          </p>
        </div>
      ))}
    </div>
  );
}
