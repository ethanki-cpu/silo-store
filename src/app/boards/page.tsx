"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/lib/AuthProvider";

type Board = {
  id: string;
  name: string;
  category: string | null;
  board_type:
    | "topic"
    | "group"
    | "patron"
    | "artist_promo"
    | "adoption_story"
    | "archive"
    | "qna";
  locked: boolean;
  lockMessage: string | null;
};

const GROUP_LABELS: { key: string; title: string; match: (b: Board) => boolean }[] = [
  {
    key: "general",
    title: "자유게시판",
    match: (b) => b.board_type === "topic" && b.category === "general",
  },
  {
    key: "topic",
    title: "클럽 주제 게시판",
    match: (b) => b.board_type === "topic" && b.category !== "general",
  },
  { key: "group", title: "모임별 게시판", match: (b) => b.board_type === "group" },
  { key: "patron", title: "패트론 전용", match: (b) => b.board_type === "patron" },
  {
    key: "artist_promo",
    title: "아티스트 홍보",
    match: (b) => b.board_type === "artist_promo",
  },
  {
    key: "adoption_story",
    title: "After Adoption",
    match: (b) => b.board_type === "adoption_story",
  },
  {
    key: "archive",
    title: "자료게시판",
    match: (b) => b.board_type === "archive",
  },
  {
    key: "qna",
    title: "질문과 답변",
    match: (b) => b.board_type === "qna",
  },
];

export default function BoardsPage() {
  const { session, loading: authLoading } = useAuth();
  const [boards, setBoards] = useState<Board[]>([]);
  const [fetching, setFetching] = useState(true);

  useEffect(() => {
    if (authLoading) return;

    async function load() {
      setFetching(true);
      const res = await fetch("/api/boards", {
        headers: session
          ? { Authorization: `Bearer ${session.access_token}` }
          : {},
      });
      const data = await res.json();
      setBoards(Array.isArray(data) ? data : []);
      setFetching(false);
    }

    load();
  }, [session, authLoading]);

  if (fetching) {
    return <main className="flex-1 p-8">불러오는 중...</main>;
  }

  return (
    <main className="flex-1 p-8 max-w-3xl mx-auto w-full">
      <h1 className="text-2xl font-bold mb-6">게시판</h1>

      {GROUP_LABELS.map((group) => {
        const items = boards.filter(group.match);
        if (items.length === 0) return null;

        return (
          <section key={group.key} className="mb-8">
            <h2 className="text-sm font-semibold text-gray-500 mb-2">
              {group.title}
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {items.map((board) =>
                board.locked ? (
                  <div
                    key={board.id}
                    className="rounded-lg border border-gray-200 p-3 bg-gray-50 text-gray-400 cursor-not-allowed"
                  >
                    <p className="font-medium">🔒 {board.name}</p>
                    <p className="text-xs mt-1">{board.lockMessage}</p>
                  </div>
                ) : (
                  <Link
                    key={board.id}
                    href={`/boards/${board.id}`}
                    className="rounded-lg border border-gray-200 p-3 hover:shadow-md transition-shadow"
                  >
                    <p className="font-medium">{board.name}</p>
                  </Link>
                ),
              )}
            </div>
          </section>
        );
      })}
    </main>
  );
}
