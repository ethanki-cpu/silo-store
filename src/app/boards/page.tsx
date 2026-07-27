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

type FeedItem = {
  id: string;
  board_id: string;
  board_name: string;
  title: string | null;
  like_count: number;
  author_name: string;
  created_at: string;
};

type Feed = { latest: FeedItem[]; popular: FeedItem[]; recommended: FeedItem[] };

// Board Engine(EPIC-047): /boards는 개별 게시판이 아니라 hub 레이아웃 —
// 하위 게시판들의 최신글/인기글/추천글을 슬라이드/카드로 종합 표시한 뒤,
// 기존 게시판 디렉토리(그룹별 링크 목록)를 그대로 이어서 보여준다.
function FeedCardRow({ items }: { items: FeedItem[] }) {
  if (items.length === 0) {
    return <p className="text-sm text-gray-400">아직 글이 없어요.</p>;
  }

  return (
    <div className="flex gap-4 overflow-x-auto pb-2">
      {items.map((item) => (
        <Link
          key={item.id}
          href={`/boards/${item.board_id}/${item.id}`}
          className="shrink-0 w-56 rounded-lg border border-gray-100 p-4 hover:shadow-md transition-shadow"
        >
          <p className="text-xs uppercase tracking-wide text-gray-400 mb-1">
            {item.board_name}
          </p>
          <p className="font-serif font-medium text-gray-900 line-clamp-2">
            {item.title}
          </p>
          <p className="text-xs text-gray-400 mt-2">
            {item.author_name} · 좋아요 {item.like_count}
          </p>
        </Link>
      ))}
    </div>
  );
}

function FeedList({ items }: { items: FeedItem[] }) {
  if (items.length === 0) {
    return <p className="text-sm text-gray-400">아직 글이 없어요.</p>;
  }

  return (
    <div className="divide-y divide-gray-100">
      {items.map((item) => (
        <Link
          key={item.id}
          href={`/boards/${item.board_id}/${item.id}`}
          className="flex items-center justify-between py-3 group"
        >
          <span className="font-serif text-gray-900 group-hover:underline">
            {item.title}
          </span>
          <span className="text-xs uppercase tracking-wide text-gray-400 shrink-0 ml-4">
            {item.board_name}
          </span>
        </Link>
      ))}
    </div>
  );
}

export default function BoardsPage() {
  const { session, loading: authLoading } = useAuth();
  const [boards, setBoards] = useState<Board[]>([]);
  const [feed, setFeed] = useState<Feed>({ latest: [], popular: [], recommended: [] });
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

        <section className="mb-10">
          <h2 className="text-xs uppercase tracking-wide text-gray-400 mb-3">
            인기글
          </h2>
          <FeedCardRow items={feed.popular} />
        </section>

        <section className="mb-10">
          <h2 className="text-xs uppercase tracking-wide text-gray-400 mb-3">
            추천글
          </h2>
          <FeedCardRow items={feed.recommended} />
        </section>

        <section className="mb-10">
          <h2 className="text-xs uppercase tracking-wide text-gray-400 mb-3">
            최신글
          </h2>
          <FeedList items={feed.latest} />
        </section>

        <div className="border-t border-gray-200 mb-8" />

        {GROUP_LABELS.map((group) => {
          const items = boards.filter(group.match);
          if (items.length === 0) return null;

          return (
            <section key={group.key} className="mb-10">
              <h2 className="text-xs uppercase tracking-wide text-gray-400 mb-3">
                {group.title}
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
