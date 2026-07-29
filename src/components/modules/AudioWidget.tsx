// EPIC-065: Widget Builder — Audio 위젯. 표준 <audio controls> 하나뿐인
// 가장 단순한 미디어 위젯.
export function AudioWidget({ url, caption }: { url: string; caption?: string }) {
  if (!url) return null;
  return (
    <figure>
      <audio src={url} controls className="w-full" />
      {caption && <figcaption className="mt-2 text-xs text-gray-500">{caption}</figcaption>}
    </figure>
  );
}
