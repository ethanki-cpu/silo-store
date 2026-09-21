import Link from "next/link";
import type { ReactNode } from "react";
import { ENTITY_ROLE, splitBusinessEntities, type BusinessInfo } from "@/lib/businessInfo";

// EPIC-158.0: 이용약관/개인정보처리방침/환불·해지 정책/가격 안내가 공유하는 문서 레이아웃.
// 하단에 푸터와 같은 사업자 정보(src/lib/businessInfo.ts)를 다시 보여준다.
export function LegalDocument({
  title,
  effectiveDate,
  business,
  children,
}: {
  title: string;
  effectiveDate?: string;
  business: BusinessInfo;
  children: ReactNode;
}) {
  const rows: [string, string][] = [
    ["상호", business.name],
    ["대표자", business.representative],
    ["사업자등록번호", business.businessNumber],
    ["통신판매업 신고번호", business.mailOrderNumber],
    ["주소", business.address],
    ["전화", business.phone],
    ["이메일", business.email],
  ];

  const entities = splitBusinessEntities(business);

  return (
    <main className="mx-auto w-full max-w-3xl flex-1 bg-white px-6 py-12">
      <nav className="mb-6 flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-400" aria-label="정책 문서">
        <Link href="/terms" className="hover:text-gray-700">이용약관</Link>
        <Link href="/privacy" className="hover:text-gray-700">개인정보처리방침</Link>
        <Link href="/refund-policy" className="hover:text-gray-700">환불 및 구독 해지 안내</Link>
        <Link href="/pricing" className="hover:text-gray-700">상품 및 가격 안내</Link>
      </nav>
      <h1 className="text-2xl font-bold text-gray-900">{title}</h1>
      {effectiveDate && <p className="mt-1 text-sm text-gray-500">시행일: {effectiveDate}</p>}
      <div className="mt-8 space-y-8 text-sm leading-7 text-gray-700">{children}</div>
      <section className="mt-12 rounded-md border border-gray-200 bg-gray-50 p-4 text-xs leading-6 text-gray-600">
        <p className="mb-1 font-medium text-gray-800">사업자 정보</p>
        {rows
          .filter(([, v]) => v)
          .map(([k, v]) => (
            <p key={k}>
              {k}: {v}
            </p>
          ))}
      </section>
      {entities && (
        <section className="mt-4 rounded-md border border-gray-200 bg-gray-50 p-4 text-xs leading-6 text-gray-600">
          <p className="mb-1 font-medium text-gray-800">판매·결제 주체별 사업자 정보</p>
          {entities.map((e) => (
            <div key={e.name} className="mb-2 last:mb-0">
              <p className="font-medium text-gray-700">
                {e.name}
                {ENTITY_ROLE[e.name] ? ` — ${ENTITY_ROLE[e.name]}` : ""}
              </p>
              {e.representative && <p>대표자: {e.representative}</p>}
              {e.businessNumber && <p>사업자등록번호: {e.businessNumber}</p>}
              {e.mailOrderNumber && <p>통신판매업 신고번호: {e.mailOrderNumber}</p>}
              {e.address && <p>주소: {e.address}</p>}
            </div>
          ))}
        </section>
      )}
    </main>
  );
}

export function LegalSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section>
      <h2 className="mb-2 text-base font-semibold text-gray-900">{title}</h2>
      <div className="space-y-2">{children}</div>
    </section>
  );
}
