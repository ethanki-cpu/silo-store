"use client";

// Board Engine(EPIC-047): 10개 단위 페이지네이션, 페이지 번호는 한 번에
// 최대 10개까지(블록 단위)만 보여준다.
export function Pagination({
  page,
  totalPages,
  onPageChange,
}: {
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}) {
  if (totalPages <= 1) return null;

  const blockSize = 10;
  const blockStart = Math.floor((page - 1) / blockSize) * blockSize + 1;
  const blockEnd = Math.min(blockStart + blockSize - 1, totalPages);
  const pages = Array.from(
    { length: blockEnd - blockStart + 1 },
    (_, i) => blockStart + i,
  );

  return (
    <nav className="flex items-center justify-center gap-1 mt-12">
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
  );
}
