"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

// EPIC-025: "전체 글 관리" 2-Depth 서브 탭. is_admin 가드는
// src/app/admin/layout.tsx가 이미 처리했으므로 여기서는 서브 네비게이션만 그린다.
// EPIC-072: 4대 도메인(사일로상점/살롱데상/스튜디오/마이페이지) 기준으로
// 일관되게 확장 — 물품(items)과 게시판 글(posts)은 서로 다른 데이터라
// 사일로상점만 두 탭으로 나뉜다. 스튜디오/마이페이지는 아직 연결된
// 게시판이 없어 빈 목록으로 뜨지만, 게시판이 생기면 자동으로 채워진다.
const SUB_NAV = [
  { href: "/admin/posts/shop", label: "[사일로상점] 물품 관리" },
  { href: "/admin/posts/silostore", label: "[사일로상점] 게시글 관리" },
  { href: "/admin/posts/salon", label: "[살롱데상] 게시글 관리" },
  { href: "/admin/posts/studio", label: "[스튜디오] 게시글 관리" },
  { href: "/admin/posts/mypage", label: "[마이페이지] 게시글 관리" },
  // EPIC-089: 어느 사이트 메뉴 브랜치에도 아직 안 걸린(=미분류) 게시판의
  // 글은 위 4개 탭 어디에도 안 뜬다(AdminPostsBoardView의 domain==="common"
  // 분기) — 이 탭이 없으면 그런 글은 관리 화면에서 영원히 안 보였다.
  { href: "/admin/posts/common", label: "[기타] 미분류 게시글 관리" },
];

export default function AdminPostsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  return (
    <div className="flex-1 flex flex-col">
      <div className="max-w-4xl mx-auto w-full px-8 pt-6">
        <h1 className="text-2xl font-bold mb-4">전체 글 관리</h1>
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
