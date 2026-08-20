"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import type { NavItem } from "@/lib/navConfig";
import { GatedNavLink } from "@/components/common/GatedNavLink";

// EPIC-138(사용자 지시): "마이페이지" 클릭 시 여는 드롭다운 — "사이트
// 구성 관리 > 사이트 메뉴"에서 최상위 카테고리를 "사용자 메뉴"로 태그하면
// 여기(items)에 담겨 나타난다. MembershipPopover.tsx와 동일한 표준
// click-outside + Escape 패턴을 그대로 따른다(이 코드베이스의 두 번째
// 클릭 트리거 드롭다운).
export function UserMenuDropdown({ items, onClose }: { items: NavItem[]; onClose: () => void }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    }
    function handleEscape(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [onClose]);

  return (
    <div
      ref={ref}
      className="absolute right-0 top-full mt-2 w-56 rounded-lg border border-gray-200 bg-white shadow-lg z-50 py-2 text-sm"
    >
      <Link href="/mypage" onClick={onClose} className="block px-3 py-2 font-medium text-gray-800 hover:bg-gray-50">
        마이페이지 바로가기
      </Link>
      {items.length > 0 && (
        <>
          <div className="my-1 border-t border-gray-100" />
          {items.map((item, idx) => (
            <GatedNavLink
              key={`${item.href}-${idx}`}
              href={item.href}
              minRankToRead={item.minRankToRead}
              onClick={onClose}
              className="block px-3 py-2 text-gray-700 hover:bg-gray-50"
            >
              {item.label}
            </GatedNavLink>
          ))}
        </>
      )}
    </div>
  );
}
