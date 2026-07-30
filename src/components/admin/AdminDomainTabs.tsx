"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { ADMIN_DOMAIN_LABELS, ADMIN_DOMAIN_ORDER, type AdminDomain } from "@/lib/adminDomainGrouping";

// EPIC-072: 페이지 관리/게시판 관리/전체 글 관리 3개 화면이 공유하는
// 도메인 필터 탭 — "메뉴/카테고리 관리"의 브랜치 정렬처럼 한눈에 어느
// 도메인(사일로상점/살롱데상/스튜디오/마이페이지)인지 알 수 있게 한다.
// `?domain=` 쿼리 파라미터로 상태를 저장해 새로고침/뒤로가기에도 유지되고,
// 링크 공유도 가능하다. useSearchParams를 쓰므로 호출부는 Suspense로
// 감싸야 한다(이 저장소의 기존 관례 — Navbar.tsx/docent page 참고).
export function useAdminDomainFilter(): AdminDomain | "all" {
  const searchParams = useSearchParams();
  const value = searchParams.get("domain");
  return value && (ADMIN_DOMAIN_ORDER as string[]).includes(value)
    ? (value as AdminDomain)
    : "all";
}

export function AdminDomainTabs({
  counts,
}: {
  // 탭 옆에 개수를 보여주고 싶을 때만 넘긴다(선택).
  counts?: Partial<Record<AdminDomain | "all", number>>;
}) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const current = useAdminDomainFilter();

  function select(domain: AdminDomain | "all") {
    const params = new URLSearchParams(searchParams.toString());
    if (domain === "all") {
      params.delete("domain");
    } else {
      params.set("domain", domain);
    }
    const qs = params.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname);
  }

  const tabs: { key: AdminDomain | "all"; label: string }[] = [
    { key: "all", label: "전체" },
    ...ADMIN_DOMAIN_ORDER.map((domain) => ({ key: domain, label: ADMIN_DOMAIN_LABELS[domain] })),
  ];

  return (
    <div className="flex flex-wrap gap-2 mb-4">
      {tabs.map((tab) => (
        <button
          key={tab.key}
          type="button"
          onClick={() => select(tab.key)}
          className={`px-3 py-1.5 rounded-full text-sm border ${
            current === tab.key
              ? "bg-gray-800 text-white border-gray-800"
              : "border-gray-300 text-gray-600 hover:bg-gray-50"
          }`}
        >
          {tab.label}
          {counts?.[tab.key] !== undefined ? ` (${counts[tab.key]})` : ""}
        </button>
      ))}
    </div>
  );
}
