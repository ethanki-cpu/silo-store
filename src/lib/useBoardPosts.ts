"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/lib/AuthProvider";
import type { BoardPost } from "@/lib/boardLayout";

type Board = { id: string; name: string; category: string | null; board_type: string };

// EPIC-060: Page Builder의 Slide/Gallery/Timeline 모듈(DbFeedModules.tsx)이
// 공유하는 "게시판 하나의 최신 글 목록" 조회 — src/components/modules/
// BoardModule.tsx가 이미 하는 것과 같은 엔드포인트(GET /api/boards/[id]/posts)를
// 쓰되, Search/Sort/Pagination 상태는 없이 최신순 1페이지만 가져오는
// 축소판이다(이 세 모듈은 미리보기 성격이라 자체 검색/정렬 UI가 없음).
export function useBoardPosts(boardId: string | null, limit = 12) {
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

    const params = new URLSearchParams({ page: "1", sort: "latest", q: "" });
    fetch(`/api/boards/${boardId}/posts?${params.toString()}`, {
      headers: session ? { Authorization: `Bearer ${session.access_token}` } : {},
    })
      .then((res) => res.json())
      .then((data) => {
        if (cancelled) return;
        setBoard(data.board ?? null);
        setPosts(Array.isArray(data.posts) ? data.posts.slice(0, limit) : []);
        setLoading(false);
      })
      .catch(() => {
        if (cancelled) return;
        setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [boardId, session, authLoading, limit]);

  return { board, posts, loading };
}
