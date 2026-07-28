import type { ProfileCardModuleProps } from "@/lib/pageModules";

// EPIC-054B: Page Module "Profile Card" — src/app/u/[memberId]/page.tsx는
// 프로필 정보를 인라인으로만 렌더링해 재사용 가능한 카드가 없었다
// (조사 결과 확인됨). 이 셸은 avatar/name/tier/stats만 표시하는 순수
// 프레젠테이션 컴포넌트 — 데이터 조회는 하지 않는다(콘텐츠 추가 금지).
export function ProfileCard({ name, subtitle, avatarUrl, stats }: ProfileCardModuleProps) {
  return (
    <div className="rounded-lg border border-gray-200 p-4 flex items-center gap-4">
      {avatarUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={avatarUrl}
          alt={name}
          className="w-16 h-16 rounded-full object-cover shrink-0"
        />
      ) : (
        <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center text-gray-400 text-xl shrink-0">
          {name.slice(0, 1)}
        </div>
      )}
      <div className="min-w-0">
        <p className="font-medium text-gray-900">{name}</p>
        {subtitle && <p className="text-sm text-gray-500">{subtitle}</p>}
        {stats && stats.length > 0 && (
          <div className="flex gap-4 mt-2 text-xs text-gray-500">
            {stats.map((s) => (
              <span key={s.label}>
                {s.label} {s.value}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
