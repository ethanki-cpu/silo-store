import type { TierBenefit } from "@/lib/tierAccess";

// HOTFIX-162.8: 이전 등급 대비 "새로 열리는 것"을 아이콘+개수+대표 예시로 보여준다(권한 설정 페이지의 실제 값에서 자동 계산).
export function TierBenefitList({ benefits, heading }: { benefits: TierBenefit[]; heading?: string }) {
  if (benefits.length === 0) return null;
  return (
    <div className="mt-3">
      {heading && <p className="text-xs font-semibold text-gray-500">{heading}</p>}
      <ul className="mt-2 space-y-2">
        {benefits.map((b) => {
          const more = b.count - b.examples.length;
          return (
            <li key={b.title} className="flex gap-2.5 rounded-md bg-amber-50/50 px-2.5 py-2">
              <span className="text-lg leading-6" aria-hidden>
                {b.icon}
              </span>
              <div className="min-w-0 text-xs leading-5">
                <p className="font-semibold text-gray-900">
                  {b.title} <span className="ml-1 rounded-full bg-gray-900 px-1.5 py-0.5 text-[10px] font-medium text-white">{b.count}곳</span>
                </p>
                <p className="text-gray-600">
                  {b.examples.join(" · ")}
                  {more > 0 ? ` 외 ${more}곳` : ""}
                </p>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
