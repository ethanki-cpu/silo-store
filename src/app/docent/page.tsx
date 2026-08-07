"use client";

import { useEffect, useState } from "react";
import { PageBuilderRenderer } from "@/components/PageBuilderRenderer";
import { PageEditButton } from "@/components/admin/PageEditButton";
import { fetchPublishedPageBySlug, type PageModuleRow } from "@/lib/pageBuilder";
import { usePageRankGate } from "@/lib/pageRankGate";

// EPIC-061: 사용자 명시 지시로 /docent도 Page Builder만 사용하도록 전환한다
// (slug="docent"). 이전까지 이 페이지는 docent_contents 테이블을 직접
// 조회해 카테고리(실로상점/살롱데상) 전환, 인물별 보기, 무료/가격 표시까지
// 보여주는 실제 콘텐츠 목록이었다 — 이번 전환으로 그 기능은 사라지고
// Hero + 11개 시대 링크(Application 모듈, /docent/{era})로 대체된다.
// docent_contents 조회 코드 자체(및 /docent/[id] 상세 페이지)는 삭제하지
// 않았으니 필요하면 이 파일만 되돌리면 복원 가능하다.
export default function DocentListPage() {
  const [modules, setModules] = useState<PageModuleRow[] | null>(null);
  const [minRankToRead, setMinRankToRead] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  usePageRankGate(minRankToRead);

  useEffect(() => {
    let cancelled = false;
    fetchPublishedPageBySlug("docent").then((result) => {
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
      <PageEditButton slug="docent" />
      <main className="flex-1 bg-white px-6 py-12">
        <div className="max-w-3xl mx-auto w-full">
          <PageBuilderRenderer modules={modules ?? []} />
        </div>
      </main>
    </>
  );
}
