import Link from "next/link";

// EPIC-065: Widget Builder — 단일 Button 위젯(여러 개면 CTA/Reservation
// 위젯을 쓴다). style은 CtaButtons(보조)/기존 페이지들의 강조 버튼
// 클래스(예: shop/page.tsx의 "구매하기")와 동일한 두 가지 톤만 지원한다.
export function ButtonWidget({
  label,
  href,
  style = "primary",
}: {
  label: string;
  href: string;
  style?: "primary" | "secondary";
}) {
  if (!label || !href) return null;
  const className =
    style === "secondary"
      ? "inline-block rounded-md border border-gray-300 text-gray-700 px-4 py-2 text-sm hover:bg-gray-50 transition-colors"
      : "inline-block rounded-md bg-gray-800 text-white px-4 py-2 text-sm hover:bg-gray-700 transition-colors";
  return (
    <Link href={href} className={className}>
      {label}
    </Link>
  );
}
