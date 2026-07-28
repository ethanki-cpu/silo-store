import type { SurveyModuleProps } from "@/lib/pageModules";

// EPIC-054B: Page Module "Survey" — src/app/polls/page.tsx의 로컬 PollCard가
// 쓰던 투표 버튼/결과 막대 패턴을 일반화한 순수 프레젠테이션 셸. 실제 투표
// 저장/집계는 하지 않는다(콘텐츠/기능 추가 금지) — onVote는 caller가 채운다.
export function SurveyCard({ question, options, hasVoted, onVote }: SurveyModuleProps) {
  const totalVotes = options.reduce((sum, opt) => sum + (opt.votes ?? 0), 0);

  return (
    <div className="rounded-lg border border-gray-200 p-4">
      <p className="font-medium text-gray-900 mb-3">{question}</p>
      <div className="space-y-2">
        {options.map((opt, i) => {
          if (hasVoted) {
            const pct =
              totalVotes > 0 ? Math.round(((opt.votes ?? 0) / totalVotes) * 100) : 0;
            return (
              <div
                key={opt.label}
                className="relative rounded-md border border-gray-200 overflow-hidden"
              >
                <div
                  className="absolute inset-y-0 left-0 bg-gray-800/10"
                  style={{ width: `${pct}%` }}
                />
                <div className="relative flex items-center justify-between px-3 py-2 text-sm">
                  <span>{opt.label}</span>
                  <span className="text-gray-500">{pct}%</span>
                </div>
              </div>
            );
          }
          return (
            <button
              key={opt.label}
              type="button"
              onClick={() => onVote?.(i)}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-left hover:bg-gray-50"
            >
              {opt.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
