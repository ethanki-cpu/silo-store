"use client";

import { useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabaseClient";
import {
  fetchNavBranches,
  fetchBoardBranchMap,
  buildAdminTree,
  type AdminTreeRow,
  type NavBranchNode,
} from "@/lib/adminTreeGrouping";

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

// HOTFIX-099(사용자 지시): "추가로 노출할 게시판 선택" 체크박스 목록이
// (WriteBoardForm.tsx/edit/page.tsx 둘 다) DB 조회 순서(sort_order) 그대로
// 나열돼 카테고리가 뒤섞여 있었다 — 카테고리로 묶어 정렬한다(카테고리 없는
// 게시판은 "미분류"로 맨 뒤). 같은 카테고리 안에서는 이름 가나다순.
export function groupBoardsByCategory<T extends { category: string | null; name: string }>(
  boards: T[],
): { category: string; items: T[] }[] {
  const sorted = [...boards].sort((a, b) => {
    const catA = a.category || "￿";
    const catB = b.category || "￿";
    if (catA !== catB) return catA.localeCompare(catB, "ko");
    return a.name.localeCompare(b.name, "ko");
  });
  const groups = new Map<string, T[]>();
  for (const board of sorted) {
    const key = board.category || "미분류";
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(board);
  }
  return [...groups.entries()].map(([category, items]) => ({ category, items }));
}

// EPIC-079-PHASE-5: 이전엔 fetch 실패를 `.catch(() => {})`로 조용히
// 삼켜버려 boards가 영원히 빈 배열로 남았다(진짜 로딩 상태가 아니라
// "매칭 실패"였는데 구분이 안 됐음). 실제 loading/error를 state로 노출해
// 호출부가 정확히 구분할 수 있게 한다.
// EPIC-084-REVISED: 호출부가 단일 <select>(BoardPageSelect, 삭제됨) 대신
// 3열 Miller Columns 선택기(CategoryBoardPicker)를 쓰도록 바뀌면서, 이
// 훅도 그 선택기가 필요로 하는 원본 branches/boardBranchMap을 함께
// 노출한다(중복 조회 방지).
//
// 동시에 "사이트 구성 관리"와 같은 순서/들여쓰기(task 7)를 위해
// adminTreeGrouping.ts(EPIC-072B, 실제 site_navigations 트리가 SSoT)를
// 재사용해 각 게시판이 속한 브랜치 depth를 계산한다.
export function useBoardOptions(session: Session | null | undefined): {
  boards: BoardOption[];
  tree: AdminTreeRow<BoardOption>[];
  // EPIC-084-REVISED: 3열 Miller Columns 선택기(CategoryBoardPicker)가
  // 이 훅이 이미 조회해둔 원본 branches/boardBranchMap을 그대로 재사용할
  // 수 있도록 노출한다(같은 조회를 또 하지 않기 위함).
  branches: NavBranchNode[];
  boardBranchMap: Map<string, string>;
  loading: boolean;
  error: string | null;
} {
  const [boards, setBoards] = useState<BoardOption[]>([]);
  const [tree, setTree] = useState<AdminTreeRow<BoardOption>[]>([]);
  const [branches, setBranches] = useState<NavBranchNode[]>([]);
  const [boardBranchMap, setBoardBranchMap] = useState<Map<string, string>>(new Map());
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
      .then(async ([data, fetchedBranches]) => {
        if (cancelled) return;
        const list = (Array.isArray(data) ? data : []) as BoardOption[];
        const unlocked = list.filter((b) => !b.locked);
        const branchMap = await fetchBoardBranchMap(fetchedBranches);
        const builtTree = buildAdminTree(unlocked, (b) => branchMap.get(b.id) ?? null, fetchedBranches, "all");
        if (cancelled) return;
        setBoards(unlocked);
        setTree(builtTree);
        setBranches(fetchedBranches);
        setBoardBranchMap(branchMap);
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

  return { boards, tree, branches, boardBranchMap, loading, error };
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
