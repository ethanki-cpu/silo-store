"use client";

import { useEffect, useState } from "react";
import { useHubBoardId } from "@/lib/useHubBoardId";
import { HeroModule } from "@/components/modules/HeroModule";
import { ApplicationModule } from "@/components/modules/ApplicationModule";
import { CalendarGrid } from "@/components/modules/CalendarGrid";
import { BoardModule } from "@/components/modules/BoardModule";
import { EmptyState } from "@/components/modules/EmptyState";
import { PageBuilderRenderer } from "@/components/PageBuilderRenderer";
import { PageEditButton } from "@/components/admin/PageEditButton";
import { fetchPublishedPageBySlug, type PageModuleRow } from "@/lib/pageBuilder";

// EPIC-056: Studio 페이지는 지시된 조합(Hero + Application Module +
// Calendar Module + Gallery/Story Thumbnail)을 그대로 조립한다 — 다른
// 카테고리 허브 페이지처럼 PageTemplate(Hero+Board Container만)을 쓰지
// 않고, 이 페이지만의 모듈 순서를 직접 나열한다(그래도 각 모듈 자체는
// 전부 기존 것을 재사용, 새 컴포넌트 없음). Calendar Module은 현재 달을
// 보여주는 것까지만 — 실제 예약 일정 연동은 새 기능이라 이번 EPIC 범위 밖.
//
// EPIC-060: Page Builder("studio" slug)에 공개 모듈 구성이 있으면 그걸
// 우선 렌더링하고, 없으면 기존 하드코딩 모듈 조합으로 fallback한다 —
// 이 페이지가 사실상 "손으로 조립한 Page Builder 인스턴스"였던 것을 DB
// 기반으로 옮기는 첫 사례.
const now = new Date();

export default function StudioPage() {
  const { boardId, loading } = useHubBoardId("studio");
  const [cmsModules, setCmsModules] = useState<PageModuleRow[] | null>(null);
  const [cmsChecked, setCmsChecked] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetchPublishedPageBySlug("studio").then((result) => {
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
        <PageEditButton slug="studio" />
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
      <PageEditButton slug="studio" />
      <main className="flex-1 bg-white px-6 py-12">
        <div className="max-w-3xl mx-auto w-full space-y-10">
          <HeroModule
            title="Studio"
            subtitle="스튜디오"
            breadcrumb={[
              { label: "홈", href: "/" },
              { label: "스튜디오" },
              { label: "Studio" },
            ]}
            description="Studio 메인 허브 — 공간 대관(1F/2F), 물품 대여, 공간 스타일링 4개 서비스의 최신 포트폴리오/대표 이미지/추천 콘텐츠를 모아봅니다."
          />

          <ApplicationModule
            actions={[
              { label: "공간 촬영 대관 신청", href: "/rental" },
              { label: "물품 대여 신청", href: "/space-inquiry/item-rental" },
              { label: "공간 스타일링 문의", href: "/space-inquiry/styling" },
            ]}
          />

          <div>
            <h2 className="text-xs uppercase tracking-wide text-gray-400 mb-3">
              이번 달 대관 캘린더
            </h2>
            <CalendarGrid year={now.getFullYear()} month={now.getMonth() + 1} />
          </div>

          {boardId ? (
            <BoardModule boardId={boardId} showHero={false} />
          ) : (
            <EmptyState
              title="게시글이 없습니다."
              description="아직 이 카테고리에 연결된 게시판이 없어요."
            />
          )}
        </div>
      </main>
    </>
  );
}
