"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/lib/AuthProvider";
import {
  BOARD_DEFINITIONS,
  BOARD_GROUP_ORDER,
  HUB_DEFINITION,
  resolveBoardDefinition,
  type HubFeed,
} from "@/lib/boardLayout";
import { BoardRenderer } from "@/components/boards/BoardRenderer";

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

const EMPTY_FEED: HubFeed = { latest: [], popular: [], recommended: [] };

export default function BoardsPage() {
  const { session, loading: authLoading } = useAuth();
  const [boards, setBoards] = useState<Board[]>([]);
  const [feed, setFeed] = useState<HubFeed>(EMPTY_FEED);
  const [fetching, setFetching] = useState(true);

  useEffect(() => {
    if (authLoading) return;

    async function load() {
      setFetching(true);
      const headers: Record<string, string> = session
        ? { Authorization: `Bearer ${session.access_token}` }
        : {};

      const [boardsRes, feedRes] = await Promise.all([
        fetch("/api/boards", { headers }),
        fetch("/api/boards/feed", { headers }),
      ]);

      const boardsData = await boardsRes.json();
      const feedData = await feedRes.json();

      setBoards(Array.isArray(boardsData) ? boardsData : []);
      setFeed(feedData);
      setFetching(false);
    }

    load();
  }, [session, authLoading]);

  if (fetching) {
    return <main className="flex-1 p-8 bg-white">불러오는 중...</main>;
  }

  return (
    <main className="flex-1 bg-white px-6 py-12">
      <div className="max-w-3xl mx-auto w-full">
        <h1 className="font-serif text-3xl sm:text-4xl font-bold tracking-tight text-gray-900 mb-4">
          게시판
        </h1>
        <div className="border-t border-gray-200 mb-8" />

        {/* Board Definition System(EPIC-047/048): 최상위 디렉토리도 다른
            hub(Silo Store 등)와 동일하게 BoardRenderer로 피드 슬라이드를
            그린다 — hubChildBoards는 넘기지 않아 아래 그룹별 디렉토리와
            중복되지 않게 한다(BoardRenderer.tsx의 HubView 참고). */}
        <BoardRenderer
          definition={HUB_DEFINITION}
          boardId="hub"
          posts={[]}
          isQna={false}
          hubFeed={feed}
        />

        {(() => {
          const hubBoards = boards.filter(
            (b) => resolveBoardDefinition(b).boardType === "hub",
          );
          if (hubBoards.length === 0) return null;

          return (
            <section className="mb-10">
              <h2 className="text-xs uppercase tracking-wide text-gray-400 mb-3">
                게시판 허브
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {hubBoards.map((b) => (
                  <Link
                    key={b.id}
                    href={`/boards/${b.id}`}
                    className="block rounded-lg border border-gray-100 p-4 hover:shadow-md transition-shadow group"
                  >
                    <p className="font-serif font-medium text-gray-900 group-hover:underline">
                      {b.name}
                    </p>
                  </Link>
                ))}
              </div>
            </section>
          );
        })()}

        <div className="border-t border-gray-200 mb-8" />

        {BOARD_GROUP_ORDER.map((groupKey) => {
          const items = boards.filter(
            (b) => resolveBoardDefinition(b).id === groupKey,
          );
          if (items.length === 0) return null;

          return (
            <section key={groupKey} className="mb-10">
              <h2 className="text-xs uppercase tracking-wide text-gray-400 mb-3">
                {BOARD_DEFINITIONS[groupKey].title_ko}
              </h2>
              <div className="divide-y divide-gray-100">
                {items.map((board) =>
                  board.locked ? (
                    <div
                      key={board.id}
                      className="py-3 text-gray-300 cursor-not-allowed"
                    >
                      <p className="font-serif font-medium">
                        🔒 {board.name}
                      </p>
                      <p className="text-xs mt-1">{board.lockMessage}</p>
                    </div>
                  ) : (
                    <Link
                      key={board.id}
                      href={`/boards/${board.id}`}
                      className="block py-3 group"
                    >
                      <p className="font-serif font-medium text-gray-900 group-hover:underline">
                        {board.name}
                      </p>
                    </Link>
                  ),
                )}
              </div>
            </section>
          );
        })}
      </div>
    </main>
  );
}
