"use client";

import { useEffect, useState } from "react";
import { PageBuilderRenderer } from "@/components/PageBuilderRenderer";
import { PageEditButton } from "@/components/admin/PageEditButton";
import { fetchPublishedPageBySlug, type PageModuleRow } from "@/lib/pageBuilder";
import { usePageRankGate } from "@/lib/pageRankGate";
import { CraftStudioRenderer } from "@/components/craft/studio/CraftStudioRenderer";

// EPIC-056/EPIC-060: Studio는 원래 Hero+Application+Calendar+Board를 손으로
// 조립한 페이지였다.
// EPIC-061: 이제 Page Builder(page_builder/page_modules, slug="studio")로만
// 렌더링한다 — 하드코딩 조합 fallback은 제거됐다(관리자가 SQL을 실행해
// published 모듈이 항상 존재함).
// EPIC-099(항목 3, Phase 2): /studio는 catch-all(src/app/[...slug]/page.tsx)이
// 아니라 이 정적 라우트 파일이 담당한다 — 홈페이지(src/app/page.tsx)와 같은
// 이유로 builder_type/craft_state를 이 파일에서 직접 분기해야 한다(catch-all
// 쪽 CRAFT_RENDERERS 등록만으로는 이 페이지엔 적용되지 않음).
export default function StudioPage() {
  const [modules, setModules] = useState<PageModuleRow[] | null>(null);
  const [minRankToRead, setMinRankToRead] = useState<number | null>(null);
  const [builderType, setBuilderType] = useState<"native" | "craft">("native");
  const [craftState, setCraftState] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  usePageRankGate(minRankToRead);

  useEffect(() => {
    let cancelled = false;
    fetchPublishedPageBySlug("studio").then((result) => {
      if (cancelled) return;
      setModules(result?.modules ?? []);
      setMinRankToRead(result?.page.min_rank_to_read ?? null);
      setBuilderType(result?.page.builder_type ?? "native");
      setCraftState(result?.page.craft_state ?? null);
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  if (loading) {
    return <main className="flex-1 p-8 bg-white">불러오는 중...</main>;
  }

  if (builderType === "craft") {
    return (
      <>
        <PageEditButton slug="studio" />
        <CraftStudioRenderer craftState={craftState} />
      </>
    );
  }

  return (
    <>
      <PageEditButton slug="studio" />
      <main className="flex-1 bg-white px-6 py-12">
        <div className="max-w-3xl mx-auto w-full">
          <PageBuilderRenderer modules={modules ?? []} />
        </div>
      </main>
    </>
  );
}
