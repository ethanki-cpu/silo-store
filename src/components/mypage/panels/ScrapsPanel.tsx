"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";
import { useAuth } from "@/lib/AuthProvider";
import { EmptyState } from "@/components/modules/EmptyState";
import { StoryCard } from "@/components/boards/StoryCard";
import { ScrapButton } from "@/components/common/ScrapButton";

type ScrapRow = {
  id: string;
  created_at: string;
  posts: {
    id: string;
    title: string;
    slug: string | null;
    board_id: string;
    featured_image_url: string | null;
    boards: { name: string; category: string | null; slug: string | null } | null;
  } | null;
};

type ScrapItem = {
  scrapId: string;
  postId: string;
  postSlug: string | null;
  boardId: string;
  boardSlug: string | null;
  boardName: string;
  category: string;
  title: string;
  imageUrl: string | null;
  createdAt: string;
};

// EPIC-085: Frictionless Archiving — user_scraps(EPIC-085) + posts + boards를
// 조인해 이 사용자가 스크랩한 게시글을 게시판(카테고리)별로 묶어 그리드로
// 보여준다. user_scraps.user_id는 members.id가 아니라 auth.uid()를 그대로
// 저장하므로(docs/sql/EPIC-085-user-scraps.sql 참고) session.user.id를 쓴다
// — 다른 mypage 패널들의 memberId(members.id)와는 다른 값이다.
export function ScrapsPanel() {
  const { session } = useAuth();
  const [items, setItems] = useState<ScrapItem[]>([]);
  const [loadingData, setLoadingData] = useState(true);

  useEffect(() => {
    if (!session) {
      setLoadingData(false);
      return;
    }
    let cancelled = false;

    async function load() {
      const { data } = await supabase
        .from("user_scraps")
        .select(
          "id, created_at, posts(id, title, slug, board_id, featured_image_url, boards(name, category, slug))",
        )
        .eq("user_id", session!.user.id)
        .order("created_at", { ascending: false });

      if (cancelled) return;

      const rows = (data ?? []) as unknown as ScrapRow[];
      setItems(
        rows
          .filter((r) => r.posts !== null)
          .map((r) => ({
            scrapId: r.id,
            postId: r.posts!.id,
            postSlug: r.posts!.slug,
            boardId: r.posts!.board_id,
            boardSlug: r.posts!.boards?.slug ?? null,
            boardName: r.posts!.boards?.name ?? "게시판",
            category: r.posts!.boards?.category ?? "기타",
            title: r.posts!.title,
            imageUrl: r.posts!.featured_image_url,
            createdAt: r.created_at,
          })),
      );
      setLoadingData(false);
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [session]);

  if (loadingData) return <p className="text-gray-500">불러오는 중...</p>;
  if (items.length === 0) {
    return <EmptyState title="아직 스크랩한 글이 없어요." />;
  }

  // 카테고리별 그리드로 묶어서 보여준다.
  const byCategory = new Map<string, ScrapItem[]>();
  for (const item of items) {
    const list = byCategory.get(item.category) ?? [];
    list.push(item);
    byCategory.set(item.category, list);
  }

  return (
    <div className="space-y-8">
      {Array.from(byCategory.entries()).map(([category, categoryItems]) => (
        <div key={category}>
          <h3 className="text-sm font-semibold text-gray-500 mb-3">{category}</h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            {categoryItems.map((item) => (
              <Link
                key={item.scrapId}
                href={`/boards/${item.boardSlug ?? item.boardId}/${item.postSlug ?? item.postId}`}
                className="block"
              >
                <StoryCard
                  photoUrl={item.imageUrl}
                  title={item.title}
                  meta={
                    <>
                      {item.boardName} · {new Date(item.createdAt).toLocaleDateString()}
                    </>
                  }
                  actions={
                    <span onClick={(e) => e.preventDefault()}>
                      <ScrapButton postId={item.postId} size="sm" />
                    </span>
                  }
                />
              </Link>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
