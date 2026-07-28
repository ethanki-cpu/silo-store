"use client";

import { useEffect, useState } from "react";
import { useHubBoardId } from "@/lib/useHubBoardId";
import { PageTemplate } from "@/components/PageTemplate";
import { PageBuilderRenderer } from "@/components/PageBuilderRenderer";
import { PageEditButton } from "@/components/admin/PageEditButton";
import { fetchPublishedPageBySlug, type PageModuleRow } from "@/lib/pageBuilder";

// EPIC-054F: /archive는 어떤 Route도 없어 404였다 — Board Definition
// System의 "archive" hub(src/lib/boardLayout.ts)에 연결되는 실제 Page를
// 신설.
//
// EPIC-060: Page Builder("archive" slug)에 공개 모듈 구성이 있으면 그걸
// 우선 렌더링하고, 없으면 기존 PageTemplate로 fallback한다.
export default function ArchivePage() {
  const { boardId, loading } = useHubBoardId("archive");
  const [cmsModules, setCmsModules] = useState<PageModuleRow[] | null>(null);
  const [cmsChecked, setCmsChecked] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetchPublishedPageBySlug("archive").then((result) => {
      if (cancelled) return;
      setCmsModules(result?.modules ?? null);
      setCmsChecked(true);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  if (!cmsChecked || loading) {
    return <main className="flex-1 p-8 bg-white">불러오는 중...</main>;
  }

  if (cmsModules && cmsModules.length > 0) {
    return (
      <>
        <PageEditButton slug="archive" />
        <main className="flex-1 bg-white px-6 py-12">
          <div className="max-w-3xl mx-auto w-full">
            <PageBuilderRenderer modules={cmsModules} />
          </div>
        </main>
      </>
    );
  }

  return (
    <>
      <PageEditButton slug="archive" />
      <PageTemplate
        title="Archive"
        subtitle="살롱데상"
        breadcrumb={[
          { label: "홈", href: "/" },
          { label: "살롱데상" },
          { label: "Archive" },
        ]}
        description="Archive 메인 허브 — 자료게시판/타임라인 등 하위 게시판의 최신글/인기글/추천글을 모아봅니다."
        boardId={boardId}
      />
    </>
  );
}
