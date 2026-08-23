import { supabase } from "@/lib/supabaseClient";

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
