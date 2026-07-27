"use client";

import Link from "next/link";
import { SORT_OPTIONS, type SortOption } from "@/lib/boardLayout";

// EPIC-046/047: Editorial Magazine 게시판 공통 헤더 — 게시판명(마스트헤드),
// 검색/정렬 툴바(Board Engine), 우측 글쓰기 버튼, 얇은 Divider. 모든
// 게시판(boards/[id])이 이 컴포넌트 하나를 공유한다.
export function BoardHeader({
  boardName,
  writeHref,
  q,
  onQueryChange,
  sort,
  onSortChange,
}: {
  boardName: string;
  writeHref?: string;
  q?: string;
  onQueryChange?: (value: string) => void;
  sort?: SortOption;
  onSortChange?: (value: SortOption) => void;
}) {
  return (
    <header className="mb-10">
      <div className="flex items-end justify-between gap-4">
        <h1 className="font-serif text-3xl sm:text-4xl font-bold tracking-tight text-gray-900">
          {boardName}
        </h1>
        {writeHref && (
          <Link
            href={writeHref}
            className="shrink-0 rounded-md bg-gray-900 text-white px-4 py-2 text-sm hover:bg-gray-700 transition-colors"
          >
            글쓰기
          </Link>
        )}
      </div>

      {(onQueryChange || onSortChange) && (
        <div className="flex flex-col sm:flex-row gap-2 mt-6">
          {onQueryChange && (
            <input
              type="text"
              value={q ?? ""}
              onChange={(e) => onQueryChange(e.target.value)}
              placeholder="제목, 내용, 작성자, 태그로 검색"
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
            />
          )}
          {onSortChange && (
            <select
              value={sort ?? "latest"}
              onChange={(e) => onSortChange(e.target.value as SortOption)}
              className="w-full sm:w-36 rounded-md border border-gray-300 px-3 py-2 text-sm"
            >
              {SORT_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          )}
        </div>
      )}

      <div className="mt-4 border-t border-gray-200" />
    </header>
  );
}
