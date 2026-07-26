"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

// EPIC-025: "메뉴/카테고리 관리" 2-Depth 서브 탭. is_admin 가드는
// src/app/admin/layout.tsx가 이미 처리했으므로 여기서는 서브 네비게이션만 그린다.
const SUB_NAV = [
  { href: "/admin/navigation/settings", label: "홈페이지 설정 관리" },
  { href: "/admin/navigation/top-tabs", label: "상단 탭 / 카테고리 관리" },
  { href: "/admin/navigation/sidebar-left", label: "왼쪽 사이드바 메뉴 관리" },
  { href: "/admin/navigation/sidebar-right", label: "오른쪽 사이드바 메뉴 관리" },
];

export default function AdminNavigationLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  return (
    <div className="flex-1 flex flex-col">
      <div className="max-w-4xl mx-auto w-full px-8 pt-6">
        <h1 className="text-2xl font-bold mb-4">메뉴 / 카테고리 관리</h1>
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
