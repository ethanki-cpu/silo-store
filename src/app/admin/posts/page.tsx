import { redirect } from "next/navigation";

// EPIC-025: /admin/posts 인덱스는 기본 서브 탭인 "[사일로 상점] 카테고리별
// 글 관리"로 리다이렉트한다. (admin/layout.tsx의 메인 탭이 이 경로로 링크한다.)
export default function AdminPostsIndexPage() {
  redirect("/admin/posts/shop");
}
