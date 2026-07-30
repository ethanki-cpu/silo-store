"use client";

// EPIC-072: 도메인 매개변수화된 AdminPostsBoardView로 이전 — 이전에는
// board_type만으로 걸렀지만(도메인 필터 없음) 이제 "이 게시판이 살롱데상
// 도메인인가"부터 먼저 걸러 다른 도메인(사일로상점 등) 게시글이 섞여
// 보이지 않는다. 실제 조회/수정 로직은 AdminPostsBoardView 참고.
import { AdminPostsBoardView } from "@/components/admin/AdminPostsBoardView";

export default function AdminPostsSalonPage() {
  return <AdminPostsBoardView domain="salon" />;
}
