import { embedSrc, type EmbedProvider, type GalleryImageAttrs, type JSONContent } from "@/lib/blockEditorCore";

export type CalendarMediaItem = { type: "image" | "video" | "embed"; src: string };

// EPIC-092(요구사항 5): 캘린더 위젯의 날짜별 미디어 슬라이더가 쓸 항목을
// 게시글 본문(body_json)에서 뽑아낸다 — blockEditorCore.ts의
// findFeaturedImage/collectStorageRefs와 동일한 재귀 순회 패턴을 그대로
// 따른다(새 트리 순회 방식을 발명하지 않음). 갤러리(이미지/영상)와
// embed(유튜브/비메오 등) 노드만 대상으로 하고, 순서는 문서에 등장하는
// 순서 그대로 유지한다.
export function extractCalendarMedia(bodyJson: JSONContent | null | undefined): CalendarMediaItem[] {
  if (!bodyJson) return [];
  const items: CalendarMediaItem[] = [];

  function walk(node: JSONContent) {
    if (node.type === "gallery" && Array.isArray(node.attrs?.images)) {
      for (const img of node.attrs.images as GalleryImageAttrs[]) {
        if (img?.src) items.push({ type: img.type === "video" ? "video" : "image", src: img.src });
      }
    }
    if (node.type === "figureImage" && node.attrs?.src) {
      items.push({ type: "image", src: node.attrs.src as string });
    }
    if (node.type === "embed" && node.attrs?.url && node.attrs?.provider) {
      const src = embedSrc(node.attrs.provider as EmbedProvider, node.attrs.url as string);
      if (src) items.push({ type: "embed", src });
    }
    for (const child of node.content ?? []) walk(child);
  }

  walk(bodyJson);
  return items;
}
