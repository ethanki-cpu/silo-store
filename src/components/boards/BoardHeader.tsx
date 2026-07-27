"use client";

import Link from "next/link";
import { SORT_OPTIONS, type BoardDefinition, type SortOption } from "@/lib/boardLayout";

// EPIC-046/047: Editorial Magazine 게시판 공통 헤더 — 게시판명(마스트헤드),
// 검색/정렬 툴바, 우측 글쓰기 버튼, 얇은 Divider. 모든 게시판(boards/[id])이
// 이 컴포넌트 하나를 공유하며, 어떤 영역을 보여줄지는 BoardDefinition의
// searchable/sortable/allowPosting 토글이 결정한다(하드코딩된 분기 없음).
export function BoardHeader({
  boardName,
  writeHref,
  definition,
  q,
  onQueryChange,
  sort,
  onSortChange,
}: {
  boardName: string;
  writeHref?: string;
  definition: BoardDefinition;
  q?: string;
  onQueryChange?: (value: string) => void;
  sort?: SortOption;
  onSortChange?: (value: SortOption) => void;
}) {
  const showSearch = definition.searchable && Boolean(onQueryChange);
  const showSort = definition.sortable && Boolean(onSortChange);
  const showWrite = definition.allowPosting && Boolean(writeHref);

  return (
    <header className="mb-10">
      <div className="flex items-end justify-between gap-4">
        <h1 className="font-serif text-3xl sm:text-4xl font-bold tracking-tight text-gray-900">
          {boardName}
        </h1>
        {showWrite && (
          <Link
            href={writeHref!}
            className="shrink-0 rounded-md bg-gray-900 text-white px-4 py-2 text-sm hover:bg-gray-700 transition-colors"
          >
            글쓰기
          </Link>
        )}
      </div>

      {(showSearch || showSort) && (
        <div className="flex flex-col sm:flex-row gap-2 mt-6">
          {showSearch && (
            <input
              type="text"
              value={q ?? ""}
              onChange={(e) => onQueryChange!(e.target.value)}
              placeholder="제목, 내용, 작성자, 태그로 검색"
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
            />
          )}
          {showSort && (
            <select
              value={sort ?? definition.defaultSort}
              onChange={(e) => onSortChange!(e.target.value as SortOption)}
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
