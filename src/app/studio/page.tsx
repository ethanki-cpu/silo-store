"use client";

import { useHubBoardId } from "@/lib/useHubBoardId";
import { PageTemplate } from "@/components/PageTemplate";

// EPIC-054F: /studio는 어떤 Route도 없어 404였다 — Board Definition
// System의 "studio" hub(src/lib/boardLayout.ts)에 연결되는 실제 Page를 신설.
export default function StudioPage() {
  const { boardId, loading } = useHubBoardId("studio");

  if (loading) {
    return <main className="flex-1 p-8 bg-white">불러오는 중...</main>;
  }

  return (
    <PageTemplate
      title="Studio"
      subtitle="스튜디오"
      breadcrumb={[
        { label: "홈", href: "/" },
        { label: "스튜디오" },
        { label: "Studio" },
      ]}
      description="Studio 메인 허브 — 공간 대관(1F/2F), 물품 대여, 공간 스타일링 4개 서비스의 최신 포트폴리오/대표 이미지/추천 콘텐츠를 모아봅니다."
      boardId={boardId}
    />
  );
}
