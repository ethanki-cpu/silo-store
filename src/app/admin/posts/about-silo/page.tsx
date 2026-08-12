"use client";

// EPIC-096 후속(사용자 신고): "About Silo"는 EPIC-095가 확인한 최상위 탭인데
// 이 관리 화면엔 도메인/탭 자체가 없어 그 소속 게시글이 전부 "공통/기타"로
// 숨어 있었다 — adminDomainGrouping.ts/adminTreeGrouping.ts 참고.
import { AdminPostsBoardView } from "@/components/admin/AdminPostsBoardView";

export default function AdminPostsAboutSiloPage() {
  return <AdminPostsBoardView domain="about_silo" />;
}
