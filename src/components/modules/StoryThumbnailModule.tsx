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
}: {
  boardId: string;
  posts: BoardPost[];
}) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
      {posts.map((post) => (
        <StoryCard
          key={post.id}
          href={`/boards/${boardId}/${post.id}`}
          photoUrl={post.photo_url}
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
