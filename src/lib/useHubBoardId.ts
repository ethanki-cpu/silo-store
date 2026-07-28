"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/lib/AuthProvider";
import { resolveBoardDefinition } from "@/lib/boardLayout";

type Board = {
  id: string;
  name: string;
  category: string | null;
  board_type: string;
};

type Session = { access_token: string } | null;

// EPIC-054F/EPIC-055: 카테고리 허브 페이지·이름별 동적 게시판 페이지가
// 공유하는 조회 로직 — src/app/boards/page.tsx가 이미 하던 "전체 boards
// 조회" 자체를 한 곳으로 모았다(두 훅이 각자 fetch를 중복 구현하지 않게).
async function fetchBoards(session: Session): Promise<Board[]> {
  const headers: Record<string, string> = session
    ? { Authorization: `Bearer ${session.access_token}` }
    : {};
  const res = await fetch("/api/boards", { headers });
  const data = await res.json();
  return Array.isArray(data) ? data : [];
}

// EPIC-054F: 카테고리 허브 페이지(Community/Studio/Membership/Gallery/
// Archive/Heritage)가 slug로 실제 board row id를 찾을 때 쓰는 훅 —
// resolveBoardDefinition(b).slug로 매칭한다(Board Definition System의
// hub 정의 기준). 아직 해당 slug의 board 행이 DB에 없으면(시드 미실행)
// boardId는 null — 호출부(PageTemplate)가 EmptyState로 대체한다.
export function useHubBoardId(slug: string) {
  const { session, loading: authLoading } = useAuth();
  const [boardId, setBoardId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (authLoading) return;

    let cancelled = false;
    fetchBoards(session).then((boards) => {
      if (cancelled) return;
      const match = boards.find((b) => resolveBoardDefinition(b).slug === slug);
      setBoardId(match?.id ?? null);
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [slug, session, authLoading]);

  return { boardId, loading };
}

// EPIC-055: 이름별 동적 라우트(예: /heritage/grandma/[name],
// /community/club/[name])가 boards.name(DB 표시 이름)으로 실제 board row를
// 찾을 때 쓰는 훅 — 위 useHubBoardId와 조회(fetchBoards)는 공유하고 매칭
// 기준만 다르다(slug 대신 정확한 name 일치).
export function useBoardIdByName(name: string) {
  const { session, loading: authLoading } = useAuth();
  const [boardId, setBoardId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (authLoading) return;

    let cancelled = false;
    fetchBoards(session).then((boards) => {
      if (cancelled) return;
      const match = boards.find((b) => b.name === name);
      setBoardId(match?.id ?? null);
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [name, session, authLoading]);

  return { boardId, loading };
}
