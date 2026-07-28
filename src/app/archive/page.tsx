"use client";

import { useHubBoardId } from "@/lib/useHubBoardId";
import { PageTemplate } from "@/components/PageTemplate";

// EPIC-054F: /archive는 어떤 Route도 없어 404였다 — Board Definition
// System의 "archive" hub(src/lib/boardLayout.ts)에 연결되는 실제 Page를
// 신설.
export default function ArchivePage() {
  const { boardId, loading } = useHubBoardId("archive");

  if (loading) {
    return <main className="flex-1 p-8 bg-white">불러오는 중...</main>;
  }

  return (
    <PageTemplate
      title="Archive"
      subtitle="살롱데상"
      breadcrumb={[
        { label: "홈", href: "/" },
        { label: "살롱데상" },
        { label: "Archive" },
      ]}
      description="Archive 메인 허브 — 자료게시판/타임라인 등 하위 게시판의 최신글/인기글/추천글을 모아봅니다."
      boardId={boardId}
    />
  );
}
