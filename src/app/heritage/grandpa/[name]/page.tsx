"use client";

import { useParams } from "next/navigation";
import { useHubBoardId } from "@/lib/useHubBoardId";
import { PageTemplate } from "@/components/PageTemplate";
import { PageEditButton } from "@/components/admin/PageEditButton";

// EPIC-055: 기존 UniversalBoard(EPIC-044, 실데이터 없는 뼈대 stub)를
// 걷어내고 Universal Board System(BoardModule, PageTemplate)에 실제로
// 연결한다. 할아버지 개개인 전용 게시판은 따로 없어(새 DB 금지) 전체
// 할아버지가 공유하는 "grandpas" 스토리 게시판(src/lib/boardLayout.ts)에
// 연결하고, 이름은 페이지 제목으로만 사용한다.
export default function GrandpaHeritagePage() {
  const { name } = useParams<{ name: string }>();
  const displayName = decodeURIComponent(name);
  const { boardId, loading } = useHubBoardId("grandpas");

  if (loading) {
    return <main className="flex-1 p-8 bg-white">불러오는 중...</main>;
  }

  return (
    <>
      <PageEditButton slug="heritage-grandpa-name" />
      <PageTemplate
        title={`${displayName} 할아버지 이야기`}
        subtitle="사일로 Heritage · Grandpas"
        breadcrumb={[
          { label: "홈", href: "/" },
          { label: "사일로상점" },
          { label: "Heritage", href: "/heritage" },
          { label: displayName },
        ]}
        description="할아버지들의 이야기를 나누는 스토리 게시판입니다. 검색창에 이름을 입력하면 특정 할아버지의 이야기만 찾아볼 수 있어요."
        boardId={boardId}
      />
    </>
  );
}
