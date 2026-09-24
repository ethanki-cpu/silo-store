"use client";

import { useEffect, useState } from "react";
import { PageBuilderRenderer } from "@/components/PageBuilderRenderer";
import { PageEditButton } from "@/components/admin/PageEditButton";
import { fetchPublishedPageBySlug, type PageModuleRow } from "@/lib/pageBuilder";
import { usePageRankGate } from "@/lib/pageRankGate";
import { MembershipPlansSection } from "@/components/payments/MembershipPlansSection";
import { MembershipCarousel } from "@/components/membership/MembershipCarousel";

// EPIC-061: Membership은 이제 Page Builder(page_builder/page_modules,
// slug="membership")로만 렌더링한다 — EPIC-054F의 PageTemplate/useHubBoardId
// fallback은 제거됐다(관리자가 SQL을 실행해 published 모듈이 항상 존재함).
export default function MembershipPage() {
  const [modules, setModules] = useState<PageModuleRow[] | null>(null);
  const [minRankToRead, setMinRankToRead] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  usePageRankGate(minRankToRead);

  useEffect(() => {
    let cancelled = false;
    fetchPublishedPageBySlug("membership").then((result) => {
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
      <PageEditButton slug="membership" />
      <main className="flex-1 bg-white px-6 py-12">
        <div className="max-w-3xl mx-auto w-full">
          {/* HOTFIX-162.7: 캐러셀/가입 카드도 이제 위젯이라 "페이지 수정"에서 순서·숨김·추가를
              자유롭게 바꾼다. 위젯이 하나도 없으면(시드 전) 예전 기본 구성으로 보여준다. */}
          {(modules ?? []).length > 0 ? (
            <PageBuilderRenderer modules={modules ?? []} />
          ) : (
            <>
              <MembershipCarousel />
              <MembershipPlansSection showPlanCards={false} />
            </>
          )}
        </div>
      </main>
    </>
  );
}
