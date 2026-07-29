// EPIC-066: Board Widget 로딩 상태 — 기존 "불러오는 중..." 텍스트 대신
// Skeleton UI. 어떤 레이아웃인지 아직 모르는 시점(fetch 전)에 뜨는
// 범용 자리표시자라 특정 Renderer 모양을 흉내내지 않고, 카드형 목록
// 하나로 통일한다(과한 레이아웃별 skeleton은 오히려 깜빡임만 늘림).
export function BoardSkeleton({ rows = 4 }: { rows?: number }) {
  return (
    <div className="animate-pulse space-y-4" aria-busy="true" aria-label="불러오는 중">
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} className="flex gap-4 py-2">
          <div className="w-16 h-16 shrink-0 rounded-md bg-gray-100" />
          <div className="flex-1 space-y-2 py-1">
            <div className="h-4 bg-gray-100 rounded w-2/3" />
            <div className="h-3 bg-gray-100 rounded w-1/3" />
            <div className="h-3 bg-gray-100 rounded w-1/2" />
          </div>
        </div>
      ))}
    </div>
  );
}
