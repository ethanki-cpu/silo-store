import type { BoardPost } from "@/lib/boardLayout";
import { StoryCard } from "@/components/boards/StoryCard";
import { stripHtml } from "@/lib/sanitize";

// EPIC-056: Board Module 목록 ⑤ Story Thumbnail Module — 카드형/썸네일/
// 제목/요약/작성자/날짜. src/components/boards/BoardRenderer.tsx 안에
// 갇혀 있던 사설(private) 그리드 래퍼를 그대로 뽑아낸 것(카드 자체의
// 마크업은 기존 공용 StoryCard, EPIC-052를 그대로 재사용) — 새 디자인
// 없음.
export function StoryThumbnailModule({
  boardId,
  posts,
  showThumbnail = true,
}: {
  boardId: string;
  posts: BoardPost[];
  // EPIC-065: Widget Builder의 Board Widget "썸네일" 토글 — false면
  // photoUrl을 넘기지 않아 StoryCard가 이미지 없이 렌더링된다(카드 레이아웃
  // 자체는 그대로 유지, 새 레이아웃 없음).
  showThumbnail?: boolean;
}) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
      {posts.map((post) => (
        <StoryCard
          key={post.id}
          href={`/boards/${boardId}/${post.id}`}
          photoUrl={showThumbnail ? post.photo_url : null}
          title={post.title ?? ""}
          summary={post.body ? stripHtml(post.body) : null}
          tags={post.tags ?? []}
          meta={
            <>
              {post.author_name} · 좋아요 {post.like_count} · 조회{" "}
              {post.view_count ?? 0} ·{" "}
              {new Date(post.created_at).toLocaleDateString()}
            </>
          }
        />
      ))}
    </div>
  );
}
