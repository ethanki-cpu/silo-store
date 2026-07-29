// EPIC-066: 게시판 관리의 좋아요/댓글/조회수 "사용 여부" 토글 — 목록 카드
// 메타 라인(작성자 · 좋아요 N · 조회 N · 댓글 N)을 그리는 곳마다 조건문을
// 반복하지 않도록 한곳에 모은다. 옵션을 안 주면(undefined) 전부 기존처럼
// 보인다(하위 호환).
export function formatPostMeta(
  post: { author_name: string; like_count: number; view_count?: number | null; comment_count: number },
  opts: { showLikes?: boolean; showComments?: boolean; showViewCount?: boolean } = {},
): string {
  const parts = [post.author_name];
  if (opts.showLikes !== false) parts.push(`좋아요 ${post.like_count}`);
  if (opts.showViewCount !== false) parts.push(`조회 ${post.view_count ?? 0}`);
  if (opts.showComments !== false) parts.push(`댓글 ${post.comment_count}`);
  return parts.join(" · ");
}
