// EPIC-065: Widget Builder — FAQ 위젯. 네이티브 <details>/<summary>로
// 아코디언을 구현해 별도 JS state 없이 접근성(키보드/스크린리더)까지
// 기본 지원한다.
export function FaqWidget({
  items,
}: {
  items: { question: string; answer: string }[];
}) {
  if (!items || items.length === 0) return null;
  return (
    <div className="divide-y divide-gray-200 rounded-lg border border-gray-200">
      {items.map((item, i) => (
        <details key={i} className="group px-4 py-3">
          <summary className="cursor-pointer list-none flex items-center justify-between font-medium text-gray-900">
            <span>{item.question}</span>
            <span className="text-gray-400 group-open:rotate-180 transition-transform">⌄</span>
          </summary>
          <p className="mt-2 text-sm text-gray-600 whitespace-pre-wrap">{item.answer}</p>
        </details>
      ))}
    </div>
  );
}
