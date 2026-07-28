"use client";

import { useHubBoardId } from "@/lib/useHubBoardId";
import { PageTemplate } from "@/components/PageTemplate";

// EPIC-054F: /gallery는 어떤 Route도 없어 404였다 — Board Definition
// System의 "gallery" hub(src/lib/boardLayout.ts)에 연결되는 실제 Page를
// 신설. (참고: /salon/gallery/* 5개는 EPIC-054A에서 만든 별개의 정적
// 안내 페이지로, 이 hub와는 URL이 겹치지 않는다 — NEXT_TASK.md에 통합
// 필요성이 이미 기록돼 있음.)
export default function GalleryPage() {
  const { boardId, loading } = useHubBoardId("gallery");

  if (loading) {
    return <main className="flex-1 p-8 bg-white">불러오는 중...</main>;
  }

  return (
    <PageTemplate
      title="Gallery"
      subtitle="살롱데상"
      breadcrumb={[
        { label: "홈", href: "/" },
        { label: "살롱데상" },
        { label: "Gallery" },
      ]}
      description="Gallery 메인 허브 — 시상식, 공연들, 파티, 운명의 방문자들, 패트론들 게시판의 최신글/인기글/추천글을 모아봅니다."
      boardId={boardId}
    />
  );
}
