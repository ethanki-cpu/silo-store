"use client";

import { useEffect, useState } from "react";
import { PageBuilderRenderer } from "@/components/PageBuilderRenderer";
import { PageEditButton } from "@/components/admin/PageEditButton";
import { fetchPublishedPageBySlug, type PageModuleRow } from "@/lib/pageBuilder";

// EPIC-062: Page Architecture — Navigation은 Board가 아니라 이 독립 Page로
// 연결된다. page_builder(slug="community-weekday-between-lines")의 published 모듈만 렌더링한다.
export default function CommunityWeekdayBetweenLinesPage() {
  const [modules, setModules] = useState<PageModuleRow[] | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    fetchPublishedPageBySlug("community-weekday-between-lines").then((result) => {
      if (cancelled) return;
      setModules(result?.modules ?? []);
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
      <PageEditButton slug="community-weekday-between-lines" />
      <main className="flex-1 bg-white px-6 py-12">
        <div className="max-w-3xl mx-auto w-full">
          <PageBuilderRenderer modules={modules ?? []} />
        </div>
      </main>
    </>
  );
}
