"use client";

import type { CSSProperties, ReactNode } from "react";
import { groupByYearMonth, type TimelineEntry } from "@/lib/timelineEngine";

// Timeline Engine의 공용 렌더러(EPIC-050/052) — 연/월 헤더 아래 항목을
// 나열하는 반응형 레이아웃 하나를 "타임라인" 게시판(BoardRenderer.tsx)과
// 마이페이지 타임라인 패널이 그대로 공유한다. 항목을 어떻게 그릴지는
// renderItem에 맡겨, 게시글이든 마이페이지 활동 로그든 그대로 재사용된다.
//
// HOTFIX-097(사용자 지시): Common Ninja 스타일 참고 — 선(line) 위에 항상
// 보이는 작은 라벨(날짜+제목)만 두고, hover하면 썸네일+본문 일부+날짜+메타를
// 담은 카드가 옆으로 떠오르게 한다. renderItem은 기존처럼 "항상 보이는
// 라벨"을 그리고, 새로 추가된 renderPreview(선택)가 hover 카드 내용을
// 그린다 — renderPreview를 안 넘기면(마이페이지 활동 로그처럼 썸네일/본문이
// 없는 항목) 기존과 동일하게 hover 카드 없이 라벨만 보인다(하위 호환).
// orientation으로 세로형(기존과 동일한 연/월 그룹핑)과 가로형(스크롤되는
// 단일 라인) 중 고를 수 있다.
//
// HOTFIX-100(사용자 지시): (1) 세로형에서 "정렬"(align)이 왼쪽/가운데/
// 오른쪽일 때 선·마커의 위치도 텍스트 정렬을 따라간다. (2) accentColorHex로
// 선/마커 색을 게시판마다 다르게 지정할 수 있다.
//
// HOTFIX-103(사용자 지시 — "타임라인 아직도 구리다"): 참고 이미지(Common
// Ninja)와의 격차를 좁히려고 3가지를 더 손볼 수 있게 한다 — 카드 테마
// (라이트/다크, 참고 이미지의 빨간 라인 예시가 쓰는 어두운 카드), 선 굵기,
// 마커 크기. 기본값 자체도 기존보다 조금 더 존재감 있게 올렸다(선 1px→2px,
// 마커 12px→14px, 카드 모서리/그림자도 더 뚜렷하게).
const DEFAULT_LINE_WIDTH_PX = 2;
const DEFAULT_MARKER_SIZE_PX = 14;

