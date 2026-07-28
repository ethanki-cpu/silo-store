"use client";

import Link from "next/link";

// EPIC-054B: BoardHeader.tsx의 CTA(문의하기/예약하기 등) 버튼 목록을 그대로
// 뽑아낸 공용 컴포넌트 — Page Module "CTA"와 게시판 헤더가 동일한 마크업/
// 스타일을 공유한다(중복 컴포넌트 생성 금지).
export function CtaButtons({
  ctas,
}: {
  ctas: { label: string; href: string }[];
}) {
  return (
    <>
      {ctas.map((cta) => (
        <Link
          key={cta.href + cta.label}
          href={cta.href}
          className="rounded-md border border-gray-300 text-gray-700 px-4 py-2 text-sm hover:bg-gray-50 transition-colors"
        >
          {cta.label}
        </Link>
      ))}
    </>
  );
}
