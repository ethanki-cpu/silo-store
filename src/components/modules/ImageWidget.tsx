// EPIC-065: Widget Builder — Image 위젯. 다른 페이지들의 이미지 관례(rounded-lg,
// aspect-video)를 그대로 따른다.
export function ImageWidget({
  url,
  alt,
  caption,
}: {
  url: string;
  alt?: string;
  caption?: string;
}) {
  if (!url) return null;
  return (
    <figure>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={url} alt={alt ?? ""} className="w-full rounded-lg object-cover" />
      {caption && <figcaption className="mt-2 text-xs text-gray-500 text-center">{caption}</figcaption>}
    </figure>
  );
}
