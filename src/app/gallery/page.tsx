"use client";

import { useEffect, useState } from "react";
import { useHubBoardId } from "@/lib/useHubBoardId";
import { PageTemplate } from "@/components/PageTemplate";
import { PageBuilderRenderer } from "@/components/PageBuilderRenderer";
import { PageEditButton } from "@/components/admin/PageEditButton";
import { fetchPublishedPageBySlug, type PageModuleRow } from "@/lib/pageBuilder";

// EPIC-054F: /gallery는 어떤 Route도 없어 404였다 — Board Definition
// System의 "gallery" hub(src/lib/boardLayout.ts)에 연결되는 실제 Page를
// 신설. (참고: /salon/gallery/* 5개는 EPIC-054A에서 만든 별개의 정적
// 안내 페이지로, 이 hub와는 URL이 겹치지 않는다 — NEXT_TASK.md에 통합
// 필요성이 이미 기록돼 있음.)
//
// EPIC-060: Page Builder("gallery" slug)에 공개 모듈 구성이 있으면 그걸
// 우선 렌더링하고, 없으면 기존 PageTemplate로 fallback한다.
export default function GalleryPage() {
  const { boardId, loading } = useHubBoardId("gallery");
  const [cmsModules, setCmsModules] = useState<PageModuleRow[] | null>(null);
  const [cmsChecked, setCmsChecked] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetchPublishedPageBySlug("gallery").then((result) => {
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
        <PageEditButton slug="gallery" />
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
      <PageEditButton slug="gallery" />
      <PageTemplate
        title="Gallery"
        subtitle="살롱데상"
        breadcrumb={[
          { label: "홈", href: "/" },
          { label: "살롱데상" },
          { label: "Gallery" },
        ]}
        description="Gallery 메인 허브 — 시상식, 공연들, 파티, 운명의 방문자들, 패트론들 게시판의 최신글/인기글/추천글을 모아봅니다."
        boardId={boardId}
      />
    </>
  );
}
