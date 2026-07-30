"use client";

// EPIC-072: 스튜디오 도메인 게시판 게시글 — 현재는 스튜디오에 연결된
// 게시판이 없어 "표시할 글이 없어요"로 뜬다(정직한 빈 상태이지 결함 아님).
import { AdminPostsBoardView } from "@/components/admin/AdminPostsBoardView";

export default function AdminPostsStudioPage() {
  return <AdminPostsBoardView domain="studio" />;
}
