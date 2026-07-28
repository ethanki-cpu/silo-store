"use client";

import type { BoardDefinition, SortOption } from "@/lib/boardLayout";
import { SearchInput } from "@/components/modules/SearchInput";
import { SortSelect } from "@/components/modules/SortSelect";
import { BoardHeaderModule } from "@/components/modules/BoardHeaderModule";

// EPIC-046/047: Editorial Magazine 게시판 공통 헤더 — 게시판명(마스트헤드),
// 검색/정렬 툴바, 우측 글쓰기 버튼, 얇은 Divider. 모든 게시판(boards/[id])이
// 이 컴포넌트 하나를 공유하며, 어떤 영역을 보여줄지는 BoardDefinition의
// searchable/sortable/allowPosting 토글이 결정한다(하드코딩된 분기 없음).
// EPIC-056: 내부적으로 Board Header Module(제목+글쓰기+CTA)/Search
// Module/Sort Module 3개를 조합하는 얇은 레이아웃 래퍼로 재구성했다 —
// 렌더링 결과(HTML/클래스)는 리팩터 전과 동일, 세 모듈이 각자 독립적으로도
// 재사용 가능해졌을 뿐이다.
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
      <BoardHeaderModule
        boardName={boardName}
        writeHref={showWrite ? writeHref : undefined}
        ctas={definition.ctas}
      />

      {(showSearch || showSort) && (
        <div className="flex flex-col sm:flex-row gap-2 mt-6">
          {showSearch && (
            <SearchInput
              value={q ?? ""}
              onChange={onQueryChange!}
              placeholder="제목, 내용, 작성자, 태그로 검색"
            />
          )}
          {showSort && (
            <SortSelect value={sort ?? definition.defaultSort} onChange={onSortChange!} />
          )}
        </div>
      )}

      <div className="mt-4 border-t border-gray-200" />
    </header>
  );
}
