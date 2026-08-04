import sanitizeHtmlLib from "sanitize-html";

// EPIC-070: isomorphic-dompurify(jsdom 기반)에서 sanitize-html(순수 JS, DOM
// 불필요)로 교체 — jsdom의 하위 의존성(html-encoding-sniffer@6 → 순수 ESM인
// @exodus/bytes)이 Vercel 서버리스 환경의 CJS require()와 충돌해
// `ERR_REQUIRE_ESM`으로 이 모듈을 import하는 라우트 전체가 500이 났다
// (로컬 `next start`에서는 재현되지 않고 실제 배포에서만 터짐 — 프로덕션
// Runtime Logs로 확인). jsdom 의존을 아예 없애 이 클래스의 버그를 원천
// 차단한다.

// EPIC-052: Tiptap Block Editor 도입에 따라 posts.body가 이제 HTML
// 문자열을 담을 수 있다 — 클라이언트 에디터를 거치지 않고 API를 직접
// 호출해도 안전하도록, 저장 직전(서버)과 렌더링 직전(방어적 이중 확인)
// 양쪽에서 동일한 허용 태그로 정제한다(Stored XSS 방지).
//
// EPIC-053: Block Editor 확장 — 이미지(src/alt/width/height/style),
// div(컬럼 레이아웃), iframe(YouTube/Vimeo/Maps/Spotify), object/pdf,
// figure/figcaption, mark(형광펜), video/audio, span(color/style) 추가.
const ALLOWED_TAGS = [
  // 기본 텍스트
  "p", "br", "strong", "em", "s", "u",
  "h1", "h2", "h3",
  "ul", "ol", "li",
  "blockquote",
  "a",
  "code", "pre",
  // EPIC-053: 추가 텍스트 포맷
  "mark", "span", "div",
  // EPIC-053: 미디어
  "img", "figure", "figcaption",
  "video", "audio", "source",
  "object", "param",
  // EPIC-053: 임베드
  "iframe",
  // EPIC-053: 테이블 (향후 확장)
  "table", "thead", "tbody", "tr", "th", "td",
];

const ALLOWED_ATTR = [
  // 기본
  "href", "target", "rel",
  // EPIC-053: 이미지/미디어
  "src", "alt", "width", "height", "style", "class",
  "controls", "autoplay", "loop", "muted",
  "data", "type", // object/param
  // EPIC-053: iframe (유튜브/밈오/맵스/스포티파이/인스타그램)
  "src", "width", "height", "frameborder", "allowfullscreen",
  "allow", "allowtransparency", "scrolling",
  "loading", // lazy loading
  // EPIC-053: 정렬/스타일
  "text-align", "align",
  // EPIC-053: 데이터 속성
  "data-type", "data-checked", "data-placeholder",
  // EPIC-053.1: Block Editor 커스텀 노드(FigureImage/Gallery/Embed/LinkCard) 렌더링용
  "data-featured", "data-provider",
  // EPIC-079-PHASE-2 후속 핫픽스: Instagram 공식 blockquote+embed.js 위젯
  // 마크업(src/lib/instagramEmbed.ts) — 이 세 속성이 없으면 embed.js가
  // blockquote를 인식하지 못해 그대로 fallback 링크만 남는다.
  "data-instgrm-permalink", "data-instgrm-version", "data-instgrm-captioned",
  // EPIC-079-PHASE-3: youtube 화면비율/instagram 캡션 숨김 설정 round-trip용.
  "data-aspect-ratio", "data-hide-caption",
];

export function sanitizeHtml(html: string): string {
  return sanitizeHtmlLib(html, {
    allowedTags: ALLOWED_TAGS,
    // DOMPurify의 ALLOWED_ATTR는 태그 구분 없이 전역으로 적용되는 flat
    // 배열이었다 — sanitize-html은 태그별 allowlist가 기본이라 "*"(전체
    // 태그 공통)로 감싸 동일한 의미를 유지한다.
    allowedAttributes: { "*": ALLOWED_ATTR },
  });
}

// EPIC-052: 카드 요약(썸네일 미리보기 등)에서 태그를 벗겨낸 순수 텍스트가
// 필요한 곳에서 재사용 — Tiptap이 저장한 HTML을 그대로 보여주면 태그가
// 문자 그대로 노출되므로, 태그만 전부 제거한다.
export function stripHtml(html: string): string {
  return sanitizeHtmlLib(html, { allowedTags: [], allowedAttributes: {} });
}
