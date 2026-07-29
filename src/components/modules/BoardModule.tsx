"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/lib/AuthProvider";
import { BoardHeader } from "@/components/boards/BoardHeader";
import { BoardRenderer } from "@/components/boards/BoardRenderer";
import { Pagination } from "@/components/boards/Pagination";
import { HeroModule } from "@/components/modules/HeroModule";
import {
  resolveBoardDefinition,
  INDIVIDUAL_BOARD_DEFINITIONS,
  type BoardDefinition,
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
  showHero = true,
  searchEnabled,
  sortEnabled,
  paginationEnabled,
  pageSizeOverride,
  showThumbnail = true,
  showWriteButton = true,
}: {
  boardId: string;
  includeChildBoards?: boolean;
  // EPIC-056: Hero Module(제목/설명/Breadcrumb)을 이 Board Module 안에서
  // 자동으로 함께 보여줄지 여부 — 이 Board Module 자체가 페이지의 유일한
  // 콘텐츠일 때(예: /boards/[id])는 true(기본값), 이미 페이지 쪽에서 Hero를
  // 그린 경우(예: PageTemplate이 쓰는 6개 카테고리 허브 페이지)는 false로
  // 꺼서 Hero가 중복 렌더링되지 않게 한다.
  showHero?: boolean;
  // EPIC-065: Widget Builder의 Board Widget 설정 6종 — 전부 undefined(기본값
  // 없음)면 기존 그대로 BoardDefinition.searchable/sortable/pageable이
  // 결정한다(하위 호환, 이 파일을 직접 호출하던 기존 페이지들은 전혀 영향
  // 없음). Page Builder만 이 값들을 명시적으로 넘겨 definition의 기본
  // 동작을 페이지별로 덮어쓴다.
  searchEnabled?: boolean;
  sortEnabled?: boolean;
  paginationEnabled?: boolean;
  pageSizeOverride?: number;
  showThumbnail?: boolean;
  showWriteButton?: boolean;
}) {
  const { session, loading: authLoading } = useAuth();
  const [board, setBoard] = useState<Board | null>(null);
  const [posts, setPosts] = useState<BoardPost[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [pageSize, setPageSize] = useState(pageSizeOverride ?? 10);
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
      if (pageSizeOverride) params.set("pageSize", String(pageSizeOverride));

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
  }, [boardId, session, authLoading, page, sort, q, pageSizeOverride]);

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

  // EPIC-056: Hero Module — 부모 hub가 있으면(예: "Heritage" 아래 "Grandmas")
  // 그 이름을 중간 breadcrumb로 보여준다. 부모의 실제 board id는 이 훅이
  // 알지 못해 링크 없이 텍스트로만 표시한다(EPIC-054A의 기존 breadcrumb
  // 관례와 동일).
  const parentDefinition = definition.parent
    ? (INDIVIDUAL_BOARD_DEFINITIONS as Record<string, BoardDefinition>)[
        definition.parent
      ]
    : null;

  return (
    <div>
      {showHero && (
        <HeroModule
          title={board?.name ?? ""}
          breadcrumb={[
            { label: "홈", href: "/" },
            ...(parentDefinition ? [{ label: parentDefinition.title_ko }] : []),
            { label: board?.name ?? "" },
          ]}
          description={definition.description}
        />
      )}

      <BoardHeader
        boardName={board?.name ?? ""}
        writeHref={showWriteButton ? `/boards/${boardId}/write` : undefined}
        definition={definition}
        q={q}
        onQueryChange={searchEnabled === false ? undefined : handleQueryChange}
        sort={sort}
        onSortChange={sortEnabled === false ? undefined : handleSortChange}
      />

      <BoardRenderer
        definition={definition}
        boardId={String(boardId)}
        posts={posts}
        isQna={board?.board_type === "qna"}
        hubFeed={hubFeed}
        hubChildBoards={includeChildBoards ? hubChildBoards : undefined}
        showThumbnail={showThumbnail}
      />

      {definition.pageable && paginationEnabled !== false && (
        <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
      )}
    </div>
  );
}
