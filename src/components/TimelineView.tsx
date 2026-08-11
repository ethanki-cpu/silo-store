"use client";

import type { ReactNode } from "react";
import { groupByYearMonth, type TimelineEntry } from "@/lib/timelineEngine";

// Timeline Engine의 공용 렌더러(EPIC-050/052) — 연/월 헤더 아래 항목을
// 나열하는 반응형 레이아웃 하나를 "타임라인" 게시판(BoardRenderer.tsx)과
// 마이페이지 타임라인 패널이 그대로 공유한다. 항목을 어떻게 그릴지는
// renderItem에 맡겨, 게시글이든 마이페이지 활동 로그든 그대로 재사용된다.
//
// HOTFIX-097(사용자 지시): Common Ninja 스타일 참고 — 선(line) 위에 항상
// 보이는 작은 라벨(날짜+제목)만 두고, hover하면 썸네일+본문 일부+날짜를
// 담은 카드가 옆으로 떠오르게 한다. renderItem은 기존처럼 "항상 보이는
// 라벨"을 그리고, 새로 추가된 renderPreview(선택)가 hover 카드 내용을
// 그린다 — renderPreview를 안 넘기면(마이페이지 활동 로그처럼 썸네일/본문이
// 없는 항목) 기존과 동일하게 hover 카드 없이 라벨만 보인다(하위 호환).
// orientation으로 세로형(기존과 동일한 연/월 그룹핑)과 가로형(스크롤되는
// 단일 라인) 중 고를 수 있다.
export function TimelineView<T extends TimelineEntry>({
  entries,
  renderItem,
  renderPreview,
  orientation = "vertical",
  emptyMessage = "아직 기록이 없어요.",
}: {
  entries: T[];
  renderItem: (entry: T) => ReactNode;
  renderPreview?: (entry: T) => ReactNode;
  orientation?: "vertical" | "horizontal";
  emptyMessage?: string;
}) {
  if (entries.length === 0) {
    return <p className="text-gray-400">{emptyMessage}</p>;
  }

  if (orientation === "horizontal") {
    return <HorizontalTimeline entries={entries} renderItem={renderItem} renderPreview={renderPreview} />;
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
            <div className="space-y-8">
              {months.map((month) => (
                <div key={month}>
                  <h3 className="inline-block rounded-full bg-gray-100 px-3 py-1 text-xs font-medium uppercase tracking-wide text-gray-500 mb-4">
                    {year}년 {Number(month)}월
                  </h3>
                  <div className="relative space-y-1 pl-8">
                    {/* 중앙(좌측) 세로선 */}
                    <div className="absolute left-3 top-1 bottom-1 w-px bg-gray-200" aria-hidden />
                    {byMonth.get(month)!.map((entry) => (
                      <VerticalRow key={entry.id} entry={entry} renderItem={renderItem} renderPreview={renderPreview} />
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

function VerticalRow<T extends TimelineEntry>({
  entry,
  renderItem,
  renderPreview,
}: {
  entry: T;
  renderItem: (entry: T) => ReactNode;
  renderPreview?: (entry: T) => ReactNode;
}) {
  return (
    <div className="group/item relative py-2">
      {/* 아이콘 배지 마커 */}
      <span
        className="absolute left-3 top-1/2 h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-gray-400 bg-white shadow-sm transition-transform group-hover/item:scale-125 group-hover/item:border-gray-700"
        aria-hidden
      />
      <div className="min-w-0 rounded-md px-2 py-1 transition-colors group-hover/item:bg-gray-50">
        {renderItem(entry)}
      </div>
      {renderPreview && (
        <div className="pointer-events-none absolute left-full top-1/2 z-20 ml-3 hidden w-72 -translate-y-1/2 opacity-0 transition-opacity duration-150 group-hover/item:pointer-events-auto group-hover/item:block group-hover/item:opacity-100 lg:block">
          <div className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-lg">
            {renderPreview(entry)}
          </div>
        </div>
      )}
    </div>
  );
}

function HorizontalTimeline<T extends TimelineEntry>({
  entries,
  renderItem,
  renderPreview,
}: {
  entries: T[];
  renderItem: (entry: T) => ReactNode;
  renderPreview?: (entry: T) => ReactNode;
}) {
  const sorted = [...entries].sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
  );

  return (
    <div className="overflow-x-auto pb-2">
      <div className="relative flex min-w-max items-center gap-14 px-6" style={{ height: 260 }}>
        {/* 중앙 가로선 */}
        <div className="absolute left-0 right-0 top-1/2 h-px -translate-y-1/2 bg-gray-200" aria-hidden />
        {sorted.map((entry, idx) => {
          const above = idx % 2 === 0;
          return (
            <div key={entry.id} className="group/item relative flex w-40 flex-col items-center">
              {above ? (
                <>
                  <div className="mb-3 flex flex-1 flex-col justify-end text-center">{renderItem(entry)}</div>
                  <span className="h-3 w-3 rounded-full border-2 border-gray-400 bg-white shadow-sm transition-transform group-hover/item:scale-125 group-hover/item:border-gray-700" />
                  {renderPreview && (
                    <div className="pointer-events-none absolute bottom-full left-1/2 z-20 mb-3 hidden w-64 -translate-x-1/2 opacity-0 transition-opacity duration-150 group-hover/item:pointer-events-auto group-hover/item:block group-hover/item:opacity-100">
                      <div className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-lg">
                        {renderPreview(entry)}
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <>
                  <span className="h-3 w-3 rounded-full border-2 border-gray-400 bg-white shadow-sm transition-transform group-hover/item:scale-125 group-hover/item:border-gray-700" />
                  <div className="mt-3 flex flex-1 flex-col text-center">{renderItem(entry)}</div>
                  {renderPreview && (
                    <div className="pointer-events-none absolute top-full left-1/2 z-20 mt-3 hidden w-64 -translate-x-1/2 opacity-0 transition-opacity duration-150 group-hover/item:pointer-events-auto group-hover/item:block group-hover/item:opacity-100">
                      <div className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-lg">
                        {renderPreview(entry)}
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
