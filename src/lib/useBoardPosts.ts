"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/lib/AuthProvider";
import type { BoardPost, SortOption } from "@/lib/boardLayout";
import type { PostMetaStyle } from "@/components/boards/PostDetailHeader";

type Board = {
  id: string;
  name: string;
  category: string | null;
  board_type: string;
  // HOTFIX-097(사용자 지시): 타임라인 위젯이 배치 방향/미리보기 여부를
  // 게시판 설정에서 읽을 수 있도록 노출한다(GalleryModule의 layout 설정과
  // 동일한 위치, boards.widget_settings).
  widget_settings?: {
    timelineOrientation?: "vertical" | "horizontal";
    timelineShowPreview?: boolean;
    // HOTFIX-098: 날짜/작성자 스타일 — Page Builder Timeline 위젯도
    // 게시판 설정과 동일하게 반영한다.
    postMetaStyle?: PostMetaStyle;
  } | null;
};
type FetchResult = { board: Board | null; posts: BoardPost[] };

// EPIC-070: 같은 페이지 안에 같은 게시판을 가리키는 위젯이 여러 개
// 있으면(예: Board+Gallery+Timeline이 전부 자유게시판을 가리키는 Hub
// 페이지) 각자 독립적으로 fetch해 동일한 요청이 중복 발생했다 — 진행 중인
// 동일 요청(같은 게시판/정렬/세션)을 공유해 실제 네트워크 요청을 1번으로
// 줄인다. 완료 후에는 즉시 캐시에서 지워 최신 글이 계속 반영되게 한다
// (시간 경과에 따른 stale 캐시가 아니라 "동시에 뜬 요청끼리만" 공유).
const inFlightRequests = new Map<string, Promise<FetchResult>>();

function fetchBoardPosts(
  boardId: string,
  sort: SortOption,
  accessToken: string | undefined,
): Promise<FetchResult> {
  const key = `${boardId}|${sort}|${accessToken ?? "anon"}`;
  const existing = inFlightRequests.get(key);
  if (existing) return existing;

  const params = new URLSearchParams({ page: "1", sort, q: "" });
  const promise = fetch(`/api/boards/${boardId}/posts?${params.toString()}`, {
    headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : {},
  })
    .then((res) => res.json())
    .then((data) => ({
      board: (data.board ?? null) as Board | null,
      posts: (Array.isArray(data.posts) ? data.posts : []) as BoardPost[],
    }))
    .finally(() => {
      inFlightRequests.delete(key);
    });

  inFlightRequests.set(key, promise);
  return promise;
}

// EPIC-060: Page Builder의 Slide/Gallery/Timeline 모듈(DbFeedModules.tsx)이
// 공유하는 "게시판 하나의 글 목록" 조회 — src/components/modules/
// BoardModule.tsx가 이미 하는 것과 같은 엔드포인트(GET /api/boards/[id]/posts)를
// 쓰되, Search/Pagination 상태는 없이 1페이지만 가져오는 축소판이다(이
// 세 모듈은 미리보기 성격이라 자체 검색 UI가 없음).
// EPIC-061: sort 파라미터를 추가해 같은 게시판이라도 "최신 글"/"인기 글"을
// 서로 다른 진짜 데이터로 보여주는 두 개의 Slide 모듈을 만들 수 있게 한다
// (fake 중복이 아니라 /api/boards/[id]/posts?sort=popular를 그대로 활용).
export function useBoardPosts(
  boardId: string | null,
  limit = 12,
  sort: SortOption = "latest",
) {
  const { session, loading: authLoading } = useAuth();
  const [board, setBoard] = useState<Board | null>(null);
  const [posts, setPosts] = useState<BoardPost[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!boardId || authLoading) {
      setLoading(!boardId ? false : true);
      return;
    }

    let cancelled = false;
    setLoading(true);

    fetchBoardPosts(boardId, sort, session?.access_token)
      .then((data) => {
        if (cancelled) return;
        setBoard(data.board);
        setPosts(data.posts.slice(0, limit));
        setLoading(false);
      })
      .catch(() => {
        if (cancelled) return;
        setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [boardId, session, authLoading, limit, sort]);

  return { board, posts, loading };
}
