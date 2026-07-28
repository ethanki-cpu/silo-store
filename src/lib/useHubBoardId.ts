"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/lib/AuthProvider";
import { resolveBoardDefinition } from "@/lib/boardLayout";

type Board = {
  id: string;
  category: string | null;
  board_type: string;
};

// EPIC-054F: 카테고리 허브 페이지(Community/Studio/Membership/Gallery/
// Archive/Heritage)가 slug로 실제 board row id를 찾을 때 재사용하는 훅 —
// src/app/boards/page.tsx가 이미 하던 "전체 boards 조회 후
// resolveBoardDefinition(b).slug로 매칭" 패턴을 그대로 재사용한다(새 조회
// 로직 없음). 아직 해당 slug의 board 행이 DB에 없으면(시드 미실행)
// boardId는 null — 호출부(PageTemplate)가 EmptyState로 대체한다.
export function useHubBoardId(slug: string) {
  const { session, loading: authLoading } = useAuth();
  const [boardId, setBoardId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (authLoading) return;

    let cancelled = false;
    async function load() {
      const headers: Record<string, string> = session
        ? { Authorization: `Bearer ${session.access_token}` }
        : {};
      const res = await fetch("/api/boards", { headers });
      const data = await res.json();
      if (cancelled) return;

      const boards: Board[] = Array.isArray(data) ? data : [];
      const match = boards.find((b) => resolveBoardDefinition(b).slug === slug);
      setBoardId(match?.id ?? null);
      setLoading(false);
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [slug, session, authLoading]);

  return { boardId, loading };
}
