"use client";

import { useParams } from "next/navigation";
import { useBoardIdByName } from "@/lib/useHubBoardId";
import { PageTemplate } from "@/components/PageTemplate";
import { PageEditButton } from "@/components/admin/PageEditButton";

// EPIC-055: 기존 UniversalBoard(EPIC-044, 실데이터 없는 뼈대 stub)를
// 걷어내고 Universal Board System(BoardModule, PageTemplate)에 실제로
// 연결한다. 주제별 소통 게시판(경제/예술/...)·요일별 클럽모임은 EPIC-049
// 때 이미 각자 실제 board 행(name=클럽 이름)으로 존재하므로, 이름으로
// 정확히 매칭되는 그 board에 그대로 연결한다(새 게시판 생성 없음).
export default function ClubCommunityPage() {
  const { name } = useParams<{ name: string }>();
  const displayName = decodeURIComponent(name);
  const { boardId, loading } = useBoardIdByName(displayName);

  if (loading) {
    return <main className="flex-1 p-8 bg-white">불러오는 중...</main>;
  }

  return (
    <>
      <PageEditButton slug="community-club-name" />
      <PageTemplate
        title={displayName}
        subtitle="살롱데상 · Community"
        breadcrumb={[
          { label: "홈", href: "/" },
          { label: "살롱데상" },
          { label: "Community", href: "/community" },
          { label: displayName },
        ]}
        description={`${displayName} 게시판입니다.`}
        boardId={boardId}
      />
    </>
  );
}
