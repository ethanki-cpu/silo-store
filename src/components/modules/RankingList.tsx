import type { RankingModuleProps } from "@/lib/pageModules";

// EPIC-054B: Page Module "Ranking" — 이 프로젝트에 기존 랭킹/리더보드
// 컴포넌트가 없어(NEXT_TASK.md EPIC-052 후속 참고) 새로 만드는 최소
// 프레젠테이션 셸. 순위 집계 로직/쿼리는 만들지 않는다(콘텐츠 추가 금지) —
// entries는 caller가 채운다.
export function RankingList({ title, entries }: RankingModuleProps) {
  return (
    <div>
      {title && <h2 className="text-lg font-semibold mb-3">{title}</h2>}
      <div className="divide-y divide-gray-100 rounded-lg border border-gray-200">
        {entries.map((entry) => (
          <div
            key={entry.rank}
            className="flex items-center justify-between px-4 py-2.5 text-sm"
          >
            <span className="flex items-center gap-3">
              <span className="w-6 text-gray-400 font-semibold">{entry.rank}</span>
              <span className="text-gray-900">{entry.name}</span>
            </span>
            <span className="text-gray-500">{entry.score}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
