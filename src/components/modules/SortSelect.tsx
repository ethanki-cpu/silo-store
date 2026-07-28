import { SORT_OPTIONS, type SortOption } from "@/lib/boardLayout";

// EPIC-056: Board Module 목록 ④ Sort Module — 최신순/인기순/조회순/댓글순
// (+오래된순). src/components/boards/BoardHeader.tsx 안에 인라인으로 있던
// <select>를 그대로 뽑아낸 것(마크업/옵션 목록 변경 없음) — BoardHeader와
// Page Module "sort"가 이 컴포넌트 하나를 공유한다.
export function SortSelect({
  value,
  onChange,
}: {
  value: SortOption;
  onChange: (value: SortOption) => void;
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value as SortOption)}
      className="w-full sm:w-36 rounded-md border border-gray-300 px-3 py-2 text-sm"
    >
      {SORT_OPTIONS.map((opt) => (
        <option key={opt.value} value={opt.value}>
          {opt.label}
        </option>
      ))}
    </select>
  );
}
