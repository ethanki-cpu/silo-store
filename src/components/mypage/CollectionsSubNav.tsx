"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { COLLECTION_SUBTABS } from "./mypageConfig";

// EPIC-045: CollectionsPanel.tsx의 내부 setState 서브탭 전환을 대체 —
// 각 컬렉션 카테고리가 독립 라우트(/mypage/collections/{key})를 갖는다.
export function CollectionsSubNav() {
  const pathname = usePathname();

  return (
    <div className="flex flex-wrap gap-2 mb-4">
      {COLLECTION_SUBTABS.map((sub) => {
        const href = `/mypage/collections/${sub.key}`;
        const active = pathname === href;
        return (
          <Link
            key={sub.key}
            href={href}
            className={`px-3 py-1.5 rounded-full text-xs border ${
              active
                ? "bg-gray-800 text-white border-gray-800"
                : "border-gray-300 text-gray-600 hover:bg-gray-50"
            }`}
          >
            {sub.label}
          </Link>
        );
      })}
    </div>
  );
}
