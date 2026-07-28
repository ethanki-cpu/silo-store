import Link from "next/link";
import type { BoardPost } from "@/lib/boardLayout";

// EPIC-056: Board Module 목록 ⑥ Community List Module — 제목/작성자/좋아요/
// 조회수/날짜만 보여주는 목록형 레이아웃. src/components/boards/
// BoardRenderer.tsx 안에 갇혀 있던 사설(private) 컴포넌트를 그대로
// 뽑아낸 것(마크업/동작 변경 없음) — BoardRenderer가 이 모듈을 그대로
// 재사용한다(중복 없음).
function PostBadges({ post, isQna }: { post: BoardPost; isQna: boolean }) {
  if (!post.is_best && !post.is_docent_post && !isQna) return null;

  return (
    <div className="flex items-center gap-2 mb-1.5">
      {post.is_best && (
        <span className="text-xs font-semibold bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded">
          개념글
        </span>
      )}
      {post.is_docent_post && (
        <span className="text-xs font-semibold bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded">
          도슨트
        </span>
      )}
      {isQna && (
        <span
          className={`text-xs font-semibold px-1.5 py-0.5 rounded ${
            post.is_answered
              ? "bg-green-100 text-green-700"
              : "bg-gray-100 text-gray-500"
          }`}
        >
          {post.is_answered ? "답변완료" : "답변대기"}
        </span>
      )}
    </div>
  );
}

export function CommunityListModule({
  boardId,
  posts,
  isQna,
}: {
  boardId: string;
  posts: BoardPost[];
  isQna: boolean;
}) {
  return (
    <div className="divide-y divide-gray-100">
      {posts.map((post) => (
        <Link
          key={post.id}
          href={`/boards/${boardId}/${post.id}`}
          className="block py-5 group"
        >
          <PostBadges post={post} isQna={isQna} />
          <h2 className="font-serif text-lg font-medium text-gray-900 group-hover:underline">
            {post.title}
          </h2>
          <p className="text-xs uppercase tracking-wide text-gray-400 mt-1.5">
            {post.author_name} · 좋아요 {post.like_count} · 조회{" "}
            {post.view_count ?? 0} · 댓글 {post.comment_count} ·{" "}
            {new Date(post.created_at).toLocaleString()}
          </p>
        </Link>
      ))}
    </div>
  );
}
