"use client";

import Link from "next/link";
import type { BoardLayoutType, BoardPost } from "@/lib/boardLayout";

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

// community: 목록형, 썸네일 없음 — 제목/작성자/좋아요/조회수/댓글수/작성일.
function CommunityList({
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

// story: 카드형, 썸네일 포함 — 제목/요약/좋아요/조회수/작성일.
function StoryCards({ boardId, posts }: { boardId: string; posts: BoardPost[] }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
      {posts.map((post) => (
        <Link
          key={post.id}
          href={`/boards/${boardId}/${post.id}`}
          className="block group"
        >
          {post.photo_url && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={post.photo_url}
              alt={post.title ?? ""}
              className="w-full aspect-[4/3] object-cover"
            />
          )}
          <h2 className="font-serif text-lg font-medium text-gray-900 mt-3 group-hover:underline">
            {post.title}
          </h2>
          {post.body && (
            <p className="text-sm text-gray-500 mt-1 line-clamp-2">
              {post.body}
            </p>
          )}
          <p className="text-xs uppercase tracking-wide text-gray-400 mt-2">
            좋아요 {post.like_count} · 조회 {post.view_count ?? 0} ·{" "}
            {new Date(post.created_at).toLocaleDateString()}
          </p>
        </Link>
      ))}
    </div>
  );
}

// gallery: 이미지 중심 grid, 썸네일 우선 — 텍스트는 최소한만.
function GalleryGrid({ boardId, posts }: { boardId: string; posts: BoardPost[] }) {
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

// Board Engine(EPIC-047): 게시판별로 화면을 새로 만들지 않고, layoutType
// 하나로 community/story/gallery 세 레이아웃 중 하나를 선택해 렌더링한다.
export function BoardRenderer({
  layoutType,
  boardId,
  posts,
  isQna,
}: {
  layoutType: BoardLayoutType;
  boardId: string;
  posts: BoardPost[];
  isQna: boolean;
}) {
  if (posts.length === 0) {
    return <p className="text-gray-400">아직 게시글이 없어요.</p>;
  }

  switch (layoutType) {
    case "story":
      return <StoryCards boardId={boardId} posts={posts} />;
    case "gallery":
      return <GalleryGrid boardId={boardId} posts={posts} />;
    case "community":
    default:
      return <CommunityList boardId={boardId} posts={posts} isQna={isQna} />;
  }
}
