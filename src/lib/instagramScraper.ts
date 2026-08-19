// EPIC-133: 비공식 서버 사이드 스크래핑으로 인스타그램 게시물의 실제 미디어
// (이미지/영상/캐러셀)를 추출한다. Graph API 앱 토큰이 필요 없는 대신 —
// src/lib/embedThumbnail.ts의 instagram og:image 스크래핑과 동일한 제약을
// 그대로 물려받는다: 공개 permalink HTML만 읽을 수 있고, Instagram이 봇
// 트래픽을 막거나 마크업을 바꾸면 실패할 수 있어 best-effort로 취급한다
// (실패 시 null — 호출부가 "미디어 없음"으로 자연히 처리).
//
// 서버 전용(fetch를 직접 하므로) — 클라이언트에서는 /api/instagram-post를
// 통해 호출한다(CORS + SSRF 방지를 위해 서버가 대신 요청).
//
// HOTFIX-134에서 진단된 대로 Instagram CDN 미디어 URL은 서명(`oe=` 만료
// 파라미터 등)이 걸려 있어 시간이 지나면 403이 난다 — 그래서 추출 결과를
// DB 등에 영구 캐싱하지 않고, 매 요청마다 새로 스크래핑하는 것이 이 모듈의
// 전제다(호출부도 이 전제를 지켜야 한다).

export type InstagramMediaItem = { type: "image" | "video"; url: string };

// 평범한 브라우저로 위장하지 않으면 Instagram이 로그인 월/차단 페이지를
// 내려보내는 경우가 많다(이 리포에서 이미 여러 차례 확인된 제약 —
// embedThumbnail.ts 참고). 실제 최신 데스크톱 Chrome UA를 그대로 사용한다.
const BROWSER_USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";

function unescapeJsonString(raw: string): string {
  return raw.replace(/\\u0026/g, "&").replace(/\\\//g, "/").replace(/&amp;/g, "&");
}

function extractAllMetaContents(html: string, property: string): string[] {
  const pattern = new RegExp(
    `<meta[^>]+property=["']${property}["'][^>]+content=["']([^"']+)["']|<meta[^>]+content=["']([^"']+)["'][^>]+property=["']${property}["']`,
    "gi",
  );
  const out: string[] = [];
  let m: RegExpExecArray | null;
  while ((m = pattern.exec(html)) !== null) {
    const content = m[1] ?? m[2];
    if (content) out.push(unescapeJsonString(content));
  }
  return out;
}

// 캐러셀(여러 장) 게시물은 서버 렌더 HTML 안에 `edge_sidecar_to_children`
// 형태의 인라인 JSON(`__a=1` 응답과 동일 계열의 스키마)이 남아있는 경우가
// 있다 — 있으면 이미지/영상이 섞인 캐러셀도 순서·타입까지 정확히 잡아낼 수
// 있어 og:image보다 우선 시도한다. Instagram이 SSR 페이로드를 바꾸면 이
// 정규식은 그냥 매치가 안 되고(에러 없이) 다음 폴백으로 넘어간다.
function extractSidecarCarousel(html: string): InstagramMediaItem[] | null {
  const sidecarStart = html.indexOf("edge_sidecar_to_children");
  if (sidecarStart === -1) return null;

  // sidecar 블록부터 적당히 넉넉한 구간만 잘라 정규식 비용을 줄인다 —
  // 캐러셀은 보통 10장 제한이라 이 정도면 전체 노드가 다 들어온다.
  const chunk = html.slice(sidecarStart, sidecarStart + 50000);
  const nodePattern = /"is_video":(true|false)[^}]*?"display_url":"([^"]+)"|"display_url":"([^"]+)"[^}]*?"is_video":(true|false)/g;
  const videoUrlPattern = /"video_url":"([^"]+)"/g;

  const videoUrls: string[] = [];
  let vm: RegExpExecArray | null;
  while ((vm = videoUrlPattern.exec(chunk)) !== null) {
    videoUrls.push(unescapeJsonString(vm[1]));
  }

  const items: InstagramMediaItem[] = [];
  let videoIndex = 0;
  let m: RegExpExecArray | null;
  while ((m = nodePattern.exec(chunk)) !== null) {
    const isVideo = (m[1] ?? m[4]) === "true";
    const displayUrl = unescapeJsonString(m[2] ?? m[3]);
    if (isVideo) {
      items.push({ type: "video", url: videoUrls[videoIndex] ?? displayUrl });
      videoIndex += 1;
    } else {
      items.push({ type: "image", url: displayUrl });
    }
  }

  return items.length > 0 ? items : null;
}

// 캐러셀이 아닌 단일 이미지/영상 게시물 — og:video가 있으면 영상, 없으면
// og:image(들)를 이미지로 취급한다. 일부 환경에서 og:image가 여러 개
// 내려오기도 해(예: 프로필 사진 등 부가 이미지) 첫 번째만 사용한다.
function extractSingleFromMetaTags(html: string): InstagramMediaItem | null {
  const videos = extractAllMetaContents(html, "og:video");
  if (videos[0]) return { type: "video", url: videos[0] };

  const images = extractAllMetaContents(html, "og:image");
  if (images[0]) return { type: "image", url: images[0] };

  return null;
}

export async function scrapeInstagramPost(permalink: string): Promise<InstagramMediaItem[] | null> {
  let html: string;
  try {
    const res = await fetch(permalink, {
      headers: {
        "User-Agent": BROWSER_USER_AGENT,
        "Accept-Language": "ko-KR,ko;q=0.9,en;q=0.8",
      },
      redirect: "follow",
    });
    if (!res.ok) return null;
    html = await res.text();
  } catch {
    return null;
  }

  const carousel = extractSidecarCarousel(html);
  if (carousel && carousel.length > 0) return carousel;

  const single = extractSingleFromMetaTags(html);
  return single ? [single] : null;
}
