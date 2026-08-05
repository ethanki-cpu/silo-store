// EPIC-053.1: Block Editor의 "정본(source of truth)"은 Tiptap의
// ProseMirror JSON(posts.body_json)이다 — Notion 스타일 커스텀 Block[]
// 트리를 별도로 유지하지 않는다(EPIC-053이 만든 src/lib/blocks.tsx의
// 병행 타입 시스템은 끝내 에디터와 연결되지 않은 죽은 코드였다 — 운영
// 리뷰 P1 참고). ProseMirror JSON 자체가 이미 "타입 + 속성을 가진 블록
// 트리"이므로, Tiptap 권장 패턴을 그대로 따르는 것이 커스텀 트리를 새로
// 발명하는 것보다 안전하고 유지보수하기 쉽다.
//
// 이 파일은 서버(Route Handler, generateHTML)와 클라이언트(BlockEditor)
// 양쪽에서 동일하게 import한다 — 스키마(renderHTML/parseHTML)만 정의하고
// React NodeView는 붙이지 않는다(NodeView는 BlockEditor.tsx에서 클라이언트
// 전용으로 확장). generateHTML은 NodeView를 쓰지 않고 renderHTML만
// 사용하므로 이 분리가 서버/클라이언트 동일 스키마를 보장한다.

import { Node, mergeAttributes, type JSONContent } from "@tiptap/core";
import StarterKit from "@tiptap/starter-kit";
import Link from "@tiptap/extension-link";
import Underline from "@tiptap/extension-underline";
import TextAlign from "@tiptap/extension-text-align";
import { TextStyle } from "@tiptap/extension-text-style";
import Highlight from "@tiptap/extension-highlight";
import { Color } from "@tiptap/extension-color";
import TaskList from "@tiptap/extension-task-list";
import TaskItem from "@tiptap/extension-task-item";
import { generateHTML } from "@tiptap/html";
import { sanitizeHtml } from "./sanitize";

export type { JSONContent };

// Tiptap의 renderHTML은 중첩 배열(DOMOutputSpec, ProseMirror의 toDOM 규격)을
// 반환해야 하는데 그 타입이 @tiptap/core 공개 API로 export되어 있지 않아
// 리터럴을 직접 그 타입으로 좁힐 수 없다 — 이 얇은 헬퍼로 한 곳에서만
// any를 허용한다(renderHTML 콜백마다 캐스팅을 반복하지 않도록).
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function renderSpec(spec: unknown): any {
  return spec;
}

// ============================================================
// FigureImage — 게시글 내 이미지 1장(캡션/ALT/대표이미지 지원).
// 기본 @tiptap/extension-image 대신 이것 하나로 통일한다(이미지 표현이
// 두 가지로 나뉘면 렌더링/새니타이즈/GC 스캔 로직이 전부 분기해야 함).
// ============================================================

export type FigureImageAttrs = {
  src: string;
  path: string | null;
  alt: string;
  caption: string;
  featured: boolean;
};

