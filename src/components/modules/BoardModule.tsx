"use client";

import { useEffect, useState } from "react";
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

// EPIC-054C: "Board Module" — 게시판 하나(boardId)를 Page 어디에든 꽂을 수
// 있는 자기완결형(self-contained) 모듈. 원래 src/app/boards/[id]/page.tsx
// 하나에만 있던 조회/Search/Sort/Pagination 로직을 그대로 옮겨온 것으로,
// 동작은 완전히 동일하다(리팩터, 새 로직 없음). boardId만 받고 스스로
// fetch/상태 관리를 하기 때문에:
//   - 한 Page 안에 여러 BoardModule을 나란히 배치해도 서로의 검색어/정렬/
//     페이지 상태가 섞이지 않는다(Page 하나 = Board 하나 구조를 강제하지
//     않기 위한 핵심 설계).
//   - 추후 Block Editor가 "게시판 임베드" 블록을 추가할 때도 이 컴포넌트에
//     boardId 하나만 넘기면 그대로 재사용된다.
// definition.boardType이 "hub"면 BoardRenderer가 알아서 HubView(Slide
// Board 레이아웃)로 그리므로, story/gallery/list/slide board 4종 모두 이
// 컴포넌트 하나로 커버된다 — 새 레이아웃 로직을 따로 만들지 않는다.
export function BoardModule({
  boardId,
  includeChildBoards = true,
}: {
  boardId: string;
  includeChildBoards?: boolean;
}) {
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

      const res = await fetch(`/api/boards/${boardId}/posts?${params.toString()}`, {
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
  }, [boardId, session, authLoading, page, sort, q]);

  function handleQueryChange(value: string) {
    setQ(value);
    setPage(1);
  }

  function handleSortChange(value: SortOption) {
    setSort(value);
    setPage(1);
  }

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
        includeChildBoards ? fetch("/api/boards", { headers }) : Promise.resolve(null),
      ]);

      const feedData = await feedRes.json();
      setHubFeed(feedData);

      if (includeChildBoards && boardsRes) {
        const boardsData = await boardsRes.json();
        setHubChildBoards(
          (Array.isArray(boardsData) ? boardsData : []).filter(
            (b: Board & { locked: boolean; lockMessage: string | null }) =>
              resolveBoardDefinition(b).parent === hubDefinition!.slug,
          ),
        );
      }
    }

    loadHub();
  }, [isHub, hubDefinition, session, includeChildBoards]);

  if (fetching && posts.length === 0 && !error) {
    return <p className="text-gray-400">불러오는 중...</p>;
  }

  if (error) {
    return <p className="text-red-600">{error}</p>;
  }

  // Board Definition System(EPIC-047): 화면 레이아웃/토글은 전부 이 정의
  // 하나에서 온다 — board_type별로 컴포넌트를 분기하지 않는다.
  const definition = resolveBoardDefinition(
    board ?? { board_type: "topic", category: null },
  );
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));

  return (
    <div>
      <BoardHeader
        boardName={board?.name ?? ""}
        writeHref={`/boards/${boardId}/write`}
        definition={definition}
        q={q}
        onQueryChange={handleQueryChange}
        sort={sort}
        onSortChange={handleSortChange}
      />

      <BoardRenderer
        definition={definition}
        boardId={String(boardId)}
        posts={posts}
        isQna={board?.board_type === "qna"}
        hubFeed={hubFeed}
        hubChildBoards={includeChildBoards ? hubChildBoards : undefined}
      />

      {definition.pageable && (
        <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
      )}
    </div>
  );
}
