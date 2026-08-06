import Link from "next/link";
import type { BoardPost } from "@/lib/boardLayout";
import { PostTags } from "@/components/boards/PostTags";
import { formatPostMeta } from "@/lib/postMeta";
import { ScrapButton } from "@/components/common/ScrapButton";

// EPIC-056: Board Module 목록 ⑦ Gallery Module — 이미지 카드 + Masonry/Grid
// (CSS columns 기반). src/components/boards/BoardRenderer.tsx 안에 갇혀
// 있던 사설(private) 컴포넌트를 그대로 뽑아낸 것(마크업/동작 변경 없음).
// EPIC-066: Board Widget 출력 요구 항목(좋아요/댓글/작성자/조회수/태그/
// 카테고리)을 이미지 아래 캡션 한 줄 + 태그 칩으로 추가 — 이미지 중심
// 레이아웃 자체는 그대로 유지한다.
// EPIC-084: BoardModule(전체 게시판 위젯)은 BoardHeader가 이미 글쓰기
// 버튼을 갖고 있었지만, 갤러리 위젯은 없어 "이 갤러리가 연결된 게시판에
// 바로 쓰고 싶다"는 요청을 못 들어줬다 — Contextual Write 진입점
// (/write?boardId=)으로 연결하는 버튼을 우측 상단에 추가한다.
export function GalleryModule({
  boardId,
  posts,
  boardCategory,
  showLikes,
  showComments,
  showViewCount,
  showWriteButton = true,
}: {
  boardId: string;
  posts: BoardPost[];
  boardCategory?: string | null;
  // EPIC-066: 게시판 관리의 좋아요/댓글/조회수 사용 여부 토글.
  showLikes?: boolean;
  showComments?: boolean;
  showViewCount?: boolean;
  showWriteButton?: boolean;
}) {
  return (
    <div>
      {showWriteButton && (
        <div className="flex justify-end mb-3">
          <Link
            href={`/write?boardId=${encodeURIComponent(boardId)}`}
            className="rounded-md border border-gray-300 px-3 py-1.5 text-sm hover:bg-gray-50"
          >
            글쓰기
          </Link>
        </div>
      )}
      <div className="columns-2 sm:columns-3 gap-4 [column-fill:_balance]">
      {posts.map((post) => {
        const imageUrl = post.thumbnail_visible !== false ? (post.featured_image_url ?? post.photo_url) : null;
        return (
        <div key={post.id} className="relative mb-4 break-inside-avoid group">
          {/* EPIC-085: ScrapButton은 자체 클릭 핸들러(preventDefault/
              stopPropagation)를 갖고 있지만, <a> 안에 <button>을 중첩하는
              건 유효하지 않은 HTML이라 카드 Link 바깥의 형제 요소로
              절대위치시켜 이미지 코너에 겹쳐 보이게 한다. */}
          <div className="absolute right-2 top-2 z-10">
            <ScrapButton postId={post.id} size="sm" />
          </div>
          <Link href={`/boards/${boardId}/${post.slug ?? post.id}`} className="block">
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
        </div>
        );
      })}
      </div>
    </div>
  );
}
