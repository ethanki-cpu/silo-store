"use client";

import { useHubBoardId } from "@/lib/useHubBoardId";
import { PageTemplate } from "@/components/PageTemplate";

// EPIC-054F: 지금까지 /community는 club/[name] 동적 라우트만 있고
// /community 자체(허브 인덱스)는 없어 404였다 — Board Definition System의
// "community" hub(src/lib/boardLayout.ts)에 연결되는 실제 Page를 신설.
export default function CommunityPage() {
  const { boardId, loading } = useHubBoardId("community");

  if (loading) {
    return <main className="flex-1 p-8 bg-white">불러오는 중...</main>;
  }

  return (
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
  );
}
