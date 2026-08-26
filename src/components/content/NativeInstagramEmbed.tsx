"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { InstagramFeedPost } from "@/components/content/InstagramFeedPost";
import { InstagramMediaSlider } from "@/components/content/InstagramMediaSlider";
import type { InstagramFeedItem } from "@/lib/instagramFeed";
import { extractInstagramShortcode } from "@/lib/instagramShortcode";

// EPIC-143-후속(사용자 지시 — "인스타그램 피드를 새 게시글로 만드는 게
// 아니라, 기존/향후 게시글 '본문'에 이미 삽입된 인스타그램 임베드를 사일로
// 네이티브 UI로 바꿔치기하라"): 게시글 본문에 저장된
// `<blockquote class="instagram-media" data-instgrm-permalink="...">`
// (Instagram 공식 embed.js 위젯 마크업, src/lib/instagramEmbed.ts가 지금까지
// 이걸 iframe으로 부풀렸다)를 이 컴포넌트로 교체한다
// (src/lib/nativeInstagramEmbed.ts가 실제 DOM 치환+마운트를 담당).
//
// **중요한 기술적 한계(사용자에게 별도 설명함)**: Instagram Graph API는
// "우리 소유 계정의 미디어 목록"만 조회할 수 있고, 임의의 permalink URL로
// 다른 계정의 게시물을 즉석에서 조회하는 공식 API는 없다 — 그래서:
// 1) 이 permalink가 사일로 스토어 계정(_silo_store)의 게시물이고 이미
//    `/admin/instagram`에서 동기화된 적이 있으면 → instagram_feeds(R2 캐시)를
//    찾아 완전히 네이티브로 렌더링(빠름, Instagram 요청 없음).
// 2) 그 외(아직 동기화 전인 우리 게시물, 또는 애초에 다른 계정 게시물)는 →
//    이미 이 저장소에 있던 EPIC-133의 가벼운 공개 og:meta 스크래핑+실시간
//    프록시(InstagramMediaSlider, 영구 저장 없음 — 서명 URL 만료 문제를
//    구조적으로 피하려고 설계됨)로 폴백한다. 새로운 비공식 스크래핑을 추가로
//    만든 게 아니라 이미 있던 걸 여기서 처음 실제로 연결한 것뿐이다.
export function NativeInstagramEmbed({ permalink }: { permalink: string }) {
  const [status, setStatus] = useState<"loading" | "native" | "fallback">("loading");
  const [item, setItem] = useState<InstagramFeedItem | null>(null);

  useEffect(() => {
    let cancelled = false;
    const shortcode = extractInstagramShortcode(permalink);
    if (!shortcode) {
      setStatus("fallback");
      return;
    }
    supabase
      .from("instagram_feeds")
      .select("id, ig_media_id, media_type, caption, permalink, posted_at, media_urls, media_item_types, thumbnail_url")
      .ilike("permalink", `%${shortcode}%`)
      .maybeSingle()
      .then(({ data }) => {
        if (cancelled) return;
        if (data) {
          setItem(data as InstagramFeedItem);
          setStatus("native");
        } else {
          setStatus("fallback");
        }
      });
    return () => {
      cancelled = true;
    };
  }, [permalink]);

  if (status === "loading") {
    return <div className="my-4 h-[300px] max-w-md animate-pulse rounded-lg bg-gray-100" />;
  }
  if (status === "native" && item) {
    return (
      <div className="my-4 max-w-md">
        <InstagramFeedPost item={item} variant="embed" />
      </div>
    );
  }
  return (
    <div className="my-4 max-w-md">
      <InstagramMediaSlider permalink={permalink} />
    </div>
  );
}
