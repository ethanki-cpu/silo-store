// HOTFIX-097: 타임라인 hover 미리보기 카드에 쓸 "본문 일부" 텍스트를
// 만든다. posts.body는 이미 렌더링된 HTML 문자열(renderPostHtml 결과)이라
// 태그를 걷어내고 공백을 정리한 뒤 지정 길이로 자른다.
// EPIC-147-후속(사용자 지시 — "instagram 게시물 보기 같은 embed 내용은
// 필요없어"): 임베드 블록(`<div data-type="embed" ...>...</div>`, 예:
// Instagram/YouTube 등)은 태그만 벗기면 그 안의 링크 텍스트("Instagram
// 게시물 보기" 등)가 그대로 남아 발췌문을 오염시킨다 — 태그를 벗기기 전에
// 임베드 블록 자체를 통째로 잘라낸다. Tiptap이 만드는 임베드 노드는
// 안에 다른 <div>가 중첩되지 않는 단일 블록이라(blockquote/iframe만 있음)
// 첫 </div>까지의 non-greedy 매치로 안전하게 통째로 제거된다.
export function htmlToExcerpt(html: string | null | undefined, maxLength = 90): string {
  if (!html) return "";
  const text = html
    .replace(/<div[^>]*data-type=["']embed["'][^>]*>[\s\S]*?<\/div>/gi, " ")
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (text.length <= maxLength) return text;
  return `${text.slice(0, maxLength).trimEnd()}…`;
}