export const FigureImage = Node.create({
  name: "figureImage",
  group: "block",
  atom: true,
  draggable: true,

  addAttributes() {
    return {
      src: { default: null },
      path: { default: null },
      alt: { default: "" },
      caption: { default: "" },
      featured: { default: false },
    };
  },

  parseHTML() {
    return [
      {
        tag: "figure[data-type='figure-image']",
        getAttrs: (el) => {
          const figure = el as HTMLElement;
          const img = figure.querySelector("img");
          const figcaption = figure.querySelector("figcaption");
          return {
            src: img?.getAttribute("src") ?? null,
            alt: img?.getAttribute("alt") ?? "",
            caption: figcaption?.textContent ?? "",
            featured: figure.getAttribute("data-featured") === "true",
          };
        },
      },
      // 레거시 호환: EPIC-052/053에서 저장된 순수 <img>도 이미지 1장으로 인식.
      {
        tag: "img[src]:not(figure img)",
        getAttrs: (el) => {
          const img = el as HTMLImageElement;
          return { src: img.getAttribute("src"), alt: img.getAttribute("alt") ?? "" };
        },
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    const { src, alt, caption, featured } = HTMLAttributes as FigureImageAttrs;
    return renderSpec([
      "figure",
      mergeAttributes({ "data-type": "figure-image", "data-featured": String(!!featured) }),
      ["img", { src, alt: alt || "", loading: "lazy" }],
      ...(caption ? [["figcaption", {}, caption]] : []),
    ]);
  },
});

// ============================================================
// Gallery — 여러 장 이미지(그리드) + Lightbox 렌더링 대상.
// ============================================================

export type GalleryImageAttrs = { src: string; path: string | null; alt: string; caption: string };

export const GalleryBlock = Node.create({
  name: "gallery",
  group: "block",
  atom: true,
  draggable: true,

  addAttributes() {
    return {
      images: { default: [] as GalleryImageAttrs[] },
      columns: { default: 3 },
    };
  },

  parseHTML() {
    return [{ tag: "div[data-type='gallery']" }];
  },

  renderHTML({ HTMLAttributes }) {
    const images = (HTMLAttributes.images as GalleryImageAttrs[]) ?? [];
    const columns = (HTMLAttributes.columns as number) ?? 3;
    return renderSpec([
      "div",
      mergeAttributes({
        "data-type": "gallery",
        class: "gallery",
        style: `display:grid;grid-template-columns:repeat(${columns},1fr);gap:8px`,
      }),
      ...images.map((img) => [
        "figure",
        {},
        ["img", { src: img.src, alt: img.alt || "", loading: "lazy" }],
        ...(img.caption ? [["figcaption", {}, img.caption]] : []),
      ]),
    ]);
  },
});

// ============================================================
// Embed — Youtube/Vimeo/Instagram/Spotify/Google Maps 공용 노드.
// ============================================================

// EPIC-079-TIPTAP-FIX-V2: twitter(X)/naverBlog/naverMap 3종 추가.
// naverMap은 googleMaps와 달리 일반 공유 링크→embed URL 정규화 규칙이 없다
// (Naver는 지도 페이지 자체를 X-Frame-Options: DENY로 막아둬서, "링크 하나
// 붙여넣기"로는 애초에 만들 수 있는 embed URL이 없다 — 직접 확인 완료).
// 대신 사용자가 네이버 지도 "퍼가기"에서 받은 <iframe> 코드를 통째로 본문에
// 붙여넣으면 parseHTML의 raw-iframe 캡처 규칙이 그 src를 그대로 가져와
// 쓴다("naverMap"/미인식 도메인은 "raw"). googleMaps도 같은 붙여넣기 경로를
// 지원하지만 기존처럼 일반 공유 링크 타이핑도 계속 지원한다(embedSrc가
// 이미 embed URL이면 그대로 통과시키므로 두 입력 경로가 자연히 호환됨).
export type EmbedProvider =
  | "youtube"
  | "vimeo"
  | "instagram"
  | "spotify"
  | "googleMaps"
  | "twitter"
  | "naverBlog"
  | "naverMap"
  | "raw"
  | "customHtml";
// EPIC-079-PHASE-3: 플랫폼별 렌더링 커스터마이징 — youtube는 화면 비율,
// instagram은 캡션(본문) 노출 여부를 이 두 속성으로 조절한다. 둘 다
// optional/기본값 있음 — 값이 없으면 기존과 동일하게 동작(하위 호환).
// EPIC-079-PHASE-4: instagram 위젯의 너비(width)와, URL 자동 인식이 안
// 되거나 아이콘/캡션 노출 등 공식 위젯이 지원하지 않는 세부 제어가 필요한
// 경우를 위한 "HTML 코드 직접 삽입"(customHtml, rawHtml) 두 속성을 추가.
export type EmbedAspectRatio = "16:9" | "9:16";
// Instagram 공식 위젯이 실제로 존중하는 안전 범위 — 이 범위 밖 값은
// 위젯이 무시하거나 레이아웃이 깨질 수 있어(공식 문서 기준) clamp한다.
export const INSTAGRAM_WIDTH_MIN = 326;
export const INSTAGRAM_WIDTH_MAX = 540;
export function clampInstagramWidth(width: number | null): number {
  if (!width) return INSTAGRAM_WIDTH_MAX;
  return Math.min(Math.max(width, INSTAGRAM_WIDTH_MIN), INSTAGRAM_WIDTH_MAX);
}
export type EmbedAttrs = {
  provider: EmbedProvider;
  url: string;
  caption: string;
  height: number | null;
  aspectRatio: EmbedAspectRatio | null;
  hideCaption: boolean;
  // instagram 전용 — 위젯 너비(px, 326~540). null이면 기본값(540).
  width: number | null;
  // customHtml 전용 — 사용자가 직접 붙여넣은 임베드 HTML(저장 전 sanitize됨).
  rawHtml: string;
};

export function extractYoutubeId(url: string): string | null {
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/,
    /youtube\.com\/shorts\/([a-zA-Z0-9_-]{11})/,
  ];
  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) return match[1];
  }
  return null;
}

