"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

// EPIC-025: "메뉴/카테고리 관리" 2-Depth 서브 탭. is_admin 가드는
// src/app/admin/layout.tsx가 이미 처리했으므로 여기서는 서브 네비게이션만 그린다.
//
// EPIC-035-Fix: top-tabs/sidebar-left/sidebar-right 3개 서브 탭(정적
// NavNodeEditor 기반)은 EPIC-035의 CategoryTreeManager(드래그앤드롭 통합
// 관리 화면, /admin/navigation 자체)로 대체되어 삭제 — 같은 site_navigations
// 를 다루는 UI가 두 벌로 병존하던 문제 해소. 이제 서브 탭은 "카테고리 통합
// 관리"(트리 D&D)와 "홈페이지 설정 관리"(로고/슬라이드쇼/노출 필터) 2개뿐.
//
// EPIC-077: "카테고리 통합 관리"(/admin/navigation)는 "사이트 구성 관리"
// (/admin/site-structure)로 흡수되어 리다이렉트만 남았다 — 이 레이아웃
// 아래에는 이제 "홈페이지 설정 관리"(/admin/navigation/settings) 하나만
// 실질적으로 남아 서브 탭도 그것 하나로 줄인다.
const SUB_NAV = [{ href: "/admin/navigation/settings", label: "홈페이지 설정 관리" }];

export default function AdminNavigationLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  return (
    <div className="flex-1 flex flex-col">
      <div className="max-w-4xl mx-auto w-full px-8 pt-6">
        <h1 className="text-2xl font-bold mb-4">홈페이지 설정 관리</h1>
        <nav className="flex gap-1 overflow-x-auto whitespace-nowrap border-b border-gray-200 mb-6">
          {SUB_NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`px-3 py-2 text-sm border-b-2 -mb-px ${
                pathname === item.href
                  ? "border-gray-800 text-gray-900 font-medium"
                  : "border-transparent text-gray-500 hover:text-gray-700"
              }`}
            >
              {item.label}
            </Link>
          ))}
        </nav>
      </div>
      {children}
    </div>
  );
}
