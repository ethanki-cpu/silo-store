"use client";

import { useParams } from "next/navigation";
import { useHubBoardId } from "@/lib/useHubBoardId";
import { PageTemplate } from "@/components/PageTemplate";

// EPIC-055: 기존 UniversalBoard(EPIC-044, 실데이터 없는 뼈대 stub)를
// 걷어내고 Universal Board System(BoardModule, PageTemplate)에 실제로
// 연결한다. 할머니 개개인 전용 게시판은 따로 없어(새 DB 금지) 전체
// 할머니가 공유하는 "grandmas" 스토리 게시판(src/lib/boardLayout.ts)에
// 연결하고, 이름은 페이지 제목으로만 사용 — 검색창으로 특정 이름을
// 걸러볼 수 있다(기존 BoardModule 기능 그대로, 새 기능 없음).
export default function GrandmaHeritagePage() {
  const { name } = useParams<{ name: string }>();
  const displayName = decodeURIComponent(name);
  const { boardId, loading } = useHubBoardId("grandmas");

  if (loading) {
    return <main className="flex-1 p-8 bg-white">불러오는 중...</main>;
  }

  return (
    <PageTemplate
      title={`${displayName} 할머니 이야기`}
      subtitle="사일로 Heritage · Grandmas"
      breadcrumb={[
        { label: "홈", href: "/" },
        { label: "사일로상점" },
        { label: "Heritage", href: "/heritage" },
        { label: displayName },
      ]}
      description="할머니들의 이야기를 나누는 스토리 게시판입니다. 검색창에 이름을 입력하면 특정 할머니의 이야기만 찾아볼 수 있어요."
      boardId={boardId}
    />
  );
}
