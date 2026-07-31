import { redirect } from "next/navigation";

// EPIC-077: "메뉴/카테고리 관리"는 "페이지 관리"/"게시판 관리"와 함께
// "사이트 구성 관리"(/admin/site-structure)로 통합됐다 — 이 경로로 직접
// 들어오는 기존 링크/북마크를 그리로 안내한다.
export default function AdminNavigationIndexPage() {
  redirect("/admin/site-structure");
}
