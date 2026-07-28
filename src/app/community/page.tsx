"use client";

import { useEffect, useState } from "react";
import { useHubBoardId } from "@/lib/useHubBoardId";
import { PageTemplate } from "@/components/PageTemplate";
import { PageBuilderRenderer } from "@/components/PageBuilderRenderer";
import { PageEditButton } from "@/components/admin/PageEditButton";
import { fetchPublishedPageBySlug, type PageModuleRow } from "@/lib/pageBuilder";

// EPIC-054F: 지금까지 /community는 club/[name] 동적 라우트만 있고
// /community 자체(허브 인덱스)는 없어 404였다 — Board Definition System의
// "community" hub(src/lib/boardLayout.ts)에 연결되는 실제 Page를 신설.
//
// EPIC-060: Page Builder(page_builder/page_modules, "community" slug)에
// 공개(published) 모듈 구성이 있으면 그걸 우선 렌더링하고, 없으면(테이블
// 미생성 포함) 기존 PageTemplate 렌더링으로 그대로 fallback한다 — 관리자가
// /admin/pages에서 "공개"로 전환하기 전까지는 화면이 지금과 완전히 동일하다.
export default function CommunityPage() {
  const { boardId, loading } = useHubBoardId("community");
  const [cmsModules, setCmsModules] = useState<PageModuleRow[] | null>(null);
  const [cmsChecked, setCmsChecked] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetchPublishedPageBySlug("community").then((result) => {
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
        <PageEditButton slug="community" />
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
      <PageEditButton slug="community" />
      <PageTemplate
        title="Community"
        subtitle="살롱데상"
        breadcrumb={[
          { label: "홈", href: "/" },
          { label: "살롱데상" },
          { label: "Community" },
        ]}
        description="Salon des Cent Community 메인 허브 — 출석체크, 자유게시판, 주제별 소통, 요일별 클럽, 월별 모임 등 하위 게시판의 최신글/인기글을 모아봅니다."
        boardId={boardId}
      />
    </>
  );
}
