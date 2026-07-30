"use client";

// EPIC-072: 사일로상점 도메인의 게시판 게시글(도슨트 시대별/헤리티지 등) —
// 물품(items) 관리는 별도 탭(/admin/posts/shop)이 계속 담당한다.
import { AdminPostsBoardView } from "@/components/admin/AdminPostsBoardView";

export default function AdminPostsSilostorePage() {
  return <AdminPostsBoardView domain="silostore" />;
}
