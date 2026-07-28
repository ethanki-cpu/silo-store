// EPIC-056: Board Module 목록 ⑩ Filter Module — 카테고리/시대 등 단일
// 선택 필터 pill 목록. 새 디자인이 아니라 docs/design-system.md §4에 이미
// 정리된 상점 시대 필터 pill 관례(rounded-full px-3 py-1.5 text-sm border,
// 활성 bg-gray-800 text-white / 비활성 border-gray-300 text-gray-600)를
// 그대로 재사용한 범용 컴포넌트다.
export function FilterModule<T extends string>({
  options,
  value,
  onChange,
}: {
  options: { value: T; label: string }[];
  value: T | null;
  onChange: (value: T | null) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      <button
        type="button"
        onClick={() => onChange(null)}
        className={`rounded-full px-3 py-1.5 text-sm border ${
          value === null
            ? "bg-gray-800 text-white border-gray-800"
            : "border-gray-300 text-gray-600 hover:bg-gray-50"
        }`}
      >
        전체
      </button>
      {options.map((opt) => (
        <button
          key={opt.value}
          type="button"
          onClick={() => onChange(opt.value)}
          className={`rounded-full px-3 py-1.5 text-sm border ${
            value === opt.value
              ? "bg-gray-800 text-white border-gray-800"
              : "border-gray-300 text-gray-600 hover:bg-gray-50"
          }`}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}
