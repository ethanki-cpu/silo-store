import DOMPurify from "isomorphic-dompurify";

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
  // EPIC-053: iframe (유튜브/밈오/맵스/스포티파이)
  "src", "width", "height", "frameborder", "allowfullscreen",
  "allow", "allowtransparency",
  "loading", // lazy loading
  // EPIC-053: 정렬/스타일
  "text-align", "align",
  // EPIC-053: 데이터 속성
  "data-type", "data-checked", "data-placeholder",
];

export function sanitizeHtml(html: string): string {
  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS,
    ALLOWED_ATTR,
  });
}

// EPIC-052: 카드 요약(썸네일 미리보기 등)에서 태그를 벗겨낸 순수 텍스트가
// 필요한 곳에서 재사용 — Tiptap이 저장한 HTML을 그대로 보여주면 태그가
// 문자 그대로 노출되므로, DOMPurify로 태그만 전부 제거한다.
export function stripHtml(html: string): string {
  return DOMPurify.sanitize(html, { ALLOWED_TAGS: [] });
}
