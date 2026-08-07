"use client";

import { useEffect, useState } from "react";
import { PageBuilderRenderer } from "@/components/PageBuilderRenderer";
import { PageEditButton } from "@/components/admin/PageEditButton";
import { fetchPublishedPageBySlug, type PageModuleRow } from "@/lib/pageBuilder";
import { usePageRankGate } from "@/lib/pageRankGate";

// EPIC-060/EPIC-061: MyPage 인덱스는 원래 MYPAGE_TABS를 아이콘 그리드로
// 직접 그렸다. 사용자 명시 지시로 이제 Page Builder만 사용한다
// (slug="mypage") — 12개 탭 중 7개(Collection/Wishlist/Timeline/Visitor/
// Badge/Comment/BucketList)가 Hero + Application 링크 모듈로 대체됐다.
// 레이아웃(등급/포인트 요약, MyPageNav, 로그인 게이트)은 src/app/mypage/
// layout.tsx가 그대로 유지하므로 이 페이지는 본문 콘텐츠만 담당한다.
export default function MyPageHomePage() {
  const [modules, setModules] = useState<PageModuleRow[] | null>(null);
  const [minRankToRead, setMinRankToRead] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  usePageRankGate(minRankToRead);

  useEffect(() => {
    let cancelled = false;
    fetchPublishedPageBySlug("mypage").then((result) => {
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
    return <p className="text-gray-400 text-sm">불러오는 중...</p>;
  }

  return (
    <div>
      <PageEditButton slug="mypage" />
      <PageBuilderRenderer modules={modules ?? []} />
    </div>
  );
}
