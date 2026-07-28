"use client";

import { useEffect, useState } from "react";
import { useHubBoardId } from "@/lib/useHubBoardId";
import { PageTemplate } from "@/components/PageTemplate";
import { PageBuilderRenderer } from "@/components/PageBuilderRenderer";
import { PageEditButton } from "@/components/admin/PageEditButton";
import { fetchPublishedPageBySlug, type PageModuleRow } from "@/lib/pageBuilder";

// EPIC-054F: 지금까지 /heritage는 grandma/grandpa 동적 라우트만 있고
// /heritage 자체(허브 인덱스)는 없어 404였다 — Board Definition System의
// "heritage" hub(src/lib/boardLayout.ts)에 연결되는 실제 Page를 신설.
//
// EPIC-060: Page Builder("heritage" slug)에 공개 모듈 구성이 있으면 그걸
// 우선 렌더링하고, 없으면 기존 PageTemplate로 fallback한다.
export default function HeritagePage() {
  const { boardId, loading } = useHubBoardId("heritage");
  const [cmsModules, setCmsModules] = useState<PageModuleRow[] | null>(null);
  const [cmsChecked, setCmsChecked] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetchPublishedPageBySlug("heritage").then((result) => {
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
        <PageEditButton slug="heritage" />
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
      <PageEditButton slug="heritage" />
      <PageTemplate
        title="Heritage"
        subtitle="사일로상점"
        breadcrumb={[
          { label: "홈", href: "/" },
          { label: "사일로상점" },
          { label: "Heritage" },
        ]}
        description="Grandmas/Grandpas 게시판의 최신글/인기글을 모아보는 사일로 Heritage 메인 허브입니다."
        boardId={boardId}
      />
    </>
  );
}
