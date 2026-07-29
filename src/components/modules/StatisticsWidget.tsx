// EPIC-065: Widget Builder — Statistics 위젯. {label, value} 목록을 그리드
// 통계 타일로 보여준다(순위가 있는 RankingList와 달리 단순 지표 나열용).
export function StatisticsWidget({
  items,
}: {
  items: { label: string; value: string }[];
}) {
  if (!items || items.length === 0) return null;
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
      {items.map((item, i) => (
        <div key={i} className="rounded-lg border border-gray-200 p-4 text-center">
          <p className="text-2xl font-bold text-gray-900">{item.value}</p>
          <p className="mt-1 text-xs text-gray-500">{item.label}</p>
        </div>
      ))}
    </div>
  );
}
