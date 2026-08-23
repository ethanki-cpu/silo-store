import { extractYoutubeId, findFirstEmbedRef, type JSONContent } from "./blockEditorCore";
import { rehostUrlToR2 } from "./r2Server";
import { supabase } from "./supabaseClient";

function extractInstagramShortcode(url: string): string | null {
  const m = url.match(/instagram\.com\/(?:p|reel|tv)\/([A-Za-z0-9_-]+)/);
  return m ? m[1] : null;
}

// EPIC-079-HOTFIX-3: "대표 이미지를 지정하지 않고 임베드만 넣어도 썸네일로
// 쓸 수 있게 감지해달라"는 요청 — provider별 실제 썸네일 URL은 예측 가능한
// 정적 CDN 규칙(youtube)도 있고, 공개 API 응답에서 읽어야 하는 것(vimeo
// oEmbed)도 있고, 페이지 자체를 읽어 메타 태그를 스크래핑해야 하는 것
// (instagram — 공식 oEmbed는 앱 토큰이 있어야 하지만, 게시물 permalink
// HTML 자체는 공개 페이지라 og:image 메타 태그는 별도 인증 없이 읽을 수
// 있다)도 있어 전부 다르다. 이 함수 하나로 provider 차이를 흡수한다.
//
// 서버 전용(fetch를 직접 하므로) — 클라이언트에서는 /api/embed-thumbnail을
// 통해 호출한다(CORS + SSRF 방지를 위해 서버가 대신 요청).
export async function resolveEmbedThumbnailUrl(
  provider: string,
  url: string,
): Promise<string | null> {
  if (provider === "youtube") {
    const id = extractYoutubeId(url);
    return id ? `https://img.youtube.com/vi/${id}/hqdefault.jpg` : null;
  }

  if (provider === "vimeo") {
    try {
      const res = await fetch(`https://vimeo.com/api/oembed.json?url=${encodeURIComponent(url)}`);
      if (!res.ok) return null;
      const data = (await res.json()) as { thumbnail_url?: string };
      return typeof data.thumbnail_url === "string" ? data.thumbnail_url : null;
    } catch {
      return null;
    }
  }

  if (provider === "instagram") {
    // HOTFIX-143.3(실사용 재확인, 2026-08-24): Instagram이 페이지 렌더링
    // 방식을 통째로 바꿔서(Comet 프레임워크로 완전 이전) 서버가 fetch()로
    // 받는 최초 HTML에 이제 og:image 메타 태그 자체가 아예 없다(실측
    // 확인 — UA를 아무리 바꿔도 마찬가지, 임베드 페이지도 동일) — 아래
    // og:image 스크래핑은 더 이상 사실상 항상 실패한다. 대신 EPIC-143
    // Graph API 파이프라인(`/admin/instagram` 동기화, 공식 API라 이 제약과
    // 무관)이 이미 채워둔 `instagram_feeds`를 먼저 확인한다 — 사일로 스토어
    // 자사 계정(_silo_store) 게시물이면 여기서 100% 안정적으로 찾는다.
    const shortcode = extractInstagramShortcode(url);
    if (shortcode) {
      const { data } = await supabase
        .from("instagram_feeds")
        .select("thumbnail_url, media_urls")
        .ilike("permalink", `%${shortcode}%`)
        .maybeSingle();
      const cached = data?.thumbnail_url ?? data?.media_urls?.[0] ?? null;
      if (cached) return cached;
    }

    // 폴백: 사일로 스토어 소유가 아닌 게시물이거나 아직 동기화 전인
    // 경우 — 예전 방식대로 og:image 스크래핑을 시도한다(위 이유로 현재는
    // 거의 항상 실패하지만, Instagram이 향후 이 응답을 다시 바꿀 수도
    // 있어 완전히 제거하지 않고 best-effort 폴백으로 남겨둔다). 성공하면
    // R2에 재호스팅해 서명 만료/핫링크 문제를 피한다.
    try {
      const res = await fetch(url, {
        headers: { "User-Agent": "Mozilla/5.0 (compatible; SiloStoreBot/1.0)" },
      });
      if (!res.ok) return null;
      const html = await res.text();
      const match =
        html.match(/<meta property="og:image" content="([^"]+)"/) ??
        html.match(/<meta content="([^"]+)" property="og:image"/);
      const ogImageUrl = match ? match[1].replace(/&amp;/g, "&") : null;
      if (!ogImageUrl) return null;
      const r2Url = await rehostUrlToR2(ogImageUrl, false, "embed-thumbnails/instagram");
      return r2Url ?? ogImageUrl;
    } catch {
      return null;
    }
  }

  return null;
}

/** 문서에 대표 이미지로 지정된 것이 전혀 없을 때(저장 시점 최후 폴백) —
 * 첫 번째 임베드를 찾아 그 썸네일을 resolve한다. */
export async function resolveFallbackEmbedThumbnail(
  json: JSONContent | null | undefined,
): Promise<string | null> {
  const ref = findFirstEmbedRef(json);
  if (!ref) return null;
  return resolveEmbedThumbnailUrl(ref.provider, ref.url);
}
