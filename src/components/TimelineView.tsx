"use client";

import type { ReactNode } from "react";
import { groupByYearMonth, type TimelineEntry } from "@/lib/timelineEngine";

// Timeline Engine의 공용 렌더러(EPIC-050/052) — 연/월 헤더 아래 항목을
// 나열하는 반응형 레이아웃 하나를 "타임라인" 게시판(BoardRenderer.tsx)과
// 마이페이지 타임라인 패널이 그대로 공유한다. 항목을 어떻게 그릴지는
// renderItem에 맡겨, 게시글이든 마이페이지 활동 로그든 그대로 재사용된다.
export function TimelineView<T extends TimelineEntry>({
  entries,
  renderItem,
  emptyMessage = "아직 기록이 없어요.",
}: {
  entries: T[];
  renderItem: (entry: T) => ReactNode;
  emptyMessage?: string;
}) {
  if (entries.length === 0) {
    return <p className="text-gray-400">{emptyMessage}</p>;
  }

  const grouped = groupByYearMonth(entries);
  const years = [...grouped.keys()].sort((a, b) => Number(b) - Number(a));

  return (
    <div className="space-y-12">
      {years.map((year) => {
        const byMonth = grouped.get(year)!;
        const months = [...byMonth.keys()].sort((a, b) => Number(b) - Number(a));

        return (
          <section key={year}>
            <h2 className="font-serif text-2xl font-bold text-gray-900 mb-6">
              {year}
            </h2>
            <div className="space-y-8 border-l border-gray-200 pl-6">
              {months.map((month) => (
                <div key={month}>
                  <h3 className="text-xs uppercase tracking-wide text-gray-400 mb-3">
                    {year}년 {Number(month)}월
                  </h3>
                  <div className="space-y-3">
                    {byMonth.get(month)!.map((entry) => (
                      <div key={entry.id}>{renderItem(entry)}</div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}
