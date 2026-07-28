// EPIC-060: Page Builder Module — Text. settings.text를 그대로 문단으로
// 보여주는 가장 단순한 모듈(줄바꿈만 보존, HTML 파싱 없음 — XSS 위험 없음).
export function TextModule({ text }: { text: string }) {
  return (
    <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">
      {text}
    </p>
  );
}
