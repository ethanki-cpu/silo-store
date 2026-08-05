"use client";

import { useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabaseClient";

// EPIC-079-PHASE-4: 글쓰기(write)가 쓰던 "게시될 페이지 선택" 동적
// 드롭다운 로직을 글 수정(edit)에서도 그대로 재사용할 수 있도록 공용
// 훅으로 뽑는다 — 두 화면이 동일한 board 목록 조회 + board_type/category
// 파생 로직을 각자 복붙하지 않게 한다.

export type BoardOption = {
  id: string;
  slug?: string | null;
  name: string;
  board_type: string;
  category: string | null;
  locked?: boolean;
};

/** DB의 모든 게시판(=페이지) 목록 — 잠긴(등급 미달) 게시판은 제외. */
export function useBoardOptions(session: Session | null | undefined): BoardOption[] {
  const [boards, setBoards] = useState<BoardOption[]>([]);

  useEffect(() => {
    fetch("/api/boards", {
      headers: session ? { Authorization: `Bearer ${session.access_token}` } : {},
    })
      .then((res) => res.json())
      .then((data) => {
        const list = (Array.isArray(data) ? data : []) as BoardOption[];
        setBoards(list.filter((b) => !b.locked));
      })
      .catch(() => {});
  }, [session]);

  return boards;
}

/** 선택된 게시판 slug가 바뀔 때마다 그 게시판의 board_type/category를 다시 조회한다. */
export function useSelectedBoardTypeAndCategory(selectedBoardSlug: string) {
  const [boardType, setBoardType] = useState<string | null>(null);
  const [boardCategory, setBoardCategory] = useState<string | null>(null);

  useEffect(() => {
    if (!selectedBoardSlug) return;
    supabase
      .from("boards")
      .select("board_type, category")
      .eq("slug", selectedBoardSlug)
      .single()
      .then(({ data }) => {
        setBoardType(data?.board_type ?? null);
        setBoardCategory(data?.category ?? null);
      });
  }, [selectedBoardSlug]);

  return { boardType, boardCategory };
}
