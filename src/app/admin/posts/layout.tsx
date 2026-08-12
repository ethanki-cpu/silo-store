"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

// EPIC-025: "전체 글 관리" 2-Depth 서브 탭. is_admin 가드는
// src/app/admin/layout.tsx가 이미 처리했으므로 여기서는 서브 네비게이션만 그린다.
// EPIC-072: 4대 도메인(사일로상점/살롱데상/스튜디오/마이페이지) 기준으로
// 일관되게 확장 — 물품(items)과 게시판 글(posts)은 서로 다른 데이터라
// 사일로상점만 두 탭으로 나뉜다. 스튜디오/마이페이지는 아직 연결된
// 게시판이 없어 빈 목록으로 뜨지만, 게시판이 생기면 자동으로 채워진다.
// EPIC-096 후속(사용자 신고): "About Silo"/"온라인 도슨트" 탭이 여기 없어서
// 그 소속 게시글이 관리 화면에서 아예 안 보이던 문제 — adminDomainGrouping.ts
// 참고(라이브 최상위 탭 6개 그대로 도메인화).
const SUB_NAV = [
  { href: "/admin/posts/shop", label: "[사일로상점] 물품 관리" },
  { href: "/admin/posts/about-silo", label: "[About Silo] 게시글 관리" },
  { href: "/admin/posts/silostore", label: "[사일로상점] 게시글 관리" },
  { href: "/admin/posts/docent", label: "[온라인 도슨트] 게시글 관리" },
  { href: "/admin/posts/salon", label: "[살롱데상] 게시글 관리" },
  { href: "/admin/posts/studio", label: "[스튜디오] 게시글 관리" },
  { href: "/admin/posts/mypage", label: "[마이페이지] 게시글 관리" },
  // EPIC-089: 어느 사이트 메뉴 브랜치에도 아직 안 걸린(=미분류) 게시판의
  // 글은 위 탭들 어디에도 안 뜬다(AdminPostsBoardView의 domain==="common"
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
      {/* 사용자 신고(2026-08-12): 탭이 7개로 늘어나면서 max-w-4xl 폭에
          가로 스크롤 없이는 다 안 보였다 — 컨테이너를 넓히고(max-w-6xl),
          가로 스크롤 대신 필요하면 줄바꿈(flex-wrap)되도록 바꿔 스크롤 없이
          한 화면에서 전부 보이게 한다. */}
      <div className="max-w-6xl mx-auto w-full px-8 pt-6">
        <h1 className="text-2xl font-bold mb-4">전체 글 관리</h1>
        <nav className="flex flex-wrap gap-1 border-b border-gray-200 mb-6">
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
