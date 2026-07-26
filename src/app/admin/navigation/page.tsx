import { redirect } from "next/navigation";

// EPIC-025: /admin/navigation의 실제 관리 UI는 4개 서브 페이지로 분리되었다
// (settings / top-tabs / sidebar-left / sidebar-right). 이 인덱스는 기본
// 서브 탭인 "상단 탭 / 카테고리 관리"로 리다이렉트한다.
export default function AdminNavigationIndexPage() {
  redirect("/admin/navigation/top-tabs");
}
