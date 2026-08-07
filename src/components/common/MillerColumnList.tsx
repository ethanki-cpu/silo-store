"use client";

// EPIC-088: CategoryBoardPicker.tsx(EPIC-084-REVISED)가 이미 갖고 있던 단일
// 열 렌더링(ColumnList)을 공용 컴포넌트로 뽑아, 새 CategoryBranchPicker.tsx도
// 같은 열 UI를 재사용한다(다열 캐스케이딩 윈도우 중복 구현 방지).
export function ColumnList({
  items,
  selectedId,
  onSelect,
  emptyLabel,
}: {
  items: { id: string; label: string }[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  emptyLabel: string;
}) {
  return (
    <div className="h-56 overflow-y-auto rounded-md border border-gray-200 bg-white">
      {items.length === 0 ? (
        <p className="p-3 text-xs text-gray-400">{emptyLabel}</p>
      ) : (
        <ul>
          {items.map((item) => (
            <li key={item.id}>
              <button
                type="button"
                onClick={() => onSelect(item.id)}
                className={`block w-full truncate px-3 py-2 text-left text-sm ${
                  selectedId === item.id ? "bg-gray-900 text-white" : "text-gray-700 hover:bg-gray-50"
                }`}
              >
                {item.label}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
