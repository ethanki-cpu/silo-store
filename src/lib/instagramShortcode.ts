// HOTFIX-147.11: NativeInstagramEmbed.tsx의 extractShortcode를 그대로 뽑아낸
// 공용 유틸 — 게시글 본문에 박힌 인스타그램 permalink(쿼리스트링 포함)와
// instagram_feeds.permalink(깨끗한 URL)를 같은 게시물로 매칭할 때 양쪽 다
// 이 shortcode 기준으로 비교한다.
export function extractInstagramShortcode(url: string): string | null {
  const m = url.match(/instagram\.com\/(?:p|reel|tv)\/([A-Za-z0-9_-]+)/);
  return m ? m[1] : null;
}
