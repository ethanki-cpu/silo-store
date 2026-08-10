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

  // EPIC-092(요구사항 2): Commonninja 스타일의 중앙선+배지+카드 타임라인으로
  // 재설계 — entries/renderItem/emptyMessage 계약은 그대로 유지하고, 각
  // 항목을 감싸는 선/배지/카드 마크업만 이 컴포넌트가 새로 책임진다. 좌우
  // 교차 배치는 하지 않는다(마이페이지 패널처럼 좁은 컨테이너에서도 동일하게
  // 동작해야 하므로 단일 컬럼 + 좌측 선 + 카드 조합으로 통일).
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
            <div className="space-y-8">
              {months.map((month) => (
                <div key={month}>
                  <h3 className="inline-block rounded-full bg-gray-100 px-3 py-1 text-xs font-medium uppercase tracking-wide text-gray-500 mb-4">
                    {year}년 {Number(month)}월
                  </h3>
                  <div className="relative space-y-6 pl-8">
                    {/* 중앙(좌측) 세로선 */}
                    <div className="absolute left-3 top-1 bottom-1 w-px bg-gray-200" aria-hidden />
                    {byMonth.get(month)!.map((entry) => (
                      <div key={entry.id} className="relative">
                        {/* 아이콘 배지 마커 */}
                        <span className="absolute left-3 top-1 h-3 w-3 -translate-x-1/2 rounded-full border-2 border-gray-400 bg-white shadow-sm" aria-hidden />
                        <div className="rounded-lg border border-gray-100 bg-white p-4 shadow-sm transition-shadow hover:shadow-md">
                          {renderItem(entry)}
                        </div>
                      </div>
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
