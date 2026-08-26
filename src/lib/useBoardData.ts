"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/lib/AuthProvider";
import type { BoardPost, SortOption, HubFeed } from "@/lib/boardLayout";
import type { PostMetaStyle } from "@/components/boards/PostDetailHeader";

type Board = {
  id: string;
  name: string;
  category: string | null;
  board_type: string;
  // EPIC-092 후속: 갤러리 레이아웃(masonry/grid)+줄당 개수+호버 자동슬라이드 설정.
  widget_settings?: {
    galleryLayout?: "masonry" | "grid";
    galleryColumns?: number;
    galleryHoverAutoSlide?: boolean;
    // 사용자 신고(2026-08-12): "게시판 수정"에서 썸네일 크기를 직접
    // 지정할 수 있게 — 없으면 galleryColumns 기반 자동 계산(EPIC-096) 그대로.
    galleryThumbnailMaxPx?: number;
    // HOTFIX-097(사용자 지시): 타임라인 배치 방향 + hover 미리보기 카드
    // 사용 여부.
    timelineOrientation?: "vertical" | "horizontal";
    timelineShowPreview?: boolean;
    // HOTFIX-100(사용자 지시): 타임라인 선/마커 색상(게시판별 테마).
    timelineAccentColorHex?: string;
    // HOTFIX-103(사용자 지시): 선 굵기/마커 크기/카드 테마.
    timelineLineWidthPx?: number;
    timelineMarkerSizePx?: number;
    timelineCardTheme?: "light" | "dark";
    // HOTFIX-098: 날짜/작성자 스타일 — 지금까지 게시글 상세에만 적용되던
    // 것을 타임라인 라벨/미리보기에도 반영한다.
    postMetaStyle?: PostMetaStyle;
    // EPIC-147-후속(사용자 지시): TimelineNgRenderer(클래식 TimelineJS3)의
    // 슬라이드(미디어+제목+설명) 영역 높이(px).
    timelineNgStageHeightPx?: number;
    // HOTFIX-147.19(사용자 지시): TimelineNgRenderer의 TL3 TimeNav 확대
    // 배율 초기값.
    timelineNgZoomFactor?: number;
    // HOTFIX-147.3(사용자 지시 — "페이지 첫 화면 대표사진 슬라이드"): Timeline
    // NG 리프 게시판의 헤더 위에 얹는 히어로 슬라이드쇼(기존 HeroSlideshow.tsx
    // 재사용) — 비어있으면 히어로 없이 기존 화면 그대로.
    timelineHeroSlides?: { imageUrl: string; title: string; description: string }[];
  } | null;
};

const EMPTY_FEED: HubFeed = { latest: [], popular: [], recommended: [] };

// EPIC-066: "BoardService/BoardQuery" 분리 — 기존에 BoardModule.tsx 안에
// 있던 게시글 목록 조회(검색/정렬/필터/페이지네이션 state + fetch)를
// 별도 훅으로 뽑아냈다. BoardModule은 이제 이 훅이 돌려주는 state만
// 그대로 화면에 옮기는 얇은 프레젠테이션 컴포넌트가 된다 — 데이터 조회
// 로직 자체는 바뀌지 않았다(GET /api/boards/[id]/posts 그대로 재사용,
// N+1 없음 — 그 라우트가 이미 author/comment_count를 배치(IN절) 조회함).
//
// 이 프로젝트는 React Query/SWR을 쓰지 않는다(기존 구조 유지 원칙) —
// 캐싱 대신 boardId/필터가 바뀔 때마다 항상 새로 fetch해서 "즉시 반영"을
// 보장하는 지금 패턴을 그대로 따른다.
export function useBoardData(
  boardId: string,
  options: {
    initialPageSize?: number;
  } = {},
) {
  const { session, loading: authLoading } = useAuth();
  const [board, setBoard] = useState<Board | null>(null);
  const [posts, setPosts] = useState<BoardPost[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [pageSize, setPageSize] = useState(options.initialPageSize ?? 10);
  // EPIC-066: 방문자가 직접 고르는 페이지당 개수(12/24/48/100) — 관리자가
  // Page Builder에서 지정한 initialPageSize보다 우선한다. null이면 서버
  // 기본값(BoardDefinition.pageSize 또는 initialPageSize)을 그대로 쓴다.
  const [userPageSize, setUserPageSize] = useState<number | null>(null);
  const [page, setPage] = useState(1);
  const [sort, setSort] = useState<SortOption>("latest");
  const [q, setQ] = useState("");
  const [tag, setTag] = useState<string | null>(null);
  const [year, setYear] = useState<string | null>(null);
  const [availableTags, setAvailableTags] = useState<string[]>([]);
  const [availableYears, setAvailableYears] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [fetching, setFetching] = useState(true);
  const [hubFeed, setHubFeed] = useState<HubFeed>(EMPTY_FEED);
  const [hubChildBoards, setHubChildBoards] = useState<
    { id: string; name: string; locked: boolean; lockMessage: string | null }[]
  >([]);

  const effectivePageSize = userPageSize ?? options.initialPageSize;

  useEffect(() => {
    if (authLoading) return;

    const timeout = setTimeout(async () => {
      setFetching(true);
      setError(null);

      const params = new URLSearchParams({ page: String(page), sort, q });
      if (effectivePageSize) params.set("pageSize", String(effectivePageSize));
      if (tag) params.set("tag", tag);
      if (year) params.set("year", year);

      const res = await fetch(`/api/boards/${boardId}/posts?${params.toString()}`, {
        headers: session ? { Authorization: `Bearer ${session.access_token}` } : {},
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
      setAvailableTags(Array.isArray(data.availableTags) ? data.availableTags : []);
      setAvailableYears(Array.isArray(data.availableYears) ? data.availableYears : []);
      setFetching(false);
    }, 250);

    return () => clearTimeout(timeout);
  }, [boardId, session, authLoading, page, sort, q, tag, year, effectivePageSize]);

  function handleQueryChange(value: string) {
    setQ(value);
    setPage(1);
  }

  function handleSortChange(value: SortOption) {
    setSort(value);
    setPage(1);
  }

  function handleTagChange(value: string | null) {
    setTag(value);
    setPage(1);
  }

  function handleYearChange(value: string | null) {
    setYear(value);
    setPage(1);
  }

  function handlePageSizeChange(value: number) {
    setUserPageSize(value);
    setPage(1);
  }

  return {
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
  };
}
