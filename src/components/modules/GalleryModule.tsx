import Link from "next/link";
import type { BoardPost } from "@/lib/boardLayout";
import { PostTags } from "@/components/boards/PostTags";
import { formatPostMeta } from "@/lib/postMeta";

// EPIC-056: Board Module 목록 ⑦ Gallery Module — 이미지 카드 + Masonry/Grid
// (CSS columns 기반). src/components/boards/BoardRenderer.tsx 안에 갇혀
// 있던 사설(private) 컴포넌트를 그대로 뽑아낸 것(마크업/동작 변경 없음).
// EPIC-066: Board Widget 출력 요구 항목(좋아요/댓글/작성자/조회수/태그/
// 카테고리)을 이미지 아래 캡션 한 줄 + 태그 칩으로 추가 — 이미지 중심
// 레이아웃 자체는 그대로 유지한다.
export function GalleryModule({
  boardId,
  posts,
  boardCategory,
  showLikes,
  showComments,
  showViewCount,
}: {
  boardId: string;
  posts: BoardPost[];
  boardCategory?: string | null;
  // EPIC-066: 게시판 관리의 좋아요/댓글/조회수 사용 여부 토글.
  showLikes?: boolean;
  showComments?: boolean;
  showViewCount?: boolean;
}) {
  return (
    <div className="columns-2 sm:columns-3 gap-4 [column-fill:_balance]">
      {posts.map((post) => {
        const imageUrl = post.thumbnail_visible !== false ? (post.featured_image_url ?? post.photo_url) : null;
        return (
        <Link
          key={post.id}
          href={`/boards/${boardId}/${post.id}`}
          className="block mb-4 break-inside-avoid group"
        >
          {imageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={imageUrl}
              alt={post.title ?? ""}
              className="w-full object-cover"
            />
          ) : (
            <div className="w-full aspect-square bg-gray-50 border border-gray-100 flex items-center justify-center text-gray-300 text-xs">
              이미지 없음
            </div>
          )}
          <p className="text-sm font-medium text-gray-900 mt-2 group-hover:underline">
            {post.title}
          </p>
          <p className="text-xs text-gray-400 mt-1">
            {formatPostMeta(post, { showLikes, showComments, showViewCount })}
          </p>
          <PostTags tags={[...(post.tags ?? []), ...(boardCategory ? [boardCategory] : [])]} />
        </Link>
        );
      })}
    </div>
  );
}