export function TimelineView<T extends TimelineEntry>({
  entries,
  renderItem,
  renderPreview,
  orientation = "vertical",
  align = "left",
  accentColorHex,
  lineWidthPx = DEFAULT_LINE_WIDTH_PX,
  markerSizePx = DEFAULT_MARKER_SIZE_PX,
  cardTheme = "light",
  emptyMessage = "아직 기록이 없어요.",
}: {
  entries: T[];
  renderItem: (entry: T) => ReactNode;
  renderPreview?: (entry: T) => ReactNode;
  orientation?: "vertical" | "horizontal";
  align?: "left" | "center" | "right";
  accentColorHex?: string;
  lineWidthPx?: number;
  markerSizePx?: number;
  cardTheme?: "light" | "dark";
  emptyMessage?: string;
}) {
  if (entries.length === 0) {
    return <p className="text-gray-400">{emptyMessage}</p>;
  }

  if (orientation === "horizontal") {
    return (
      <HorizontalTimeline
        entries={entries}
        renderItem={renderItem}
        renderPreview={renderPreview}
        accentColorHex={accentColorHex}
        lineWidthPx={lineWidthPx}
        markerSizePx={markerSizePx}
        cardTheme={cardTheme}
      />
    );
  }

  const grouped = groupByYearMonth(entries);
  const years = [...grouped.keys()].sort((a, b) => Number(b) - Number(a));

  const spineSide = align === "right" ? "right" : "left"; // center는 좌측 spine 유지 + 텍스트만 중앙 정렬
  const spinePositionClass = align === "center" ? "left-1/2 -translate-x-1/2" : spineSide === "right" ? "right-3" : "left-3";
  const contentPaddingClass = align === "right" ? "pr-8 pl-0" : align === "center" ? "px-8" : "pl-8 pr-0";

  return (
    <div className="space-y-12">
      {years.map((year) => {
        const byMonth = grouped.get(year)!;
        const months = [...byMonth.keys()].sort((a, b) => Number(b) - Number(a));

        return (
          <section key={year}>
            <h2
              className={`font-serif text-2xl font-bold text-gray-900 mb-6 ${
                align === "center" ? "text-center" : align === "right" ? "text-right" : ""
              }`}
            >
              {year}
            </h2>
            <div className="space-y-8">
              {months.map((month) => (
                <div key={month}>
                  <h3
                    className={`inline-block rounded-full bg-gray-100 px-3 py-1 text-xs font-medium uppercase tracking-wide text-gray-500 mb-4 ${
                      align === "center" ? "mx-auto flex justify-center" : align === "right" ? "ml-auto" : ""
                    }`}
                  >
                    {year}년 {Number(month)}월
                  </h3>
                  <div className={`relative space-y-1 ${contentPaddingClass}`}>
                    {/* 세로선(spine) — 정렬을 따라 왼쪽/가운데/오른쪽으로 이동. */}
                    <div
                      className={`absolute top-1 bottom-1 bg-gray-200 ${spinePositionClass}`}
                      style={{
                        width: lineWidthPx,
                        ...(accentColorHex ? { backgroundColor: accentColorHex } : {}),
                      }}
                      aria-hidden
                    />
                    {byMonth.get(month)!.map((entry) => (
                      <VerticalRow
                        key={entry.id}
                        entry={entry}
                        renderItem={renderItem}
                        renderPreview={renderPreview}
                        align={align}
                        accentColorHex={accentColorHex}
                        markerSizePx={markerSizePx}
                        cardTheme={cardTheme}
                      />
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

const CARD_THEME_CLASS: Record<"light" | "dark", string> = {
  light: "border border-gray-200 bg-white shadow-xl",
  dark: "border border-gray-800 bg-gray-900 shadow-xl shadow-black/30",
};

function VerticalRow<T extends TimelineEntry>({
  entry,
  renderItem,
  renderPreview,
  align,
  accentColorHex,
  markerSizePx,
  cardTheme,
}: {
  entry: T;
  renderItem: (entry: T) => ReactNode;
  renderPreview?: (entry: T) => ReactNode;
  align: "left" | "center" | "right";
  accentColorHex?: string;
  markerSizePx: number;
  cardTheme: "light" | "dark";
}) {
  const dotPositionClass =
    align === "center" ? "left-1/2 -translate-x-1/2" : align === "right" ? "right-3 translate-x-1/2" : "left-3 -translate-x-1/2";
  const dotStyle: CSSProperties = {
    width: markerSizePx,
    height: markerSizePx,
    ...(accentColorHex ? { borderColor: accentColorHex } : {}),
  };
  // HOTFIX-100: 오른쪽 정렬이면 라벨 왼쪽에 놓일 텍스트 흐름과 자연스럽게
  // 이어지도록 미리보기 카드도 왼쪽으로 열린다.
  const previewPositionClass = align === "right" ? "right-full mr-3" : "left-full ml-3";

  return (
    <div className="group/item relative py-2">
      {/* 아이콘 배지 마커 */}
      <span
        className={`absolute top-1/2 -translate-y-1/2 rounded-full border-2 border-gray-400 bg-white shadow-sm transition-transform group-hover/item:scale-125 group-hover/item:border-gray-700 ${dotPositionClass}`}
        style={dotStyle}
        aria-hidden
      />
      <div className="min-w-0 rounded-md px-2 py-1 transition-colors group-hover/item:bg-gray-50">
        {/* HOTFIX-097 후속: 이 wrapper가 없으면 아래 미리보기 카드의
            "left-full"이 이 행 전체(거의 풀 너비) 기준으로 계산돼 라벨
            텍스트에서 한참 떨어진, 화면 밖일 수도 있는 위치에 떠버린다 —
            라벨 내용 폭에 맞춰 shrink-wrap되는 inline-block으로 감싸
            미리보기가 항상 라벨 바로 옆에 붙도록 한다. */}
        <div className={`relative inline-block max-w-full align-top ${align === "center" ? "block mx-auto" : align === "right" ? "block ml-auto" : ""}`}>
          {renderItem(entry)}
          {renderPreview && (
            <div
              className={`pointer-events-none absolute top-0 z-20 hidden w-72 opacity-0 transition-opacity duration-150 group-hover/item:pointer-events-auto group-hover/item:block group-hover/item:opacity-100 lg:block ${previewPositionClass}`}
            >
              <div className={`overflow-hidden rounded-xl ${CARD_THEME_CLASS[cardTheme]}`}>{renderPreview(entry)}</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function HorizontalTimeline<T extends TimelineEntry>({
  entries,
  renderItem,
  renderPreview,
  accentColorHex,
  lineWidthPx,
  markerSizePx,
  cardTheme,
}: {
  entries: T[];
  renderItem: (entry: T) => ReactNode;
  renderPreview?: (entry: T) => ReactNode;
  accentColorHex?: string;
  lineWidthPx: number;
  markerSizePx: number;
  cardTheme: "light" | "dark";
}) {
  const sorted = [...entries].sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
  );
  const dotStyle: CSSProperties = {
    width: markerSizePx,
    height: markerSizePx,
    ...(accentColorHex ? { borderColor: accentColorHex } : {}),
  };

  return (
    <div className="overflow-x-auto pb-2">
      <div className="relative flex min-w-max items-center gap-14 px-6" style={{ height: 260 }}>
        {/* 중앙 가로선 */}
        <div
          className="absolute left-0 right-0 top-1/2 -translate-y-1/2 bg-gray-200"
          style={{ height: lineWidthPx, ...(accentColorHex ? { backgroundColor: accentColorHex } : {}) }}
          aria-hidden
        />
        {sorted.map((entry, idx) => {
          const above = idx % 2 === 0;
          return (
            <div key={entry.id} className="group/item relative flex w-40 flex-col items-center">
              {above ? (
                <>
                  <div className="mb-3 flex flex-1 flex-col justify-end text-center">{renderItem(entry)}</div>
                  <span
                    className="rounded-full border-2 border-gray-400 bg-white shadow-sm transition-transform group-hover/item:scale-125 group-hover/item:border-gray-700"
                    style={dotStyle}
                  />
                  {renderPreview && (
                    <div className="pointer-events-none absolute bottom-full left-1/2 z-20 mb-3 hidden w-64 -translate-x-1/2 opacity-0 transition-opacity duration-150 group-hover/item:pointer-events-auto group-hover/item:block group-hover/item:opacity-100">
                      <div className={`overflow-hidden rounded-xl ${CARD_THEME_CLASS[cardTheme]}`}>{renderPreview(entry)}</div>
                    </div>
                  )}
                </>
              ) : (
                <>
                  <span
                    className="rounded-full border-2 border-gray-400 bg-white shadow-sm transition-transform group-hover/item:scale-125 group-hover/item:border-gray-700"
                    style={dotStyle}
                  />
                  <div className="mt-3 flex flex-1 flex-col text-center">{renderItem(entry)}</div>
                  {renderPreview && (
                    <div className="pointer-events-none absolute top-full left-1/2 z-20 mt-3 hidden w-64 -translate-x-1/2 opacity-0 transition-opacity duration-150 group-hover/item:pointer-events-auto group-hover/item:block group-hover/item:opacity-100">
                      <div className={`overflow-hidden rounded-xl ${CARD_THEME_CLASS[cardTheme]}`}>{renderPreview(entry)}</div>
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
