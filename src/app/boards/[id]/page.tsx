"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { useAuth } from "@/lib/AuthProvider";
import { BoardHeader } from "@/components/boards/BoardHeader";
import { BoardRenderer } from "@/components/boards/BoardRenderer";
import { Pagination } from "@/components/boards/Pagination";
import { getBoardLayoutType, type BoardPost, type SortOption } from "@/lib/boardLayout";

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
  const [posts, setPosts] = useState<BoardPost[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [page, setPage] = useState(1);
  const [sort, setSort] = useState<SortOption>("latest");
  const [q, setQ] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [fetching, setFetching] = useState(true);

  useEffect(() => {
    if (authLoading) return;

    const timeout = setTimeout(async () => {
      setFetching(true);
      setError(null);

      const params = new URLSearchParams({
        page: String(page),
        sort,
        q,
      });

      const res = await fetch(`/api/boards/${id}/posts?${params.toString()}`, {
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
      setTotalCount(data.totalCount);
      setFetching(false);
    }, 250);

    return () => clearTimeout(timeout);
  }, [id, session, authLoading, page, sort, q]);

  function handleQueryChange(value: string) {
    setQ(value);
    setPage(1);
  }

  function handleSortChange(value: SortOption) {
    setSort(value);
    setPage(1);
  }

  if (fetching && posts.length === 0 && !error) {
    return <main className="flex-1 p-8 bg-white">불러오는 중...</main>;
  }

  if (error) {
    return (
      <main className="flex-1 p-8 bg-white">
        <p className="text-red-600">{error}</p>
      </main>
    );
  }

  const layoutType = board ? getBoardLayoutType(board.board_type) : "community";
  const totalPages = Math.max(1, Math.ceil(totalCount / 10));

  return (
    <main className="flex-1 bg-white px-6 py-12">
      <div className="max-w-3xl mx-auto w-full">
        <BoardHeader
          boardName={board?.name ?? ""}
          writeHref={`/boards/${id}/write`}
          q={q}
          onQueryChange={handleQueryChange}
          sort={sort}
          onSortChange={handleSortChange}
        />

        <BoardRenderer
          layoutType={layoutType}
          boardId={String(id)}
          posts={posts}
          isQna={board?.board_type === "qna"}
        />

        <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
      </div>
    </main>
  );
}
