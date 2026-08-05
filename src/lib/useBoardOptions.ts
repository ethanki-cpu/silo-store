"use client";

import { useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabaseClient";
import { fetchNavBranches, fetchBoardBranchMap, buildAdminTree, type AdminTreeRow } from "@/lib/adminTreeGrouping";

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

// EPIC-079-PHASE-5: 이전엔 fetch 실패를 `.catch(() => {})`로 조용히
// 삼켜버려 boards가 영원히 빈 배열로 남고, BoardPageSelect는 "현재 값이
// 목록에 없으면 불러오는 중..."이라는 잘못된 추론으로 그 상태를 표시했다
// (진짜 로딩 상태가 아니라 "매칭 실패"였다 — 잠긴 게시판처럼 목록에서
// 아예 빠지는 값이면 영원히 그 문구에 갇힌다). 실제 loading/error를
// state로 노출해 호출부가 정확히 구분할 수 있게 한다.
//
// 동시에 "사이트 구성 관리"와 같은 순서/들여쓰기(task 7)를 위해
// adminTreeGrouping.ts(EPIC-072B, 실제 site_navigations 트리가 SSoT)를
// 재사용해 각 게시판이 속한 브랜치 depth를 계산한다.
export function useBoardOptions(session: Session | null | undefined): {
  boards: BoardOption[];
  tree: AdminTreeRow<BoardOption>[];
  loading: boolean;
  error: string | null;
} {
  const [boards, setBoards] = useState<BoardOption[]>([]);
  const [tree, setTree] = useState<AdminTreeRow<BoardOption>[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    Promise.all([
      fetch("/api/boards", {
        headers: session ? { Authorization: `Bearer ${session.access_token}` } : {},
      }).then((res) => {
        if (!res.ok) throw new Error("게시판 목록 조회 실패");
        return res.json();
      }),
      fetchNavBranches(),
    ])
      .then(async ([data, branches]) => {
        if (cancelled) return;
        const list = (Array.isArray(data) ? data : []) as BoardOption[];
        const unlocked = list.filter((b) => !b.locked);
        const branchMap = await fetchBoardBranchMap(branches);
        const builtTree = buildAdminTree(unlocked, (b) => branchMap.get(b.id) ?? null, branches, "all");
        if (cancelled) return;
        setBoards(unlocked);
        setTree(builtTree);
        setLoading(false);
      })
      .catch(() => {
        if (cancelled) return;
        setError("게시판 목록을 불러오지 못했어요.");
        setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [session]);

  return { boards, tree, loading, error };
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
