import Link from "next/link";
import type { BoardPost } from "@/lib/boardLayout";

// EPIC-056: Board Module 목록 ⑦ Gallery Module — 이미지 카드 + Masonry/Grid
// (CSS columns 기반). src/components/boards/BoardRenderer.tsx 안에 갇혀
// 있던 사설(private) 컴포넌트를 그대로 뽑아낸 것(마크업/동작 변경 없음).
export function GalleryModule({
  boardId,
  posts,
}: {
  boardId: string;
  posts: BoardPost[];
}) {
  return (
    <div className="columns-2 sm:columns-3 gap-4 [column-fill:_balance]">
      {posts.map((post) => (
        <Link
          key={post.id}
          href={`/boards/${boardId}/${post.id}`}
          className="block mb-4 break-inside-avoid group"
        >
          {post.photo_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={post.photo_url}
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
        </Link>
      ))}
    </div>
  );
}
