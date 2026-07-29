// EPIC-065: Widget Builder — Badge 위젯. 작은 pill 태그 목록(예: NEW/HOT
// 안내) — 회원 등급 배지(mypage BadgesPanel)와는 무관한 순수 표시용 위젯.
export function BadgeWidget({ items }: { items: { label: string }[] }) {
  if (!items || items.length === 0) return null;
  return (
    <div className="flex flex-wrap gap-2">
      {items.map((item, i) => (
        <span
          key={i}
          className="inline-flex items-center rounded-full bg-gray-800 text-white px-3 py-1 text-xs font-medium"
        >
          {item.label}
        </span>
      ))}
    </div>
  );
}
