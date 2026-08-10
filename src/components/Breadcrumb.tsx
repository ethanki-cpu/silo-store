"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { findNavNodeByPathname, getAncestorChain } from "@/lib/siteTree";
import type { BreadcrumbItem } from "@/components/PageHeader";

// EPIC-092(요구사항 8): 홈을 제외한 모든 페이지 최상단에 자동으로 뜨는
// 브레드크럼 — src/app/layout.tsx에 이 컴포넌트 하나만 추가해 108개
// 정적 page.tsx/캐치올 라우트를 전혀 건드리지 않는다(usePathname()으로
// 현재 경로를 읽어 site_navigations에서 매칭되는 행을 찾을 뿐이라, 모든
// 페이지가 이미 layout.tsx를 거치므로 별도 배선이 필요 없다). 게시글
// 상세 페이지처럼 board_id 기반 매핑이 필요한 경우는 여기서 매칭되는 nav
// 행이 없어 자연히 아무것도 그리지 않고, PostDetailClient.tsx가 서버에서
// 미리 계산한 값을 별도로 렌더링한다(중복 없음).
export function Breadcrumb() {
  const pathname = usePathname();
  const [items, setItems] = useState<BreadcrumbItem[] | null>(null);

  useEffect(() => {
    if (!pathname || pathname === "/") {
      setItems(null);
      return;
    }
    let cancelled = false;
    findNavNodeByPathname(pathname).then(async (node) => {
      if (cancelled) return;
      if (!node) {
        setItems(null);
        return;
      }
      const chain = await getAncestorChain(node.id);
      if (!cancelled) setItems(chain);
    });
    return () => {
      cancelled = true;
    };
  }, [pathname]);

  if (!items || items.length === 0) return null;

  return (
    <nav className="max-w-5xl mx-auto w-full px-6 pt-4 text-xs text-gray-400" aria-label="breadcrumb">
      {items.map((item, i) => (
        <span key={i}>
          {item.href ? (
            <Link href={item.href} className="hover:text-gray-600">
              {item.label}
            </Link>
          ) : (
            <span className="text-gray-500">{item.label}</span>
          )}
          {i < items.length - 1 && <span className="mx-1.5">›</span>}
        </span>
      ))}
    </nav>
  );
}
