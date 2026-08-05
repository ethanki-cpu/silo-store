import { extractYoutubeId, findFirstEmbedRef, type JSONContent } from "./blockEditorCore";

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
    // Instagram 공식 oEmbed(graph.facebook.com)는 앱 액세스 토큰이 필요해
    // 이 리포에서는 쓸 수 없다(EPIC-079-TIPTAP-FIX-V2/PHASE-5 조사 결과와
    // 동일한 제약) — 대신 게시물 permalink 자체(공개 HTML 페이지)의
    // og:image 메타 태그를 읽는다. Instagram이 봇 트래픽을 차단하거나
    // 로그인 월을 띄우는 게시물/환경에서는 실패할 수 있어(이미 이 코드베이스
    // 곳곳에서 확인된 한계) best-effort로만 취급한다 — 실패하면 조용히
    // null(호출부가 "대표 이미지 없음"으로 자연히 처리).
    try {
      const res = await fetch(url, {
        headers: { "User-Agent": "Mozilla/5.0 (compatible; SiloStoreBot/1.0)" },
      });
      if (!res.ok) return null;
      const html = await res.text();
      const match =
        html.match(/<meta property="og:image" content="([^"]+)"/) ??
        html.match(/<meta content="([^"]+)" property="og:image"/);
      return match ? match[1].replace(/&amp;/g, "&") : null;
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
