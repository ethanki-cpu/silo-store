"use client";

const PAGE_SIZE_OPTIONS = [12, 24, 48, 100];

// Board Engine(EPIC-047): 10개 단위 페이지네이션, 페이지 번호는 한 번에
// 최대 10개까지(블록 단위)만 보여준다.
// EPIC-066: 방문자가 직접 페이지당 개수(12/24/48/100)를 고를 수 있는
// 드롭다운 추가 — pageSize/onPageSizeChange를 안 넘기면(기존 호출부)
// 드롭다운 자체가 렌더링되지 않아 하위 호환이 깨지지 않는다.
export function Pagination({
  page,
  totalPages,
  onPageChange,
  pageSize,
  onPageSizeChange,
}: {
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  pageSize?: number;
  onPageSizeChange?: (size: number) => void;
}) {
  const showPageSizeSelect = pageSize !== undefined && Boolean(onPageSizeChange);

  if (totalPages <= 1 && !showPageSizeSelect) return null;

  const blockSize = 10;
  const blockStart = Math.floor((page - 1) / blockSize) * blockSize + 1;
  const blockEnd = Math.min(blockStart + blockSize - 1, totalPages);
  const pages = Array.from(
    { length: blockEnd - blockStart + 1 },
    (_, i) => blockStart + i,
  );

  return (
    <div className="mt-12 flex flex-col items-center gap-3">
      {totalPages > 1 && (
        <nav className="flex items-center justify-center gap-1">
          <button
            type="button"
            disabled={blockStart === 1}
            onClick={() => onPageChange(blockStart - 1)}
            className="px-2 py-1 text-sm text-gray-400 disabled:opacity-30"
          >
            이전
          </button>
          {pages.map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => onPageChange(p)}
              className={`w-8 h-8 text-sm rounded-full ${
                p === page
                  ? "bg-gray-900 text-white"
                  : "text-gray-600 hover:bg-gray-100"
              }`}
            >
              {p}
            </button>
          ))}
          <button
            type="button"
            disabled={blockEnd === totalPages}
            onClick={() => onPageChange(blockEnd + 1)}
            className="px-2 py-1 text-sm text-gray-400 disabled:opacity-30"
          >
            다음
          </button>
        </nav>
      )}
      {showPageSizeSelect && (
        <label className="flex items-center gap-1.5 text-xs text-gray-400">
          페이지당
          <select
            value={pageSize}
            onChange={(e) => onPageSizeChange!(Number(e.target.value))}
            className="rounded-md border border-gray-200 px-1.5 py-0.5 text-xs text-gray-600"
          >
            {PAGE_SIZE_OPTIONS.map((n) => (
              <option key={n} value={n}>
                {n}개
              </option>
            ))}
          </select>
        </label>
      )}
    </div>
  );
}
