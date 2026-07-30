"use client";

// EPIC-072: 마이페이지 도메인 게시판 게시글 — 현재는 마이페이지에 연결된
// 게시판이 없어 "표시할 글이 없어요"로 뜬다(정직한 빈 상태이지 결함 아님).
import { AdminPostsBoardView } from "@/components/admin/AdminPostsBoardView";

export default function AdminPostsMypagePage() {
  return <AdminPostsBoardView domain="mypage" />;
}
