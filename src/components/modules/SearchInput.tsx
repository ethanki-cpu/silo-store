"use client";

// EPIC-054B: BoardHeader.tsx의 검색 입력창을 그대로 뽑아낸 공용 컴포넌트 —
// Page Module "Search"와 게시판 헤더가 동일한 마크업/스타일을 공유한다
// (중복 컴포넌트 생성 금지).
export function SearchInput({
  value,
  onChange,
  placeholder,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}) {
  return (
    <input
      type="text"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
    />
  );
}
