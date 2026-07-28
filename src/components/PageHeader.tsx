import Link from "next/link";

export type BreadcrumbItem = { label: string; href?: string };

// EPIC-054A: 아직 실제 기능이 없는 메뉴/서브메뉴를 위한 공용 정적 페이지 헤더.
// Title/Subtitle/Breadcrumb/Description/Page Container만 제공하며, 게시판 연결이나
// 별도 기능은 이 컴포넌트의 범위 밖이다(ComingSoon을 대체).
export function PageHeader({
  title,
  subtitle,
  breadcrumb,
  description,
}: {
  title: string;
  subtitle?: string;
  breadcrumb: BreadcrumbItem[];
  description: string;
}) {
  return (
    <main className="flex-1 p-8 max-w-2xl mx-auto w-full">
      <nav className="mb-4 text-xs text-gray-400" aria-label="breadcrumb">
        {breadcrumb.map((item, i) => (
          <span key={i}>
            {item.href ? (
              <Link href={item.href} className="hover:text-gray-600">
                {item.label}
              </Link>
            ) : (
              <span className="text-gray-500">{item.label}</span>
            )}
            {i < breadcrumb.length - 1 && <span className="mx-1.5">›</span>}
          </span>
        ))}
      </nav>
      <h1 className="text-2xl font-bold mb-2">{title}</h1>
      {subtitle && <p className="text-lg text-gray-600 mb-4">{subtitle}</p>}
      <p className="text-sm text-gray-500">{description}</p>
    </main>
  );
}
