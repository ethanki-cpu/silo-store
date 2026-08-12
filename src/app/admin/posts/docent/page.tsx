"use client";

// EPIC-096 후속(사용자 신고): "온라인 도슨트"는 EPIC-095가 확인한 대로
// 사일로상점 하위가 아니라 이미 독립된 최상위 탭이다 — 이 관리 화면도
// 별도 탭으로 분리한다(그동안 사일로상점 도메인 추정에 묻혀 있었음).
import { AdminPostsBoardView } from "@/components/admin/AdminPostsBoardView";

export default function AdminPostsDocentPage() {
  return <AdminPostsBoardView domain="docent" />;
}
