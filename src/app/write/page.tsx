"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { WriteBoardForm } from "@/components/boards/WriteBoardForm";

// EPIC-084: Contextual Write 진입점 — 상단 탭의 전역 "글쓰기" 버튼과 페이지
// 위젯(갤러리 등)의 글쓰기 버튼이 여기로 온다. 게시판 컨텍스트가 있는
// 곳(게시판 상세, 위젯이 연결된 게시판)에서 눌렀으면 ?boardId=<board_slug>가
// 붙어 그 게시판이 기본 선택되고, 게시판 컨텍스트가 없는 곳(홈페이지 등)에서
// 눌렀으면 파라미터 없이 진입해 사용자가 WriteBoardForm의 "게시될 페이지
// 선택" 드롭다운에서 직접 고른다. useSearchParams()를 쓰므로 Navbar.tsx와
// 동일한 이유로 Suspense가 필요하다.
function WritePageInner() {
  const searchParams = useSearchParams();
  const boardId = searchParams.get("boardId") ?? "";
  return <WriteBoardForm initialBoardSlug={boardId} />;
}

export default function GlobalWritePage() {
  return (
    <Suspense fallback={null}>
      <WritePageInner />
    </Suspense>
  );
}
