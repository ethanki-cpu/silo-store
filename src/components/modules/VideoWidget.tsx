// EPIC-065: Widget Builder — Video 위젯. shop/projects/[id]/page.tsx가
// 이미 쓰던 <video controls> 마크업을 그대로 재사용한다(새 플레이어 없음).
export function VideoWidget({ url, caption }: { url: string; caption?: string }) {
  if (!url) return null;
  return (
    <figure>
      <video src={url} controls className="w-full rounded-lg bg-black" />
      {caption && <figcaption className="mt-2 text-xs text-gray-500 text-center">{caption}</figcaption>}
    </figure>
  );
}
