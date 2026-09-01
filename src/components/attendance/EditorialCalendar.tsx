"use client";

// EPIC-155: 에디토리얼 매거진 스타일의 인터랙티브 출석체크/이벤트 캘린더.
// 참고 이미지 3장 — (1) 7일 그리드 기본 구조, (2) Cake Wines 포스터의
// 톤앤매너(두꺼운 흑백 테두리·초대형 볼드 날짜·세로 텍스트·고대비 썸네일
// 그리드), (3) 날짜 셀 ↔ 팝업 카드를 잇는 동적 SVG 커넥터 인터랙션.
//
// 실제 이미지 자산 없이도(더미 데이터) 완결된 상태를 보여줘야 하므로,
// 썸네일은 실제 사진 대신 날짜/제목을 해시한 결정론적 흑백 그라디언트로
// 대체한다 — 매번 같은 항목은 같은 톤을 유지해 "디자인된 것처럼" 보인다.
import { useLayoutEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import type { CalendarEntry } from "./editorialCalendarTypes";

const WEEKDAYS = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"];
const MONTH_NAMES = [
  "JANUARY", "FEBRUARY", "MARCH", "APRIL", "MAY", "JUNE",
  "JULY", "AUGUST", "SEPTEMBER", "OCTOBER", "NOVEMBER", "DECEMBER",
];

function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

function dateKey(year: number, month: number, day: number): string {
  return `${year}-${pad2(month + 1)}-${pad2(day)}`;
}

/** 실제 이미지 대신 쓰는 결정론적 흑백-듀오톤 그라디언트 — hue는 항목마다
 * 고정이라 리렌더돼도 같은 항목은 항상 같은 톤을 유지한다. */
function thumbnailStyle(hue: number): React.CSSProperties {
  return {
    backgroundImage: `linear-gradient(135deg, hsl(${hue} 12% 14%) 0%, hsl(${hue} 6% 38%) 55%, hsl(${hue} 4% 82%) 100%)`,
    filter: "grayscale(0.55) contrast(1.15)",
  };
}

type Point = { x: number; y: number };

function connectorPath(from: Point, to: Point): string {
  const midX = (from.x + to.x) / 2;
  return `M ${from.x} ${from.y} C ${midX} ${from.y}, ${midX} ${to.y}, ${to.x} ${to.y}`;
}

export function EditorialCalendar({
  entries,
  initialYear,
  initialMonth,
}: {
  entries: CalendarEntry[];
  /** 지정 안 하면 오늘 기준 */
  initialYear?: number;
  /** 0-based */
  initialMonth?: number;
}) {
  const now = new Date();
  const [year, setYear] = useState(initialYear ?? now.getFullYear());
  const [month, setMonth] = useState(initialMonth ?? now.getMonth());
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [path, setPath] = useState<string | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);
  const cellRefs = useRef<Map<string, HTMLButtonElement>>(new Map());
  const popupRef = useRef<HTMLDivElement>(null);

  const entriesByDate = new Map<string, CalendarEntry[]>();
  for (const entry of entries) {
    const list = entriesByDate.get(entry.date) ?? [];
    list.push(entry);
    entriesByDate.set(entry.date, list);
  }

  const firstWeekday = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells: (number | null)[] = [
    ...Array(firstWeekday).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];
  // 마지막 주도 7칸으로 채워 그리드 라인이 끊기지 않게 한다.
  while (cells.length % 7 !== 0) cells.push(null);

  const selectedEntries = selectedDate ? (entriesByDate.get(selectedDate) ?? []) : [];

  function recomputeConnector() {
    if (!selectedDate) {
      setPath(null);
      return;
    }
    const container = containerRef.current;
    const cell = cellRefs.current.get(selectedDate);
    const popup = popupRef.current;
    if (!container || !cell || !popup) return;

    const containerRect = container.getBoundingClientRect();
    const cellRect = cell.getBoundingClientRect();
    const popupRect = popup.getBoundingClientRect();

    const from: Point = {
      x: cellRect.right - containerRect.left,
      y: cellRect.top + cellRect.height / 2 - containerRect.top,
    };
    const to: Point = {
      x: popupRect.left - containerRect.left,
      y: popupRect.top + popupRect.height / 2 - containerRect.top,
    };
    setPath(connectorPath(from, to));
  }

  useLayoutEffect(() => {
    recomputeConnector();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedDate, year, month]);

  useLayoutEffect(() => {
    if (!selectedDate) return;
    function handle() {
      recomputeConnector();
    }
    window.addEventListener("resize", handle);
    return () => window.removeEventListener("resize", handle);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedDate]);

  function goToMonth(delta: number) {
    setSelectedDate(null);
    const next = new Date(year, month + delta, 1);
    setYear(next.getFullYear());
    setMonth(next.getMonth());
  }

  function handleSelect(key: string) {
    setSelectedDate((prev) => (prev === key ? null : key));
  }

  return (
    <div className="w-full bg-white text-black">
      <div ref={containerRef} className="relative mx-auto flex max-w-6xl">
        {/* 왼쪽 세로 텍스트 레일 — Cake Wines 포스터의 세로 라벨 오마주 */}
        <div className="hidden shrink-0 flex-col items-center justify-between border-r-4 border-black px-2 py-6 sm:flex">
          <span
            className="text-xs font-bold tracking-[0.3em]"
            style={{ writingMode: "vertical-rl" }}
          >
            SILO STORE CALENDAR
          </span>
          <span
            className="text-[10px] tracking-[0.2em] text-neutral-400"
            style={{ writingMode: "vertical-rl" }}
          >
            silostore.net
          </span>
        </div>

        <div className="flex-1">
          {/* 헤더 — 초대형 볼드 월 타이포그래피 */}
          <div className="flex items-end justify-between border-b-4 border-black px-4 py-4 sm:px-8">
            <div>
              <div className="text-[11px] font-bold tracking-[0.3em] text-neutral-500">
                {year}
              </div>
              <h2 className="text-4xl font-black leading-none tracking-tight sm:text-6xl">
                {MONTH_NAMES[month]}
              </h2>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => goToMonth(-1)}
                aria-label="이전 달"
                className="flex h-9 w-9 items-center justify-center border-2 border-black text-lg font-bold hover:bg-black hover:text-white"
              >
                ←
              </button>
              <button
                type="button"
                onClick={() => goToMonth(1)}
                aria-label="다음 달"
                className="flex h-9 w-9 items-center justify-center border-2 border-black text-lg font-bold hover:bg-black hover:text-white"
              >
                →
              </button>
            </div>
          </div>

          {/* 요일 헤더 */}
          <div className="grid grid-cols-7 border-b-2 border-black">
            {WEEKDAYS.map((w) => (
              <div
                key={w}
                className="border-r border-neutral-300 px-2 py-2 text-center text-[11px] font-bold tracking-[0.2em] text-neutral-500 last:border-r-0"
              >
                {w}
              </div>
            ))}
          </div>

          {/* 날짜 그리드 */}
          <div className="grid grid-cols-7">
            {cells.map((day, idx) => {
              if (day === null) {
                return (
                  <div
                    key={`blank-${idx}`}
                    className="aspect-square border-b border-r border-neutral-200 bg-neutral-50 last:border-r-0"
                  />
                );
              }
              const key = dateKey(year, month, day);
              const dayEntries = entriesByDate.get(key) ?? [];
              const hasContent = dayEntries.length > 0;
              const isSelected = selectedDate === key;
              const primary = dayEntries[0];

              return (
                <button
                  key={key}
                  type="button"
                  ref={(el) => {
                    if (el) cellRefs.current.set(key, el);
                    else cellRefs.current.delete(key);
                  }}
                  onClick={() => handleSelect(key)}
                  disabled={!hasContent}
                  aria-pressed={isSelected}
                  className={`group relative flex aspect-square flex-col items-stretch overflow-hidden border-b border-r border-neutral-200 p-1.5 text-left last:border-r-0 sm:p-2 ${
                    hasContent ? "cursor-pointer" : "cursor-default"
                  } ${isSelected ? "ring-4 ring-inset ring-black" : ""}`}
                >
                  <span
                    className={`font-black leading-none ${
                      hasContent ? "text-xl sm:text-3xl" : "text-sm text-neutral-300 sm:text-base"
                    }`}
                  >
                    {pad2(day)}
                  </span>

                  {hasContent && (
                    <>
                      <div className="mt-1 grid flex-1 grid-cols-2 gap-0.5 overflow-hidden">
                        {dayEntries.slice(0, 4).map((e, i) => (
                          <div
                            key={i}
                            className="min-h-0"
                            style={thumbnailStyle(e.huesSeed ?? 0)}
                          />
                        ))}
                      </div>
                      <span className="mt-1 truncate text-[10px] font-bold uppercase tracking-wide text-white mix-blend-difference sm:text-xs">
                        {primary.title}
                      </span>
                    </>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* 팝업이 뜨는 여백 레일 — 항상 공간을 차지해 레이아웃이 튀지 않는다 */}
        <div className="relative hidden w-72 shrink-0 border-l-4 border-black md:block">
          <AnimatePresence mode="wait">
            {selectedDate && selectedEntries.length > 0 && (
              <motion.div
                key={selectedDate}
                ref={popupRef}
                initial={{ opacity: 0, y: 12, scale: 0.96 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 8, scale: 0.96 }}
                transition={{ duration: 0.22, ease: "easeOut" }}
                className="absolute left-6 right-4 top-10 border-2 border-black bg-white p-4 shadow-[6px_6px_0_0_rgba(0,0,0,1)]"
              >
                <p className="text-[10px] font-bold tracking-[0.25em] text-neutral-400">
                  {selectedDate}
                </p>
                <div className="mt-2 space-y-4">
                  {selectedEntries.map((e, i) => (
                    <div key={i} className={i > 0 ? "border-t border-neutral-200 pt-3" : ""}>
                      <span
                        className={`inline-block px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white ${
                          e.type === "attendance" ? "bg-black" : "bg-neutral-600"
                        }`}
                      >
                        {e.type === "attendance" ? "Attendance" : "Event"}
                      </span>
                      <h3 className="mt-1.5 text-lg font-black leading-snug">{e.title}</h3>
                      {e.description && (
                        <p className="mt-1 text-sm leading-relaxed text-neutral-600">
                          {e.description}
                        </p>
                      )}
                      {e.meta && (
                        <p className="mt-1.5 text-xs font-semibold text-neutral-500">{e.meta}</p>
                      )}
                    </div>
                  ))}
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedDate(null)}
                  aria-label="닫기"
                  className="absolute right-2 top-2 flex h-6 w-6 items-center justify-center text-sm font-bold text-neutral-400 hover:text-black"
                >
                  ✕
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* SVG 커넥터 오버레이 — 셀과 팝업 사이를 잇는 선, 나타날 때 그려지는
            애니메이션(pathLength 0 -> 1)을 준다. */}
        <svg
          className="pointer-events-none absolute inset-0 z-10 hidden h-full w-full md:block"
          aria-hidden="true"
        >
          <AnimatePresence mode="wait">
            {path && (
              <motion.path
                key={selectedDate}
                d={path}
                fill="none"
                stroke="black"
                strokeWidth={2}
                strokeDasharray="6 4"
                initial={{ pathLength: 0, opacity: 0 }}
                animate={{ pathLength: 1, opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.35, ease: "easeInOut" }}
              />
            )}
          </AnimatePresence>
        </svg>
      </div>

      {/* 모바일 — 여백 레일 대신 그리드 바로 아래에 팝업을 붙인다(커넥터 선은
          가로 폭이 좁아 의미가 없어져 md 미만에서는 숨긴다). */}
      <div className="md:hidden">
        <AnimatePresence mode="wait">
          {selectedDate && selectedEntries.length > 0 && (
            <motion.div
              key={selectedDate}
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden border-t-4 border-black"
            >
              <div className="p-4">
                <p className="text-[10px] font-bold tracking-[0.25em] text-neutral-400">
                  {selectedDate}
                </p>
                <div className="mt-2 space-y-4">
                  {selectedEntries.map((e, i) => (
                    <div key={i} className={i > 0 ? "border-t border-neutral-200 pt-3" : ""}>
                      <span
                        className={`inline-block px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white ${
                          e.type === "attendance" ? "bg-black" : "bg-neutral-600"
                        }`}
                      >
                        {e.type === "attendance" ? "Attendance" : "Event"}
                      </span>
                      <h3 className="mt-1.5 text-lg font-black leading-snug">{e.title}</h3>
                      {e.description && (
                        <p className="mt-1 text-sm leading-relaxed text-neutral-600">
                          {e.description}
                        </p>
                      )}
                      {e.meta && (
                        <p className="mt-1.5 text-xs font-semibold text-neutral-500">{e.meta}</p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
