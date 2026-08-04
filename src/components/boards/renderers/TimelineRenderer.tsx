import Link from "next/link";
import type { BoardPost } from "@/lib/boardLayout";
import { TimelineView } from "@/components/TimelineView";
import { PostTags } from "@/components/boards/PostTags";
import type { BoardRendererProps } from "./types";

// Timeline Engine(EPIC-050): 연→월 순으로 묶어 보여주는 그룹핑은
// TimelineView(src/components/TimelineView.tsx)가 공용으로 처리한다 — 여기는
// BoardPost를 그 계약({id, createdAt})에 맞게 어댑팅하고, 항목 하나의
// 마크업만 담당한다.
//
// EPIC-066: 기존에는 날짜+제목만 보여주던 것을, Board Widget 출력 요구
// 항목(썸네일/작성자/좋아요/댓글/조회수/태그/카테고리)을 전부 담도록
// 확장했다 — StoryCard 대신 더 컴팩트한 가로 레이아웃(타임라인 특성상
// 세로 공간이 중요)으로 새로 작성.
function TimelinePostRow({
  boardId,
  post,
  boardCategory,
}: {
  boardId: string;
  post: BoardPost;
  boardCategory?: string | null;
}) {
  return (
    <Link href={`/boards/${boardId}/${post.slug ?? post.id}`} className="flex gap-3 group">
      {post.photo_url && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={post.photo_url} alt="" className="w-14 h-14 shrink-0 rounded-md object-cover" />
      )}
      <div className="min-w-0 flex-1">
        <p className="text-xs text-gray-400">{new Date(post.created_at).getDate()}일</p>
        <p className="font-serif text-gray-900 group-hover:underline">{post.title}</p>
        <p className="text-xs text-gray-400 mt-1">
          {post.author_name} · 좋아요 {post.like_count} · 조회 {post.view_count ?? 0} · 댓글{" "}
          {post.comment_count}
        </p>
        <PostTags tags={[...(post.tags ?? []), ...(boardCategory ? [boardCategory] : [])]} />
      </div>
    </Link>
  );
}

export function TimelineRenderer({ boardId, posts, boardCategory }: BoardRendererProps) {
  const entries = posts.map((post) => ({ ...post, createdAt: post.created_at }));

  return (
    <TimelineView
      entries={entries}
      renderItem={(entry) => <TimelinePostRow boardId={boardId} post={entry} boardCategory={boardCategory} />}
    />
  );
}
