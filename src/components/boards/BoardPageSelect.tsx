"use client";

import type { BoardOption } from "@/lib/useBoardOptions";

// EPIC-079-PHASE-4: "게시될 페이지 선택" 드롭다운 — 글쓰기(write)에서만
// 쓰이던 것을 글 수정(edit)에서도 동일하게 재사용한다(하드코딩된 옛
// "카테고리" 드롭다운 대체).
export function BoardPageSelect({
  boards,
  value,
  onChange,
  label = "게시될 페이지 선택",
}: {
  boards: BoardOption[];
  value: string;
  onChange: (slug: string) => void;
  label?: string;
}) {
  return (
    <div>
      <label className="block text-sm mb-1">{label}</label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-md border border-gray-300 px-3 py-2"
      >
        {/* 아직 목록을 못 받아온 사이(로딩 중)에도 현재 게시판이 선택된
            상태로 보이도록, 목록에 없으면 임시 옵션을 하나 끼워 넣는다. */}
        {!boards.some((b) => (b.slug ?? b.id) === value) && (
          <option value={value}>불러오는 중...</option>
        )}
        {boards.map((b) => (
          <option key={b.id} value={b.slug ?? b.id}>
            {b.name}
          </option>
        ))}
      </select>
    </div>
  );
}
