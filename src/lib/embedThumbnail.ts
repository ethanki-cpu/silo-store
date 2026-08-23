import { extractYoutubeId, findFirstEmbedRef, type JSONContent } from "./blockEditorCore";
import { rehostUrlToR2 } from "./r2Server";

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
    //
    // HOTFIX(실사용 신고 — "게시글 목록 썸네일이 다 안 나온다", 실제로 전체
    // 285개 글 중 248개의 featured_image_url이 scontent-*.cdninstagram.com
    // 직링크였다): Instagram og:image URL은 서명(`oe=` 만료 파라미터)이
    // 걸려 있고 다른 도메인에서 <img src>로 직접 불러오면 핫링크 보호에도
    // 걸린다 — 저장 시점엔 한동안 보이다가 시간이 지나면 전부 깨진다. 이제
        // og:image를 찾자마자 그 자리에서 다운로드해 R2에 우리 소유 사본으로
    // 올리고, 그 R2 URL을 돌려준다 — instagram_feeds(EPIC-143 네이티브
    // 피드)와 동일한 "원본을 직접 링크하지 않고 우리가 영구 보관" 원칙.
    // R2 업로드가 실패하면(환경변수 누락 등) 최후 수단으로 원본 URL이라도
    // 돌려준다(당장은 보이다가 나중에 깨지더라도, 완전히 썸네일이 없는
    // 것보다는 낫다는 기존 동작 유지).
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
