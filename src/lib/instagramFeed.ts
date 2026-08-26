import { supabase } from "@/lib/supabaseClient";
import { extractInstagramShortcode } from "@/lib/instagramShortcode";

// EPIC-143: R2에 재호스팅된 뒤 Supabase에 캐싱된 Instagram 게시물 — 원본
// Instagram CDN과는 완전히 분리된, 우리가 소유한 사본이다(src/app/api/
// instagram/fetch/route.ts가 채운다). 프론트엔드는 이 테이블만 읽으므로
// Instagram API 호출 없이 항상 빠르다.
export type InstagramFeedItem = {
  id: string;
  ig_media_id: string;
  media_type: "IMAGE" | "VIDEO" | "CAROUSEL_ALBUM";
  caption: string | null;
  permalink: string | null;
  posted_at: string | null;
  media_urls: string[];
  media_item_types: string[];
  thumbnail_url: string | null;
};

export async function fetchInstagramFeed(limit = 12): Promise<InstagramFeedItem[]> {
  const { data, error } = await supabase
    .from("instagram_feeds")
    .select("id, ig_media_id, media_type, caption, permalink, posted_at, media_urls, media_item_types, thumbnail_url")
    .order("posted_at", { ascending: false })
    .limit(limit);
  if (error || !data) return [];
  return data as InstagramFeedItem[];
}

// HOTFIX-147.11(사용자 신고 — "썸네일 호버 자동 슬라이드가 작동 안 함"):
// 갤러리 게시판 카드는 body_json에 인스타그램 embed 노드(permalink)만
// 갖고 있고 실제 캐러셀 이미지 목록(media_urls)은 instagram_feeds에
// 있다 — NativeInstagramEmbed.tsx가 게시글 "본문"에서 이미 하던
// permalink→shortcode→instagram_feeds 매칭을, 목록 카드 여러 개를 한
// 번에 처리하도록 배치로 확장한 것뿐(같은 매칭 로직 재사용).
export async function fetchInstagramFeedsByShortcodes(
  shortcodes: string[],
): Promise<Map<string, InstagramFeedItem>> {
  const unique = Array.from(new Set(shortcodes.filter(Boolean)));
  const map = new Map<string, InstagramFeedItem>();
  if (unique.length === 0) return map;

  const orFilter = unique.map((code) => `permalink.ilike.%${code}%`).join(",");
  const { data, error } = await supabase
    .from("instagram_feeds")
    .select("id, ig_media_id, media_type, caption, permalink, posted_at, media_urls, media_item_types, thumbnail_url")
    .or(orFilter);
  if (error || !data) return map;

  for (const row of data as InstagramFeedItem[]) {
    const code = row.permalink ? extractInstagramShortcode(row.permalink) : null;
    if (code) map.set(code, row);
  }
  return map;
}
