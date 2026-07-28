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
export function CalendarGrid({
  year,
  month,
  markedDates = [],
  onDateClick,
}: CalendarModuleProps) {
  const total = daysInMonth(year, month);
  const startOffset = firstWeekday(year, month);
  const cells: (number | null)[] = [
    ...Array(startOffset).fill(null),
    ...Array.from({ length: total }, (_, i) => i + 1),
  ];
  const pad = (n: number) => String(n).padStart(2, "0");

  return (
    <div>
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
          return (
            <button
              key={dateStr}
              type="button"
              onClick={() => onDateClick?.(dateStr)}
              className={`aspect-square rounded-md flex items-center justify-center text-sm ${
                marked ? "bg-gray-800 text-white" : "text-gray-700 hover:bg-gray-50"
              }`}
            >
              {day}
            </button>
          );
        })}
      </div>
    </div>
  );
}
