"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/lib/AuthProvider";

// EPIC-077: "메뉴/카테고리 관리"/"페이지 관리"/"게시판 관리" 3개 탭을
// "사이트 구성 관리"(/admin/site-structure) 하나로 통합했다. 그 3개 화면
// 중 "메뉴/카테고리 관리"의 서브 탭이었던 "홈페이지 설정 관리"
// (/admin/navigation/settings)는 통합 대상이 아니라서(로고/슬라이드쇼/노출
// 필터/사이드바 아이콘 설정) 최상위 탭으로 별도 승격 — 안 그러면 URL 직접
// 입력 외엔 접근 불가능해진다.
const ADMIN_NAV = [
  { href: "/admin/payments", label: "결제 관리" },
  { href: "/admin/members", label: "회원 관리" },
  { href: "/admin/site-structure", label: "사이트 구성 관리" },
  { href: "/admin/navigation/settings", label: "홈페이지 설정 관리" },
  { href: "/admin/posts", label: "전체 글 관리" },
  // EPIC-087-PHASE-E: "스튜디오 포트폴리오 등록"(styling_projects CRUD, 신청
  // 관리와 무관한 쇼케이스 콘텐츠 기능)을 완전히 교체 — 사용자 확인 완료.
  // 기존 라우트(/admin/projects/new)는 삭제하지 않고 그대로 남겨두되(URL
  // 직접 접근은 계속 가능) 최상위 탭에서는 뺀다.
  { href: "/admin/rentals", label: "스튜디오 대관/물품대여 신청 관리" },
  { href: "/admin/fonts", label: "커스텀 폰트 관리" },
  { href: "/admin/footer", label: "하단 메뉴 관리" },
];

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { session, member, loading, memberLoading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  const [authorized, setAuthorized] = useState(false);
  // session이 null → 실제 세션으로 막 바뀐 바로 그 렌더에서는, AuthProvider의
  // member 재조회 effect(부모)가 memberLoading을 true로 재무장하기 전에 이
  // layout(자식)의 effect가 먼저 실행되어 memberLoading=false(직전 값)을
  // 잘못 신뢰할 수 있다(EPIC-024) — session이 바뀐 바로 그 렌더는 건너뛰고
  // 다음 렌더(재무장된 뒤)를 기다려서, 로그인된 관리자가 하드 리로드 시
  // "/"로 잘못 튕기는 문제를 막는다.
  const prevSessionRef = useRef(session);

  useEffect(() => {
    const sessionChanged = prevSessionRef.current !== session;
    prevSessionRef.current = session;

    if (loading || memberLoading) return;
    if (sessionChanged) return;

    if (!session || !member?.is_admin) {
      router.replace("/");
      return;
    }
    setAuthorized(true);
  }, [loading, memberLoading, session, member, router]);

  if (!authorized) {
    return (
      <main className="flex-1 flex items-center justify-center p-8">
        <p className="text-gray-400 text-sm">확인 중...</p>
      </main>
    );
  }

  return (
    <div className="flex-1 flex flex-col">
      <nav className="border-b border-gray-200 px-8 pt-4">
        <div className="max-w-4xl mx-auto w-full flex gap-1 overflow-x-auto whitespace-nowrap">
          {ADMIN_NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`px-3 py-2 text-sm border-b-2 -mb-px ${
                pathname.startsWith(item.href)
                  ? "border-gray-800 text-gray-900 font-medium"
                  : "border-transparent text-gray-500 hover:text-gray-700"
              }`}
            >
              {item.label}
            </Link>
          ))}
        </div>
      </nav>
      {children}
    </div>
  );
}
