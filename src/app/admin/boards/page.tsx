import { redirect } from "next/navigation";

// EPIC-077: "게시판 관리" 목록 화면은 "메뉴/카테고리 관리"/"페이지 관리"와
// 함께 "사이트 구성 관리"(/admin/site-structure)로 통합됐다 — 게시판 상세
// 폼(/admin/boards/[id], /admin/boards/new)은 그대로 유지되고, 통합 트리의
// "관리" 패널에서 링크로 연결된다.
export default function AdminBoardsPage() {
  redirect("/admin/site-structure");
}
