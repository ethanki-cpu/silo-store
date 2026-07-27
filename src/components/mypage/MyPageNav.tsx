"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { MYPAGE_TABS } from "./mypageConfig";

// EPIC-045: 클릭 시 setState로 패널을 바꾸던 탭 전환을 실제 라우트 이동으로
// 교체 — 각 탭이 독립된 URL(/mypage/{id})을 가지므로 activeTab/onSelect
// prop 없이 usePathname()으로 스스로 활성 탭을 판단한다.
export function MyPageNav() {
  const pathname = usePathname();

  return (
    <nav className="flex flex-wrap gap-2 mb-6 border-b border-gray-200 pb-4">
      {MYPAGE_TABS.map((tab) => {
        const href = `/mypage/${tab.id}`;
        const active = pathname === href || pathname.startsWith(`${href}/`);
        return (
          <Link
            key={tab.id}
            href={href}
            className={`px-3 py-1.5 rounded-full text-sm border ${
              active
                ? "bg-gray-800 text-white border-gray-800"
                : "border-gray-300 text-gray-600 hover:bg-gray-50"
            }`}
          >
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}
