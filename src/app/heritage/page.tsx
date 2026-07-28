"use client";

import { useHubBoardId } from "@/lib/useHubBoardId";
import { PageTemplate } from "@/components/PageTemplate";

// EPIC-054F: 지금까지 /heritage는 grandma/grandpa 동적 라우트만 있고
// /heritage 자체(허브 인덱스)는 없어 404였다 — Board Definition System의
// "heritage" hub(src/lib/boardLayout.ts)에 연결되는 실제 Page를 신설.
export default function HeritagePage() {
  const { boardId, loading } = useHubBoardId("heritage");

  if (loading) {
    return <main className="flex-1 p-8 bg-white">불러오는 중...</main>;
  }

  return (
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
  );
}
