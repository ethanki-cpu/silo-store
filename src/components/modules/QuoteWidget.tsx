// EPIC-065: Widget Builder — Quote 위젯. 순수 프레젠테이션, 새 디자인은
// 기존 카드 관례(rounded-lg border) 안에서 최소한으로만 추가한다.
export function QuoteWidget({ text, author }: { text: string; author?: string }) {
  if (!text) return null;
  return (
    <blockquote className="rounded-lg border-l-4 border-gray-300 bg-gray-50 px-5 py-4">
      <p className="text-gray-800 whitespace-pre-wrap leading-relaxed">“{text}”</p>
      {author && <footer className="mt-2 text-sm text-gray-500">— {author}</footer>}
    </blockquote>
  );
}
