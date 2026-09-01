"use client";

// EPIC-155: EditorialCalendar 컴포넌트 시연 페이지 — 로그인/실 데이터 없이도
// 더미 데이터로 바로 확인할 수 있게 분리했다. 실제 출석체크(/attendance)
// 페이지에 붙이는 건 이 컴포넌트가 승인된 다음 단계.
import { useMemo, useState } from "react";
import { EditorialCalendar } from "@/components/attendance/EditorialCalendar";
import { buildDummyEntries } from "@/components/attendance/editorialCalendarTypes";

export default function EditorialCalendarPreviewPage() {
  const now = new Date();
  const [year] = useState(now.getFullYear());
  const [month] = useState(7); // 8월(0-based) — 참고 이미지와 동일한 달로 시연

  const entries = useMemo(() => buildDummyEntries(year, month), [year, month]);

  return (
    <main className="min-h-screen bg-neutral-100 py-10">
      <div className="mx-auto mb-6 max-w-6xl px-4">
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-neutral-400">
          EPIC-155 · 컴포넌트 시연(더미 데이터)
        </p>
        <h1 className="text-2xl font-bold">에디토리얼 출석체크 캘린더</h1>
        <p className="mt-1 text-sm text-neutral-500">
          날짜를 클릭하면 오른쪽 여백에 카드가 나타나고, 클릭한 칸과 카드를 잇는 선이 그려집니다.
        </p>
      </div>
      <EditorialCalendar entries={entries} initialYear={year} initialMonth={month} />
    </main>
  );
}
