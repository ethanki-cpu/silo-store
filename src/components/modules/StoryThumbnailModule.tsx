import type { BoardPost } from "@/lib/boardLayout";
import { StoryCard } from "@/components/boards/StoryCard";
import { stripHtml } from "@/lib/sanitize";
import { formatPostMeta } from "@/lib/postMeta";

// EPIC-056: Board Module 목록 ⑤ Story Thumbnail Module — 카드형/썸네일/
// 제목/요약/작성자/날짜. src/components/boards/BoardRenderer.tsx 안에
// 갇혀 있던 사설(private) 그리드 래퍼를 그대로 뽑아낸 것(카드 자체의
// 마크업은 기존 공용 StoryCard, EPIC-052를 그대로 재사용) — 새 디자인
// 없음.
export function StoryThumbnailModule({
  boardId,
  posts,
  showThumbnail = true,
  boardCategory,
  showLikes,
  showComments,
  showViewCount,
}: {
  boardId: string;
  posts: BoardPost[];
  // EPIC-065: Widget Builder의 Board Widget "썸네일" 토글 — false면
  // photoUrl을 넘기지 않아 StoryCard가 이미지 없이 렌더링된다(카드 레이아웃
  // 자체는 그대로 유지, 새 레이아웃 없음).
  showThumbnail?: boolean;
  // EPIC-066: 게시판 카테고리(게시글 단위가 아닌 게시판 속성)를 태그
  // 칩으로 함께 보여준다 — 게시글 상세 페이지의 기존 displayTags 관례와
  // 동일.
  boardCategory?: string | null;
  // EPIC-066: 게시판 관리의 좋아요/댓글/조회수 사용 여부 토글.
  showLikes?: boolean;
  showComments?: boolean;
  showViewCount?: boolean;
}) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
      {posts.map((post) => (
        <StoryCard
          key={post.id}
          href={`/boards/${boardId}/${post.id}`}
          photoUrl={showThumbnail ? (post.featured_image_url ?? post.photo_url) : null}
          title={post.title ?? ""}
          summary={post.body ? stripHtml(post.body) : null}
          tags={[...(post.tags ?? []), ...(boardCategory ? [boardCategory] : [])]}
          meta={
            <>
              {formatPostMeta(post, { showLikes, showComments, showViewCount })} ·{" "}
              {new Date(post.created_at).toLocaleDateString()}
            </>
          }
        />
      ))}
    </div>
  );
}
