"use client";

import { useEffect, useState } from "react";
import { PageBuilderRenderer } from "@/components/PageBuilderRenderer";
import { PageEditButton } from "@/components/admin/PageEditButton";
import { fetchPublishedPageBySlug, type PageModuleRow } from "@/lib/pageBuilder";
import { usePageRankGate } from "@/lib/pageRankGate";

// EPIC-066: EPIC-064A가 이 페이지에 PageEditButton만 붙이고 실제 렌더링은
// 여전히 고정 PageHeader 텍스트("현재 준비 중입니다")였다 — page_builder에
// slug="event-notices" 행과 위젯이 이미 있어도 화면에는 절대 반영될 수
// 없는 구조였다(Board Widget이 실제로 출력되지 못하는 대표 사례로 발견).
// community/events 등 이미 정상 동작하는 형제 페이지와 동일한 패턴으로
// 맞춘다.
export default function EventNoticesPage() {
  const [modules, setModules] = useState<PageModuleRow[] | null>(null);
  const [minRankToRead, setMinRankToRead] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  usePageRankGate(minRankToRead);

  useEffect(() => {
    let cancelled = false;
    fetchPublishedPageBySlug("event-notices").then((result) => {
      if (cancelled) return;
      setModules(result?.modules ?? []);
      setMinRankToRead(result?.page.min_rank_to_read ?? null);
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  if (loading) {
    return <main className="flex-1 p-8 bg-white">불러오는 중...</main>;
  }

  return (
    <>
      <PageEditButton slug="event-notices" />
      <main className="flex-1 bg-white px-6 py-12">
        <div className="max-w-3xl mx-auto w-full">
          <PageBuilderRenderer modules={modules ?? []} />
        </div>
      </main>
    </>
  );
}
