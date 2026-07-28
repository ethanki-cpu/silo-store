"use client";

import { useEffect, useState } from "react";
import { PageBuilderRenderer } from "@/components/PageBuilderRenderer";
import { PageEditButton } from "@/components/admin/PageEditButton";
import { fetchPublishedPageBySlug, type PageModuleRow } from "@/lib/pageBuilder";

// EPIC-061: Heritage는 이제 Page Builder(page_builder/page_modules,
// slug="heritage")로만 렌더링한다 — EPIC-054F의 PageTemplate/useHubBoardId
// fallback은 제거됐다(관리자가 SQL을 실행해 published 모듈이 항상 존재함).
export default function HeritagePage() {
  const [modules, setModules] = useState<PageModuleRow[] | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    fetchPublishedPageBySlug("heritage").then((result) => {
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
      <PageEditButton slug="heritage" />
      <main className="flex-1 bg-white px-6 py-12">
        <div className="max-w-3xl mx-auto w-full">
          <PageBuilderRenderer modules={modules ?? []} />
        </div>
      </main>
    </>
  );
}