export function extractVimeoId(url: string): string | null {
  const match = url.match(/vimeo\.com\/(\d+)/);
  return match ? match[1] : null;
}

/** instagram.com/{p|reel|tv}/{shortcode} 형태에서 종류+shortcode를 추출한다. */
export function extractInstagramPost(url: string): { kind: "p" | "reel" | "tv"; id: string } | null {
  const match = url.match(/instagram\.com\/(p|reel|tv)\/([A-Za-z0-9_-]+)/);
  if (!match) return null;
  return { kind: match[1] as "p" | "reel" | "tv", id: match[2] };
}

/** twitter.com/x.com/{user}/status/{id} 형태에서 트윗 ID를 추출한다. */
export function extractTweetId(url: string): string | null {
  const m = url.match(/(?:twitter|x)\.com\/[^/?#]+\/status(?:es)?\/(\d+)/);
  return m ? m[1] : null;
}

/**
 * blog.naver.com/{blogId}/{logNo} 또는
 * blog.naver.com/PostView.naver?blogId=&logNo= 형태에서 블로그 글을
 * 식별하는 두 값을 추출한다.
 */
export function extractNaverBlogPost(url: string): { blogId: string; logNo: string } | null {
  try {
    const u = new URL(url);
    const blogId = u.searchParams.get("blogId");
    const logNo = u.searchParams.get("logNo");
    if (blogId && logNo) return { blogId, logNo };
  } catch {
    // URL 파싱 실패는 아래 경로 기반 매칭으로 폴백.
  }
  const m = url.match(/blog\.naver\.com\/([^/?#]+)\/(\d+)/);
  return m ? { blogId: m[1], logNo: m[2] } : null;
}

// EPIC-079-PHASE-3: EmbedConfigModal이 사용자가 붙여넣은 URL 하나만 보고
// 플랫폼을 자동으로 알아내기 위한 판별기 — 기존 provider별 추출 함수를
// 순서대로 시도해 처음 매치되는 provider를 돌려준다. 어느 것도 매치되지
// 않으면 null(모달이 "인식할 수 없는 URL"로 안내, 삽입 버튼 비활성화).
export function detectProvider(url: string): EmbedProvider | null {
  if (!url.trim()) return null;
  if (extractYoutubeId(url)) return "youtube";
  if (extractVimeoId(url)) return "vimeo";
  if (extractInstagramPost(url)) return "instagram";
  if (extractTweetId(url)) return "twitter";
  if (extractNaverBlogPost(url)) return "naverBlog";
  if (/open\.spotify\.com/i.test(url)) return "spotify";
  if (/google\.[a-z.]+\/maps|\/maps\/embed/i.test(url)) return "googleMaps";
  if (/naver\.com|naver\.me/i.test(url)) return "naverMap";
  return null;
}

/**
 * Google Maps 공유 링크를 embed 가능한 URL로 정규화한다. 이미 embed
 * URL(`/maps/embed` 또는 `output=embed`)이면 그대로 쓰고, 일반
 * google.com/maps 링크면 `output=embed`를 붙인다(공식 Embed API 키 없이도
 * 동작하는 잘 알려진 방법). maps.app.goo.gl 같은 단축 링크는 리다이렉트를
 * 서버 없이 풀 수 없어 지원 범위 밖 — null을 반환해 링크 카드로 폴백한다.
 */
export function normalizeGoogleMapsEmbedUrl(url: string): string | null {
  if (!url) return null;
  if (/\/maps\/embed/.test(url) || /[?&]output=embed/.test(url)) return url;
  if (/google\.[a-z.]+\/maps/i.test(url)) {
    const sep = url.includes("?") ? "&" : "?";
    return `${url}${sep}output=embed`;
  }
  return null;
}

export function embedSrc(provider: EmbedProvider, url: string): string | null {
  if (!url) return null;
  switch (provider) {
    case "youtube": {
      const id = extractYoutubeId(url);
      return id ? `https://www.youtube.com/embed/${id}` : null;
    }
    case "vimeo": {
      const id = extractVimeoId(url);
      return id ? `https://player.vimeo.com/video/${id}` : null;
    }
    case "spotify":
      return `https://open.spotify.com/embed?url=${encodeURIComponent(url)}`;
    case "googleMaps":
      return normalizeGoogleMapsEmbedUrl(url);
    case "instagram": {
      // EPIC-079-PHASE-2 후속 핫픽스: 이전엔 여기서 `/embed/captioned/`
      // 직접 iframe 엔드포인트를 반환했는데, 그 응답 헤더에
      // `X-Frame-Options: DENY`가 있어 어떤 사이트에도 iframe으로 못 들어가
      // 항상 "차단됨" 화면만 떴다(실제로 한 번도 동작한 적이 없었음). 이제
      // 이 함수는 iframe src가 아니라 정규화된 permalink를 반환하고,
      // renderHTML()이 이를 `data-instgrm-permalink`로 써서 공식
      // blockquote+embed.js 위젯 방식으로 렌더링한다(src/lib/instagramEmbed.ts).
      const post = extractInstagramPost(url);
      return post ? `https://www.instagram.com/${post.kind}/${post.id}/` : null;
    }
    case "twitter": {
      // platform.twitter.com/embed/Tweet.html은 확인 결과 X-Frame-Options가
      // 없어(공식 임베드 iframe 엔드포인트) instagram과 달리 직접 iframe으로
      // 정상 동작한다.
      const id = extractTweetId(url);
      return id ? `https://platform.twitter.com/embed/Tweet.html?id=${id}` : null;
    }
    case "naverBlog": {
      // blog.naver.com/PostView.naver도 확인 결과 X-Frame-Options가 없다.
      const post = extractNaverBlogPost(url);
      return post
        ? `https://blog.naver.com/PostView.naver?blogId=${encodeURIComponent(post.blogId)}&logNo=${encodeURIComponent(post.logNo)}`
        : null;
    }
    case "naverMap":
    case "raw":
      // 둘 다 URL 변환 규칙이 없다 — parseHTML의 raw-iframe 캡처가 이미
      // 완성된 embed URL(사용자가 "퍼가기"로 받은 iframe의 src)을 그대로
      // url에 담아두므로 여기서는 그 값을 그대로 돌려주기만 한다.
      return url || null;
    case "customHtml":
      // rawHtml을 그대로 DOM에 주입하는 별도 경로를 쓴다(renderHTML 참고) —
      // iframe src 개념이 없어 항상 null.
      return null;
    default:
      return null;
  }
}

/** embedSrc()의 역변환 — 저장된 HTML(body_json 없는 레거시 글)을 다시 열 때 iframe src로부터 원본 URL/높이를 복원한다. */
function reverseEmbedSrc(provider: EmbedProvider, src: string): string {
  if (!src) return "";
  switch (provider) {
    case "youtube": {
      const m = src.match(/youtube\.com\/embed\/([a-zA-Z0-9_-]{11})/);
      return m ? `https://www.youtube.com/watch?v=${m[1]}` : src;
    }
    case "vimeo": {
      const m = src.match(/vimeo\.com\/video\/(\d+)/);
      return m ? `https://vimeo.com/${m[1]}` : src;
    }
    case "spotify": {
      try {
        return new URL(src).searchParams.get("url") ?? src;
      } catch {
        return src;
      }
    }
    case "instagram": {
      const m = src.match(/instagram\.com\/(p|reel|tv)\/([A-Za-z0-9_-]+)/);
      return m ? `https://www.instagram.com/${m[1]}/${m[2]}/` : src;
    }
    case "googleMaps":
      return src.replace(/[?&]output=embed/, "");
    case "twitter": {
      const m = src.match(/[?&]id=(\d+)/);
      return m ? `https://twitter.com/i/status/${m[1]}` : src;
    }
    case "naverBlog": {
      try {
        const u = new URL(src);
        const blogId = u.searchParams.get("blogId");
        const logNo = u.searchParams.get("logNo");
        return blogId && logNo ? `https://blog.naver.com/${blogId}/${logNo}` : src;
      } catch {
        return src;
      }
    }
    case "naverMap":
    case "raw":
      return src;
    default:
      return src;
  }
}

const DEFAULT_EMBED_HEIGHT: Record<EmbedProvider, number> = {
  youtube: 315,
  vimeo: 315,
  spotify: 152,
  googleMaps: 350,
  instagram: 550,
  twitter: 550,
  naverBlog: 600,
  naverMap: 400,
  raw: 400,
  customHtml: 400,
};

export const EmbedBlock = Node.create({
  name: "embed",
  group: "block",
  atom: true,
  draggable: true,

  addAttributes() {
    return {
      provider: { default: "youtube" },
      url: { default: "" },
      caption: { default: "" },
      // EPIC-079: "어디까지 보이게 할 것인지" 뷰 영역 조절 — null이면
      // DEFAULT_EMBED_HEIGHT[provider]를 쓴다.
      height: { default: null },
      // EPIC-079-PHASE-3: youtube 전용 — "16:9" | "9:16". null이면 기존처럼
      // 고정 높이(height) iframe으로 렌더링(하위 호환).
      aspectRatio: { default: null },
      // EPIC-079-PHASE-3: instagram 전용 — true면 공식 위젯의 본문(캡션)을
      // 숨긴다(data-instgrm-captioned 속성을 아예 빼서 표현).
      hideCaption: { default: false },
      // EPIC-079-PHASE-4: instagram 전용 — 위젯 너비(px). null이면 기본(540).
      width: { default: null },
      // EPIC-079-PHASE-4: customHtml 전용 — 사용자가 붙여넣은 원본 임베드 HTML.
      rawHtml: { default: "" },
    };
  },

  parseHTML() {
    return [
      {
        tag: "div[data-type='embed']",
        // 레거시 HTML round-trip: provider/url/caption/height는 실제 HTML
        // 속성으로 저장되지 않고 자식 요소(iframe src, <p class="embed-
        // caption">)로만 표현되므로, 기본 Tiptap 파서(JS 속성명과 동일한
        // HTML 속성을 찾음)로는 절대 복원되지 않는다 — 항상 "youtube"/빈
        // URL로 리셋되는 버그가 있었다. 직접 역변환한다.
        getAttrs: (el) => {
          const div = el as HTMLElement;
          const provider = (div.getAttribute("data-provider") as EmbedProvider | null) ?? "youtube";
          const iframe = div.querySelector("iframe");
          // EPIC-079-PHASE-2 후속 핫픽스: instagram은 더 이상 iframe이 아니라
          // blockquote.instagram-media(+data-instgrm-permalink)로 저장된다 —
          // 다만 그 사이(EPIC-079-PHASE-1~이번 핫픽스 전)에 저장된 글은 여전히
          // 깨진 iframe 형태라 iframe 분기를 먼저 시도해 하위 호환한다.
          const instagramBlockquote = div.querySelector("blockquote.instagram-media");
          const link = div.querySelector("a.link-card");
          const captionEl = div.querySelector("p.embed-caption");
          const heightAttr = iframe?.getAttribute("height");
          return {
            provider,
            url: iframe
              ? reverseEmbedSrc(provider, iframe.getAttribute("src") ?? "")
              : instagramBlockquote
              ? instagramBlockquote.getAttribute("data-instgrm-permalink") ?? ""
              : link?.getAttribute("href") ?? "",
            caption: captionEl?.textContent ?? "",
            height: heightAttr ? Number(heightAttr) : null,
            // EPIC-079-PHASE-3: 저장된 wrapper div의 data-* 속성에서 복원.
            aspectRatio: (div.getAttribute("data-aspect-ratio") as EmbedAspectRatio | null) ?? null,
            hideCaption: div.getAttribute("data-hide-caption") === "true",
            width: (() => {
              const w = div.getAttribute("data-embed-width");
              return w ? Number(w) : null;
            })(),
            rawHtml: div.getAttribute("data-raw-html") ?? "",
          };
        },
      },
      // EPIC-079-TIPTAP-FIX-V2: 구글 지도/네이버 지도의 "퍼가기" 공유 코드는
      // <iframe src="..."> 하나만 달랑 던져주는 형태라, 툴바의 URL 입력창을
      // 거치지 않고 사용자가 에디터에 그 코드를 직접 붙여넣는 경우가 있다
      // (특히 Naver Map은 URL 하나로는 embed URL을 만들 방법이 없어 — 지도
      // 페이지 자체가 X-Frame-Options: DENY라 확인함 — 이 붙여넣기가 사실상
      // 유일한 입력 경로다). 위 div[data-type='embed'] 규칙은 우리가 저장한
      // 마크업 전용이라 이 raw <iframe>은 안 잡히므로 별도 규칙을 추가한다.
      {
        tag: "iframe",
        getAttrs: (el) => {
          const iframe = el as HTMLIFrameElement;
          // 우리 자신이 저장한 div[data-type='embed'] 안의 iframe(스포티파이/
          // 유튜브/비메오/기타 provider)은 위 규칙이 이미 통째로 처리하므로
          // 여기서 다시 잡지 않는다 — false를 반환하면 다음 규칙/기본 처리로
          // 넘어간다(ProseMirror DOMParser 표준 동작).
          if (iframe.closest("div[data-type='embed']")) return false;
          const src = iframe.getAttribute("src");
          if (!src) return false;

          const provider: EmbedProvider = /google\.[a-z.]+\/maps|\/maps\/embed/i.test(src)
            ? "googleMaps"
            : /naver\.com|naver\.me/i.test(src)
            ? "naverMap"
            : "raw";

          const heightAttr = iframe.getAttribute("height");
          return {
            provider,
            url: src,
            caption: "",
            height: heightAttr ? Number(heightAttr) : null,
            aspectRatio: null,
            hideCaption: false,
          };
        },
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    const { provider, url, caption, height, aspectRatio, hideCaption, width, rawHtml } =
      HTMLAttributes as EmbedAttrs;
    const src = embedSrc(provider, url);
    const h = String(height ?? DEFAULT_EMBED_HEIGHT[provider]);
    const igWidth = clampInstagramWidth(width);

    const inner: unknown[] = provider === "customHtml"
      ? // EPIC-079-PHASE-4: 사용자가 직접 붙여넣은 임베드 HTML(rawHtml, 저장
        // 전 sanitize됨)을 그대로 담을 빈 placeholder만 만들고, 실제 주입은
        // 이 노드가 실제로 보이는 화면(PostBody/BlockEditor 미리보기)에서
        // src/lib/rawHtmlEmbed.ts가 data-raw-html 속성을 읽어 처리한다 —
        // renderHTML의 DOMOutputSpec은 문자열 children을 항상 escape하므로
        // (raw HTML을 그대로 넣을 방법이 없음) 이 우회가 필요하다.
        ["div", { "data-raw-html-embed": "" }]
      : !src
      ? [
          "a",
          { href: url, target: "_blank", rel: "noopener noreferrer", class: "link-card" },
          url || "링크",
        ]
      : provider === "spotify"
      ? ["iframe", { src, width: "100%", height: h, frameborder: "0", allow: "encrypted-media", loading: "lazy" }]
      : provider === "instagram"
      ? // EPIC-079-PHASE-2 후속 핫픽스: instagram.com이 /embed/*를
        // X-Frame-Options: DENY로 막아 직접 iframe이 항상 "차단됨"으로
        // 나오던 버그 — Instagram 공식 blockquote+embed.js 위젯 방식으로
        // 교체(src/lib/instagramEmbed.ts가 게시글이 실제로 보이는 화면에서
        // embed.js를 로드하고 이 blockquote를 실제 임베드로 변환한다).
        // EPIC-079-PHASE-3: hideCaption이 true면 공식 위젯이 본문(캡션)을
        // 숨기도록 data-instgrm-captioned 속성 자체를 뺀다(Instagram embed.js가
        // 이 속성의 유무로만 캡션 노출을 결정 — 별도 URL 파라미터 없음).
        [
          "blockquote",
          {
            class: "instagram-media",
            "data-instgrm-permalink": src,
            "data-instgrm-version": "14",
            ...(hideCaption ? {} : { "data-instgrm-captioned": "" }),
            // EPIC-079-PHASE-4: 이전엔 항상 326~540px 범위 style이었는데,
            // 이제 사용자가 그 범위 안에서 고른 정확한 너비(igWidth)로 고정.
            style: `background:#FFF; border:0; border-radius:3px; margin:1px; max-width:${igWidth}px; min-width:${igWidth}px; padding:0; width:99%;`,
          },
          [
            "a",
            { href: src, target: "_blank", rel: "noopener noreferrer" },
            "Instagram 게시물 보기",
          ],
        ]
      : provider === "youtube" && aspectRatio
      ? // EPIC-079-PHASE-3: "16:9"/"9:16" 화면 비율 선택 — 고정 높이(px)
        // iframe 대신, 비율을 유지한 채 너비에 맞춰 늘어나는 반응형 wrapper로
        // 렌더링한다(표준 "padding-trick" 대신 CSS aspect-ratio 사용, 최신
        // 브라우저 기준 더 간단하고 정확함). 9:16(쇼츠)은 세로로 길어 보이도록
        // 최대 너비도 함께 제한한다.
        [
          "div",
          {
            style: `position:relative; width:100%; max-width:${
              aspectRatio === "9:16" ? "360px" : "100%"
            }; aspect-ratio:${aspectRatio === "9:16" ? "9/16" : "16/9"};`,
          },
          [
            "iframe",
            {
              src,
              style: "position:absolute; inset:0; width:100%; height:100%;",
              frameborder: "0",
              allowfullscreen: "true",
              loading: "lazy",
            },
          ],
        ]
      : [
          "iframe",
          { src, width: "100%", height: h, frameborder: "0", allowfullscreen: "true", loading: "lazy" },
        ];

    return renderSpec([
      "div",
      mergeAttributes({
        "data-type": "embed",
        "data-provider": provider,
        class: "embed",
        ...(aspectRatio ? { "data-aspect-ratio": aspectRatio } : {}),
        ...(hideCaption ? { "data-hide-caption": "true" } : {}),
        ...(provider === "instagram" && width ? { "data-embed-width": String(igWidth) } : {}),
        ...(provider === "customHtml" ? { "data-raw-html": rawHtml } : {}),
      }),
      inner,
      ...(caption ? [["p", { class: "embed-caption" }, caption]] : []),
    ]);
  },
});

// ============================================================
// LinkCard — 외부 링크 카드.
// ============================================================

export type LinkCardAttrs = { url: string; title: string; description: string };

export const LinkCardBlock = Node.create({
  name: "linkCard",
  group: "block",
  atom: true,
  draggable: true,

  addAttributes() {
    return {
      url: { default: "" },
      title: { default: "" },
      description: { default: "" },
    };
  },

  parseHTML() {
    return [{ tag: "a[data-type='link-card']" }];
  },

  renderHTML({ HTMLAttributes }) {
    const { url, title, description } = HTMLAttributes as LinkCardAttrs;
    return renderSpec([
      "a",
      mergeAttributes({
        "data-type": "link-card",
        href: url,
        target: "_blank",
        rel: "noopener noreferrer",
        class: "link-card",
      }),
      ["strong", {}, title || url],
      ...(description ? [["p", {}, description]] : []),
    ]);
  },
});

// ============================================================
// 공유 확장 목록 — 서버(generateHTML)와 클라이언트(BlockEditor)가
// 동일 스키마를 쓰도록 단일 소스로 관리한다. BlockEditor.tsx는 이 배열에
// NodeView만 추가로 붙인다(스키마 자체는 여기서 바뀌지 않음).
// ============================================================

export function coreExtensions() {
  return [
    StarterKit.configure({
      heading: { levels: [1, 2, 3] },
      codeBlock: false,
    }),
    Link.configure({
      openOnClick: false,
      HTMLAttributes: { class: "text-blue-600 hover:underline" },
    }),
    Underline,
    TextAlign.configure({
      types: ["heading", "paragraph"],
      alignments: ["left", "center", "right", "justify"],
    }),
    TextStyle,
    Highlight.configure({ multicolor: true }),
    Color,
    TaskList,
    TaskItem.configure({ nested: true }),
    FigureImage,
    GalleryBlock,
    EmbedBlock,
    LinkCardBlock,
  ];
}

/**
 * 서버(Route Handler)에서 body_json(ProseMirror JSON)을 HTML로 렌더링하고
 * 새니타이즈한다. posts.body는 이 함수의 결과를 저장하는 파생 캐시 —
 * 클라이언트가 무엇을 보내든(혹은 API를 직접 호출하든) 실제 렌더 HTML은
 * 항상 서버가 JSON으로부터 재계산한다(Stored XSS 방지 이중 방어 + JSON을
 * 정본으로 강제).
 */
export function renderPostHtml(json: JSONContent): string {
  const html = generateHTML(json, coreExtensions());
  return sanitizeHtml(html);
}

/** 빈 문서(글쓰기 시작 시 기본값). */
export function emptyDoc(): JSONContent {
  return { type: "doc", content: [{ type: "paragraph" }] };
}

export type StorageRef = { bucket: string; path: string };

/**
 * JSONContent 문서를 순회하며 이미지/갤러리에서 Storage(bucket, path)를
 * 모두 모은다(GC용). figureImage는 항상 post-images 버킷, gallery 이미지는
 * 항상 gallery 버킷에 업로드되므로(BlockEditor.tsx 업로드 로직 참고)
 * 노드 타입만으로 버킷을 역산할 수 있다.
 */
export function collectStoragePaths(json: JSONContent | null | undefined): StorageRef[] {
  const refs: StorageRef[] = [];
  const seen = new Set<string>();
  if (!json) return refs;

  function add(bucket: string, path: string | null | undefined) {
    if (!path) return;
    const key = `${bucket}/${path}`;
    if (seen.has(key)) return;
    seen.add(key);
    refs.push({ bucket, path });
  }

  function walk(node: JSONContent) {
    if (node.type === "figureImage") {
      add("post-images", node.attrs?.path as string | undefined);
    }
    if (node.type === "gallery" && Array.isArray(node.attrs?.images)) {
      for (const img of node.attrs.images as GalleryImageAttrs[]) {
        add("gallery", img.path);
      }
    }
    for (const child of node.content ?? []) walk(child);
  }

  walk(json);
  return refs;
}

/** 문서에서 대표 이미지로 지정된 이미지(featured:true)의 URL을 찾는다. */
export function findFeaturedImage(json: JSONContent | null | undefined): { url: string; path: string | null } | null {
  if (!json) return null;
  let found: { url: string; path: string | null } | null = null;

  function walk(node: JSONContent) {
    if (found) return;
    if (node.type === "figureImage" && node.attrs?.featured && node.attrs.src) {
      found = { url: node.attrs.src as string, path: (node.attrs.path as string) ?? null };
      return;
    }
    for (const child of node.content ?? []) walk(child);
  }

  walk(json);
  return found;
}

/** 문서에서 첫 번째 이미지(대표 이미지 미지정 시 폴백)의 URL을 찾는다. */
export function findFirstImage(json: JSONContent | null | undefined): string | null {
  if (!json) return null;
  let found: string | null = null;

  function walk(node: JSONContent) {
    if (found) return;
    if (node.type === "figureImage" && node.attrs?.src) {
      found = node.attrs.src as string;
      return;
    }
    if (node.type === "gallery" && Array.isArray(node.attrs?.images) && node.attrs.images.length > 0) {
      found = (node.attrs.images as GalleryImageAttrs[])[0].src;
      return;
    }
    for (const child of node.content ?? []) walk(child);
  }

  walk(json);
  return found;
}

/**
 * EPIC-079: 문서에 실제 내용(텍스트 또는 미디어 블록)이 있는지 판정한다.
 * PostForm.tsx가 예전엔 이 판정을 editor의 onChange가 넘겨주는 HTML
 * 문자열(bodyHtml state)로 했는데, 수정 화면에서 body_json으로 기존 글을
 * 불러온 직후(에디터를 한 번도 건드리지 않은 상태)엔 onChange가 아직
 * 한 번도 안 불려 bodyHtml이 계속 빈 문자열로 남아있어 "본문을 그대로 두고
 * 제목만 고쳐서 저장"이 매번 조용히 무시되는 버그가 있었다(에러 표시도
 * 없이 그냥 아무 일도 안 일어남) — 실제 정본인 JSON 트리 자체를 직접
 * 검사해 이 문제를 근본적으로 없앤다.
 */
export function isEmptyDoc(json: JSONContent | null | undefined): boolean {
  if (!json) return true;
  let empty = true;

  function walk(node: JSONContent) {
    if (!empty) return;
    if (node.type === "text" && (node.text ?? "").trim().length > 0) {
      empty = false;
      return;
    }
    if (["figureImage", "gallery", "embed", "linkCard"].includes(node.type ?? "")) {
      empty = false;
      return;
    }
    for (const child of node.content ?? []) walk(child);
  }

  walk(json);
  return empty;
}
