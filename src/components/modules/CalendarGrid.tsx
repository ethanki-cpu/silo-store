import type { ReactNode } from "react";
import type { CalendarModuleProps } from "@/lib/pageModules";

function daysInMonth(year: number, month: number) {
  return new Date(year, month, 0).getDate();
}

function firstWeekday(year: number, month: number) {
  return new Date(year, month - 1, 1).getDay();
}

const WEEKDAY_LABELS = ["일", "월", "화", "수", "목", "금", "토"];

// EPIC-054B: Page Module "Calendar" — src/app/attendance/page.tsx의 월-그리드
// 레이아웃(grid-cols-7)을 일반화한 순수 프레젠테이션 셸. 출석/예약 등 실제
// 데이터 조회는 하지 않고 markedDates만 표시한다(콘텐츠/기능 추가 금지).
// EPIC-092(요구사항 5): 순수 셸이라는 원칙은 그대로 유지하되, 호출부가
// 날짜별 확장 콘텐츠(미디어 슬라이더/글 목록/+글 등록 버튼 등)를 넘길 수
// 있도록 cellContent render-prop 하나만 추가한다 — 없으면 기존과 100%
// 동일하게 동작한다. 호버 확대(Stacking Context 주의): 부모 그리드에
// isolate를 줘 새 stacking context를 만들고, 확대되는 셀에만 hover:z-20을
// 줘서 이웃 셀 위로 자연스럽게 뜨게 한다(부모/조상에 overflow-hidden을
// 두지 않아야 함).
export function CalendarGrid({
  year,
  month,
  markedDates = [],
  onDateClick,
  cellContent,
  cellWrapper,
}: CalendarModuleProps & {
  cellContent?: (date: string) => ReactNode;
  // EPIC-096(요구사항 2.2): 이 셸은 여전히 dnd-kit을 전혀 모른다 —
  // 드래그앤드롭이 필요한 호출부(CalendarBoardWidget)가 날짜 셀 하나
  // 전체를 자기 마음대로(useDraggable/useDroppable 등) 감쌀 수 있는
  // 훅만 열어준다. 없으면(기존 호출부 전부) 100% 그대로 동작한다.
  cellWrapper?: (date: string, children: ReactNode) => ReactNode;
}) {
  const total = daysInMonth(year, month);
  const startOffset = firstWeekday(year, month);
  const cells: (number | null)[] = [
    ...Array(startOffset).fill(null),
    ...Array.from({ length: total }, (_, i) => i + 1),
  ];
  const pad = (n: number) => String(n).padStart(2, "0");

  return (
    <div className="isolate">
      <p className="text-sm font-semibold text-gray-700 mb-2">
        {year}년 {month}월
      </p>
      <div className="grid grid-cols-7 gap-1 text-center text-xs text-gray-400 mb-1">
        {WEEKDAY_LABELS.map((d) => (
          <div key={d}>{d}</div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {cells.map((day, i) => {
          if (day === null) return <div key={`empty-${i}`} />;
          const dateStr = `${year}-${pad(month)}-${pad(day)}`;
          const marked = markedDates.includes(dateStr);
          const cell = (
            <div key={dateStr} className="group relative">
              <button
                type="button"
                onClick={() => onDateClick?.(dateStr)}
                className={`relative aspect-square w-full rounded-md flex items-center justify-center text-sm transition-transform duration-150 hover:scale-125 hover:z-20 hover:shadow-lg ${
                  marked ? "bg-gray-800 text-white" : "text-gray-700 hover:bg-gray-50"
                }`}
              >
                {day}
              </button>
              {cellContent && (
                <div className="absolute left-1/2 top-full z-30 hidden -translate-x-1/2 pt-1 group-hover:block">
                  {cellContent(dateStr)}
                </div>
              )}
            </div>
          );
          return cellWrapper ? <div key={dateStr}>{cellWrapper(dateStr, cell)}</div> : cell;
        })}
      </div>
    </div>
  );
}
