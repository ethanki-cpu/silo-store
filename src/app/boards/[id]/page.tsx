"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { useAuth } from "@/lib/AuthProvider";
import { BoardHeader } from "@/components/boards/BoardHeader";
import { BoardRenderer } from "@/components/boards/BoardRenderer";
import { Pagination } from "@/components/boards/Pagination";
import {
  resolveBoardDefinition,
  type BoardPost,
  type SortOption,
  type HubFeed,
  type HubChildBoard,
} from "@/lib/boardLayout";

type Board = {
  id: string;
  name: string;
  category: string | null;
  board_type: string;
};

const EMPTY_FEED: HubFeed = { latest: [], popular: [], recommended: [] };

export default function BoardPostsPage() {
  const { id } = useParams<{ id: string }>();
  const { session, loading: authLoading } = useAuth();
  const [board, setBoard] = useState<Board | null>(null);
  const [posts, setPosts] = useState<BoardPost[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [pageSize, setPageSize] = useState(10);
  const [page, setPage] = useState(1);
  const [sort, setSort] = useState<SortOption>("latest");
  const [q, setQ] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [fetching, setFetching] = useState(true);
  const [hubFeed, setHubFeed] = useState<HubFeed>(EMPTY_FEED);
  const [hubChildBoards, setHubChildBoards] = useState<HubChildBoard[]>([]);

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
      setPageSize(data.pageSize);
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

  // Board Definition System(EPIC-048): 이 게시판이 hub(예: Silo Store/
  // Online Docent/Heritage)면 자기 자신의 posts가 아니라 하위 게시판들의
  // 종합 피드 + 하위 게시판 카드를 보여준다 — 새 페이지를 만들지 않고
  // 같은 [id] 라우트 안에서 분기.
  const hubDefinition = board ? resolveBoardDefinition(board) : null;
  const isHub = hubDefinition?.boardType === "hub";

  useEffect(() => {
    if (!isHub || !hubDefinition) return;

    const headers: Record<string, string> = session
      ? { Authorization: `Bearer ${session.access_token}` }
      : {};

    async function loadHub() {
      const [feedRes, boardsRes] = await Promise.all([
        fetch(`/api/boards/feed?parent=${hubDefinition!.slug}`, { headers }),
        fetch("/api/boards", { headers }),
      ]);

      const feedData = await feedRes.json();
      const boardsData = await boardsRes.json();

      setHubFeed(feedData);
      setHubChildBoards(
        (Array.isArray(boardsData) ? boardsData : []).filter(
          (b: Board & { locked: boolean; lockMessage: string | null }) =>
            resolveBoardDefinition(b).parent === hubDefinition!.slug,
        ),
      );
    }

    loadHub();
  }, [isHub, hubDefinition, session]);

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

  // Board Definition System(EPIC-047): 화면 레이아웃/토글은 전부 이 정의
  // 하나에서 온다 — board_type별로 페이지 코드를 분기하지 않는다.
  const definition = resolveBoardDefinition(
    board ?? { board_type: "topic", category: null },
  );
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));

  return (
    <main className="flex-1 bg-white px-6 py-12">
      <div className="max-w-3xl mx-auto w-full">
        <BoardHeader
          boardName={board?.name ?? ""}
          writeHref={`/boards/${id}/write`}
          definition={definition}
          q={q}
          onQueryChange={handleQueryChange}
          sort={sort}
          onSortChange={handleSortChange}
        />

        <BoardRenderer
          definition={definition}
          boardId={String(id)}
          posts={posts}
          isQna={board?.board_type === "qna"}
          hubFeed={hubFeed}
          hubChildBoards={hubChildBoards}
        />

        {definition.pageable && (
          <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
        )}
      </div>
    </main>
  );
}
