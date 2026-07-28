"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/lib/AuthProvider";
import { EmptyState } from "@/components/modules/EmptyState";

type ExhibitPost = {
  id: string;
  body: string;
  photo_url: string | null;
  like_count: number;
  created_at: string;
};

// EPIC-052: "나의 전시회" — 전용 전시 테이블이 없어(스키마 추측 금지),
// 마이피드(/me, EPIC-005)와 동일한 API(GET /api/members/[memberId]/posts,
// board_id IS NULL 개인 글)를 그대로 재사용하고 사진이 있는 글만 필터링해
// "내가 전시한 컬렉션"으로 보여준다 — 새 쿼리/테이블 없이 기존 개인 글
// 시스템을 재해석.
export function ExhibitionPanel({ memberId }: { memberId: string }) {
  const { session } = useAuth();
  const [posts, setPosts] = useState<ExhibitPost[]>([]);
  const [loadingData, setLoadingData] = useState(true);

  useEffect(() => {
    if (!session) return;

    let cancelled = false;

    fetch(`/api/members/${memberId}/posts`, {
      headers: { Authorization: `Bearer ${session.access_token}` },
    })
      .then((res) => res.json())
      .then((data) => {
        if (cancelled) return;
        const rows = (data.posts ?? []) as ExhibitPost[];
        setPosts(rows.filter((p) => p.photo_url));
        setLoadingData(false);
      });

    return () => {
      cancelled = true;
    };
  }, [memberId, session]);

  if (loadingData) return <p className="text-gray-500">불러오는 중...</p>;
  if (posts.length === 0) {
    return <EmptyState title="아직 사진과 함께 남긴 전시 글이 없어요." />;
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
      {posts.map((post) => (
        <div
          key={post.id}
          className="rounded-lg border border-gray-200 overflow-hidden"
        >
          {post.photo_url && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={post.photo_url}
              alt=""
              className="w-full aspect-square object-cover"
            />
          )}
          <div className="p-3">
            <p className="text-sm text-gray-800 line-clamp-2">{post.body}</p>
            <p className="text-xs text-gray-400 mt-1">
              좋아요 {post.like_count} ·{" "}
              {new Date(post.created_at).toLocaleDateString()}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}
