"use client";

import { useEffect } from "react";
import { useAuth } from "@/lib/AuthProvider";
import { useBoardData } from "@/lib/useBoardData";
import { BoardHeader } from "@/components/boards/BoardHeader";
import { BoardRenderer } from "@/components/boards/BoardRenderer";
import { BoardSkeleton } from "@/components/boards/BoardSkeleton";
import { Pagination } from "@/components/boards/Pagination";
import { FilterModule } from "@/components/modules/FilterModule";
import { HeroSlideshow } from "@/components/HeroSlideshow";
import {
  resolveBoardDefinition,
  isRealBoardCategory,
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
  searchEnabled,
  sortEnabled,
  paginationEnabled,
  pageSizeOverride,
  showThumbnail = true,
  showWriteButton = true,
}: {
  boardId: string;
  includeChildBoards?: boolean;
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

  // HOTFIX: Page Builder의 "board" 위젯(PageBuilderRenderer.tsx)은 boardId를
  // slug가 아니라 board_id(UUID)로 넘긴다 — 그 값을 그대로 글쓰기/게시글
  // 링크에 쓰면 "/boards/<uuid>/write"가 되어, 글쓰기 화면의 CategoryBoardPicker가
  // slug 기준 게시판 목록에서 이 값을 찾지 못해 현재 게시판이 자동
  // 선택되지 않는다(살롱데상 하위 게시판들에서 신고된 증상). fetch가 끝나
  // board.slug를 알게 되면 그쪽을 우선해 항상 slug 기반 링크를 쓴다.
  const effectiveBoardId = board?.slug || boardId;

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
      {/* HOTFIX-147.3(사용자 지시 — "히어로 아래에 그대로 유지"): 새 대표사진
          슬라이드쇼+오버레이 텍스트는 게시판 이름/검색·정렬 헤더보다 위에
          오고, 그 헤더는 그대로 아래에 남는다. */}
      {board?.widget_settings?.timelineHeroSlides && board.widget_settings.timelineHeroSlides.length > 0 && (
        <HeroSlideshow device="both" slides={board.widget_settings.timelineHeroSlides} />
      )}

      {/* HOTFIX-156.21(사용자 신고 — "게시판 위에 이 링크들[브레드크럼]이 왜
          작동이 안돼?"): 이 Hero(EPIC-056, showHero 기본값 true)는
          site_navigations 기반 전역 자동 브레드크럼(Breadcrumb.tsx)과
          완전히 별개의, 이 카테고리 트리보다 훨씬 오래된 레거시 시스템
          (boardLayout.ts의 BoardDefinition.parent)으로 부모 브레드크럼을
          만들었다 — INDIVIDUAL_BOARD_DEFINITIONS에 등록 안 된 보통 게시판
          (예: "패션")은 전부 제네릭 topic 정의로 폴백되는데, 그 parent인
          "community" 정의의 title_ko가 "Community"(EPIC-049 이후 한글화
          안 된 영문 그대로) — 게다가 이 항목은 부모 게시판 id를 몰라
          href 자체가 없는 텍스트만 렌더링했다. `/boards/[board_slug]`처럼
          showHero를 명시적으로 끄지 않은 모든 곳에서 "홈 › Community ›
          패션"처럼 틀린 라벨 + 클릭 안 되는 링크가 나타났다(실측:
          dev.silostore.net/boards/fashion). 바로 아래 BoardHeader가 이미
          게시판 이름을 보여주고, 이미 존재하는 전역 자동 브레드크럼이
          이 페이지에서 이미 정상 렌더링되고 있어(레이아웃 최상단) 완전히
          중복이었으므로 Hero 자체를 삭제 — showHero prop과 parentDefinition
          계산도 함께 제거(호출부 전부 확인: PageTemplate.tsx/
          PageBuilderRenderer.tsx는 이미 showHero={false}로 껐었고,
          /boards/[board_slug]/page.tsx와 PageModuleRenderer.tsx의 board류
          4종은 prop을 안 넘겨 기본값 true로 새고 있었다). */}
      <BoardHeader
        boardName={board?.name ?? ""}
        writeHref={showWriteButton ? `/boards/${effectiveBoardId}/write` : undefined}
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
        boardId={String(effectiveBoardId)}
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
        timelineNgZoomFactor={board?.widget_settings?.timelineNgZoomFactor}
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
