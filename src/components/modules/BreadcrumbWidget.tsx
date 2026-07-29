import Link from "next/link";
import type { BreadcrumbItem } from "@/components/PageHeader";

// EPIC-065: Widget Builder — Breadcrumb 단독 위젯. PageHeader.tsx의
// PageHeaderContent가 이미 그리는 breadcrumb과 같은 마크업이지만, 이
// 위젯은 Hero 없이 breadcrumb만 따로 배치하고 싶을 때 쓴다(새 디자인 없음,
// 기존 breadcrumb 스타일 그대로).
export function BreadcrumbWidget({ items }: { items: BreadcrumbItem[] }) {
  if (!items || items.length === 0) return null;
  return (
    <nav className="mb-4 text-xs text-gray-400" aria-label="breadcrumb">
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
