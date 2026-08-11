// HOTFIX-097: 타임라인 hover 미리보기 카드에 쓸 "본문 일부" 텍스트를
// 만든다. posts.body는 이미 렌더링된 HTML 문자열(renderPostHtml 결과)이라
// 태그를 걷어내고 공백을 정리한 뒤 지정 길이로 자른다.
export function htmlToExcerpt(html: string | null | undefined, maxLength = 90): string {
  if (!html) return "";
  const text = html
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (text.length <= maxLength) return text;
  return `${text.slice(0, maxLength).trimEnd()}…`;
}
