"use client";

// EPIC-097: Page Builder "Timeline" 위젯 전용 프리뷰/렌더러 — 게시판 글이
// 아니라 운영자가 TimelineWidgetEditor에서 직접 입력한 항목 목록
// (TimelineItemSettings[])을 그린다. TimelineView.tsx(연/월로 묶어 그리는
// 게시판 타임라인, EPIC-050/052/096)와는 별개 컴포넌트다 — 이쪽은 애초에
// "그룹"이라는 개념이 없는 평평한 목록이라, 스파인이 그룹 경계에서 끊길
// 여지 자체가 없다(HOTFIX-097이 board 타임라인 쪽에서 고친 문제의 근본
// 원인이 여기서는 발생하지 않는 구조).
//
// 관리자 편집기의 실시간 미리보기(TimelineWidgetEditor)와 공개 페이지
// 렌더링(PageBuilderRenderer의 TimelineFromSettings) 양쪽이 이 컴포넌트
// 하나를 공유한다 — 미리보기와 실제 화면이 다르게 보일 여지를 없앤다.
// 모바일(md 미만)과 데스크톱(md 이상)은 완전히 분리된 두 트리로 렌더링한다
// (TimelineView.tsx의 HOTFIX-097과 동일한 이유 — 하나의 행 컴포넌트에
// order/hidden 클래스로 두 레이아웃을 욱여넣으면 중복 렌더링/숨김 처리가
// 쉽게 어긋난다).

import type { ReactNode } from "react";
import type { TimelineItemSettings } from "@/lib/widgetSchema";
import { sanitizeHtml } from "@/lib/sanitize";

export function AlternatingTimelineCanvas({
  items,
  emptyMessage = "아직 타임라인 항목이 없어요.",
}: {
  items: TimelineItemSettings[];
  emptyMessage?: string;
}) {
  if (items.length === 0) {
    return <p className="py-12 text-center text-sm text-gray-400">{emptyMessage}</p>;
  }

  return (
    <>
      {/* 모바일: 왼쪽 고정 스파인 + 한 줄 목록 */}
      <div className="relative space-y-8 pl-10 md:hidden">
        <div className="absolute top-1 bottom-1 left-4 w-0.5 bg-gray-200" aria-hidden />
        {items.map((item) => (
          <div key={item.id} className="relative">
            <span
              className="absolute top-1.5 -left-[1.55rem] h-3.5 w-3.5 rounded-full border-2 border-gray-400 bg-white shadow-sm"
              aria-hidden
            />
            <TimelineCard item={item} />
          </div>
        ))}
      </div>

      {/* 데스크톱: 중앙 스파인 + 좌우 교차형 카드 */}
      <div className="relative hidden md:block">
        <div className="absolute top-0 bottom-0 left-1/2 w-0.5 -translate-x-1/2 bg-gray-200" aria-hidden />
        <div className="space-y-10">
          {items.map((item, idx) => {
            const isLeft = idx % 2 === 0;
            return (
              <div key={item.id} className="relative grid grid-cols-[1fr_2.5rem_1fr] items-center">
                <div className={isLeft ? "flex justify-end pr-8" : ""}>
                  {isLeft && <TimelineCard item={item} align="right" />}
                </div>
                <div className="flex justify-center">
                  <span
                    className="z-10 h-3.5 w-3.5 rounded-full border-2 border-gray-400 bg-white shadow-sm"
                    aria-hidden
                  />
                </div>
                <div className={!isLeft ? "flex justify-start pl-8" : ""}>
                  {!isLeft && <TimelineCard item={item} align="left" />}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </>
  );
}

function TimelineCard({ item, align = "left" }: { item: TimelineItemSettings; align?: "left" | "right" }) {
  const hasCard = Boolean(item.imageUrl || item.cardTitle || item.descriptionHtml || item.linkUrl);

  const cardBody: ReactNode = hasCard ? (
    <a
      href={item.linkUrl || undefined}
      target={item.linkTarget ?? "_self"}
      rel={item.linkTarget === "_blank" ? "noreferrer" : undefined}
      className={`block overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-lg transition-transform ${
        item.linkUrl ? "hover:-translate-y-1 hover:shadow-xl" : ""
      }`}
    >
      {item.imageUrl && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={item.imageUrl} alt={item.cardTitle || item.title} className="h-40 w-full object-cover" />
      )}
      <div className="space-y-1.5 p-4">
        {item.cardTitle && <p className="font-semibold text-gray-900">{item.cardTitle}</p>}
        {item.descriptionHtml && (
          <div
            className="prose prose-sm max-w-none text-gray-600"
            dangerouslySetInnerHTML={{ __html: sanitizeHtml(item.descriptionHtml) }}
          />
        )}
        {item.linkUrl && item.linkText && (
          <span className="inline-block pt-1 text-sm font-medium text-blue-600">{item.linkText} →</span>
        )}
      </div>
    </a>
  ) : null;

  return (
    <div className={`w-full max-w-sm space-y-2 ${align === "right" ? "text-right" : ""}`}>
      <p
        className="text-lg font-serif font-bold text-gray-900"
        style={item.titleColorHex ? { color: item.titleColorHex } : undefined}
      >
        {item.title || "제목 없음"}
      </p>
      {item.subtitle && <p className="text-xs text-gray-400">{item.subtitle}</p>}
      {cardBody}
    </div>
  );
}
