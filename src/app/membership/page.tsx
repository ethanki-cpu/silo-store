"use client";

import { useHubBoardId } from "@/lib/useHubBoardId";
import { PageTemplate } from "@/components/PageTemplate";

// EPIC-054F: /membership은 어떤 Route도 없어 404였다 — Board Definition
// System의 "membership" hub(src/lib/boardLayout.ts)에 연결되는 실제 Page를
// 신설.
export default function MembershipPage() {
  const { boardId, loading } = useHubBoardId("membership");

  if (loading) {
    return <main className="flex-1 p-8 bg-white">불러오는 중...</main>;
  }

  return (
    <PageTemplate
      title="Membership"
      subtitle="살롱데상"
      breadcrumb={[
        { label: "홈", href: "/" },
        { label: "살롱데상" },
        { label: "Membership" },
      ]}
      description="Membership 메인 허브 — 하위 게시판(패트론 게시판, 나의 보물 이야기, 마음일기 등)의 최신글/인기글/추천글을 모아봅니다."
      boardId={boardId}
    />
  );
}
