"use client";

import { useEffect, useMemo, useState } from "react";
import type { NavBranchNode } from "@/lib/adminTreeGrouping";
import { ColumnList } from "@/components/common/MillerColumnList";

// EPIC-088(요구사항 6): 게시판 수정 화면의 "Category" 필드 — 기존
// 하드코딩된 단일 드롭다운(group_key)을 대체하는 N열 캐스케이딩 카테고리
// 선택창. CategoryBoardPicker.tsx(3열 고정, 마지막 열은 항상 "게시판")와
// 달리, 이 컴포넌트는 게시판 자체가 아니라 "이 게시판이 사이트 메뉴 트리의
// 어느 분기(branch)에 속하는지"를 고르는 용도라 열 수가 트리 깊이만큼
// 동적으로 늘어나고, 어느 열에서 멈추든(리프까지 안 가도) 그 자리의 분기를
// 최종 선택값으로 쓸 수 있다 — 실제 site_navigations 트리 구조와 100%
// 동일한 depth로 전개된다(1열=최상위 메뉴, 2열=하위 메뉴, 3열=상세
// 하위메뉴, 트리가 더 깊으면 4열 이상도 자동으로 열린다).
export function CategoryBranchPicker({
  branches,
  value,
  onChange,
}: {
  branches: NavBranchNode[];
  /** 현재 선택된 분기(branch)의 id — null이면 선택 안 됨. */
  value: string | null;
  onChange: (branchId: string | null) => void;
}) {
  const branchById = useMemo(() => new Map(branches.map((b) => [b.id, b])), [branches]);

  const initialChain = useMemo(() => {
    const chain: string[] = [];
    let current = value ? branchById.get(value) : undefined;
    while (current) {
      chain.unshift(current.id);
      current = current.parentId ? branchById.get(current.parentId) : undefined;
    }
    return chain;
  }, [value, branchById]);

  const [selectedChain, setSelectedChain] = useState<string[]>(initialChain);
  const initialChainKey = initialChain.join("/");
  useEffect(() => {
    setSelectedChain(initialChain);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialChainKey]);

  // 열(column) 목록을 selectedChain을 따라 동적으로 구성한다 — 마지막으로
  // 선택한 항목에 자식이 있으면 다음 열이 하나 더 열리고, 없으면 거기서
  // 멈춘다(리프에 도달).
  const columns: { items: { id: string; label: string }[] }[] = [];
  let parentId: string | null = null;
  for (let depth = 0; ; depth++) {
    const items = branches
      .filter((b) => b.parentId === parentId)
      .map((b) => ({ id: b.id, label: b.title }));
    columns.push({ items });
    const selectedAtDepth = selectedChain[depth];
    if (!selectedAtDepth) break;
    const hasChildren = branches.some((b) => b.parentId === selectedAtDepth);
    if (!hasChildren) break;
    parentId = selectedAtDepth;
  }

  function handleSelect(depth: number, id: string) {
    const nextChain = [...selectedChain.slice(0, depth), id];
    setSelectedChain(nextChain);
    onChange(id);
  }

  const selectedBranch = value ? branchById.get(value) : undefined;

  return (
    <div className="space-y-2">
      <div
        className="grid gap-2"
        style={{ gridTemplateColumns: `repeat(${columns.length}, minmax(0, 1fr))` }}
      >
        {columns.map((col, depth) => (
          <ColumnList
            key={depth}
            items={col.items}
            selectedId={selectedChain[depth] ?? null}
            onSelect={(id) => handleSelect(depth, id)}
            emptyLabel={depth === 0 ? "카테고리 없음" : "하위 카테고리 없음"}
          />
        ))}
      </div>
      <div className="flex items-center justify-between text-xs">
        <span className="text-gray-500">
          {selectedBranch ? `선택됨: ${selectedBranch.title}` : "선택 안 됨"}
        </span>
        {value && (
          <button
            type="button"
            onClick={() => {
              setSelectedChain([]);
              onChange(null);
            }}
            className="text-gray-400 hover:text-gray-600"
          >
            선택 해제
          </button>
        )}
      </div>
    </div>
  );
}
