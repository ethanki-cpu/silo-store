"use client";

import { useEffect } from "react";
import { useAuth } from "@/lib/AuthProvider";
import { useBoardData } from "@/lib/useBoardData";
import { BoardHeader } from "@/components/boards/BoardHeader";
import { BoardRenderer } from "@/components/boards/BoardRenderer";
import { BoardSkeleton } from "@/components/boards/BoardSkeleton";
import { Pagination } from "@/components/boards/Pagination";
import { FilterModule } from "@/components/modules/FilterModule";
import { HeroModule } from "@/components/modules/HeroModule";
import {
  resolveBoardDefinition,
  isRealBoardCategory,
  INDIVIDUAL_BOARD_DEFINITIONS,
  type BoardDefinition,
  type HubFeed,
} from "@/lib/boardLayout";

type Board = {
  id: string;
  name: string;
  category: string | null;
  board_type: string;
  // EPIC-092 후속: 갤러리 레이아웃(masonry/grid)+줄당 개수+호버 자동슬라이드
  // 여부 설정을 여기 담는다.
  widget_settings?: {
    galleryLayout?: "masonry" | "grid";
    galleryColumns?: number;
    galleryHoverAutoSlide?: boolean;
    // HOTFIX-097(사용자 지시): 타임라인 배치 방향 + hover 미리보기 카드
    // 사용 여부.
    timelineOrientation?: "vertical" | "horizontal";
    timelineShowPreview?: boolean;
  } | null;
};

// EPIC-054C: "Board Module" — 게시판 하나(boardId)를 Page 어디에든 꽂을 수
// 있는 자기완결형(self-contained) 모듈. boardId만 받고 스스로 fetch/상태
// 관리를 하기 때문에 한 Page 안에 여러 BoardModule을 나란히 배치해도
// 서로의 검색어/정렬/페이지 상태가 섞이지 않는다.
// definition.boardType이 "hub"면 BoardRenderer가 Renderer Registry에서
// HubRenderer를 찾아 그리므로, story/community/gallery/timeline/hub 5종
// 모두 이 컴포넌트 하나로 커버된다.
//
// EPIC-066: 조회 로직(검색/정렬/필터/페이지네이션 fetch)은
// src/lib/useBoardData.ts(BoardService/BoardQuery)로 뽑아냈다 — 이
// 컴포넌트는 그 훅의 state를 화면(Header/Renderer/Pagination)에 옮기는
// 프레젠테이션 레이어만 담당한다.
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
  const { session } = useAuth();
  const {
    board,
    posts,
    totalCount,
    pageSize,
    page,
    setPage,
    sort,
    q,
    tag,
    year,
    availableTags,
    availableYears,
    error,
    fetching,
    hubFeed,
    setHubFeed,
    hubChildBoards,
    setHubChildBoards,
    handleQueryChange,
    handleSortChange,
    handleTagChange,
    handleYearChange,
    handlePageSizeChange,
  } = useBoardData(boardId, { initialPageSize: pageSizeOverride });

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

      const feedData: HubFeed = await feedRes.json();
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
  }, [isHub, hubDefinition, session, includeChildBoards, setHubFeed, setHubChildBoards]);

  if (fetching && posts.length === 0 && !error) {
    return <BoardSkeleton />;
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

  const filterOptions = [
    ...availableTags.map((t) => ({ value: `tag:${t}`, label: `#${t}` })),
    ...availableYears.map((y) => ({ value: `year:${y}`, label: `${y}년` })),
  ];
  const activeFilterValue = tag ? `tag:${tag}` : year ? `year:${year}` : null;

  function handleFilterChange(value: string | null) {
    if (!value) {
      handleTagChange(null);
      handleYearChange(null);
      return;
    }
    const [kind, raw] = value.split(":");
    if (kind === "tag") {
      handleTagChange(raw);
      handleYearChange(null);
    } else {
      handleYearChange(raw);
      handleTagChange(null);
    }
  }

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

      {/* EPIC-066: Tag/Year Filter — 둘 다 옵션이 없으면(태그도 안 쓰고
          연도가 하나뿐인 게시판 등) 아무것도 렌더링하지 않는다. */}
      {filterOptions.length > 0 && (
        <div className="mb-6">
          <FilterModule options={filterOptions} value={activeFilterValue} onChange={handleFilterChange} />
        </div>
      )}

      <BoardRenderer
        definition={definition}
        boardId={String(boardId)}
        posts={posts}
        isQna={board?.board_type === "qna"}
        hubFeed={hubFeed}
        hubChildBoards={includeChildBoards ? hubChildBoards : undefined}
        showThumbnail={showThumbnail}
        boardCategory={isRealBoardCategory(board?.category) ? board.category : null}
        galleryLayout={board?.widget_settings?.galleryLayout}
        galleryColumns={board?.widget_settings?.galleryColumns}
        galleryThumbnailMaxPx={board?.widget_settings?.galleryThumbnailMaxPx}
        galleryHoverAutoSlide={board?.widget_settings?.galleryHoverAutoSlide}
        timelineOrientation={board?.widget_settings?.timelineOrientation}
        timelineShowPreview={board?.widget_settings?.timelineShowPreview}
        timelineAccentColorHex={board?.widget_settings?.timelineAccentColorHex}
        timelineLineWidthPx={board?.widget_settings?.timelineLineWidthPx}
        timelineMarkerSizePx={board?.widget_settings?.timelineMarkerSizePx}
        timelineCardTheme={board?.widget_settings?.timelineCardTheme}
        postMetaStyle={board?.widget_settings?.postMetaStyle}
        timelineNgStageHeightPx={board?.widget_settings?.timelineNgStageHeightPx}
      />

      {definition.pageable && paginationEnabled !== false && (
        <Pagination
          page={page}
          totalPages={totalPages}
          onPageChange={setPage}
          pageSize={pageSize}
          onPageSizeChange={handlePageSizeChange}
        />
      )}
    </div>
  );
}
