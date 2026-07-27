"use client";

import Link from "next/link";
import type { BoardDefinition, BoardPost, HubFeed, HubChildBoard } from "@/lib/boardLayout";
import { PostTags } from "./PostTags";

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

// story: 카드형, 썸네일 포함 — 대표 이미지/제목/요약/태그/좋아요/조회수/작성일(+작성자).
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
          <PostTags tags={post.tags ?? []} />
          <p className="text-xs uppercase tracking-wide text-gray-400 mt-2">
            {post.author_name} · 좋아요 {post.like_count} · 조회{" "}
            {post.view_count ?? 0} · {new Date(post.created_at).toLocaleDateString()}
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

// hub: 하위 게시판의 최신글/인기글/추천글 슬라이드 + 하위 게시판 카드.
function FeedSlide({
  title,
  items,
}: {
  title: string;
  items: HubFeed["latest"];
}) {
  return (
    <section className="mb-10">
      <h2 className="text-xs uppercase tracking-wide text-gray-400 mb-3">
        {title}
      </h2>
      {items.length === 0 ? (
        <p className="text-sm text-gray-400">아직 글이 없어요.</p>
      ) : (
        <div className="flex gap-4 overflow-x-auto pb-2">
          {items.map((item) => (
            <Link
              key={item.id}
              href={`/boards/${item.board_id}/${item.id}`}
              className="shrink-0 w-56 rounded-lg border border-gray-100 p-4 hover:shadow-md transition-shadow"
            >
              <p className="text-xs uppercase tracking-wide text-gray-400 mb-1">
                {item.board_name}
              </p>
              <p className="font-serif font-medium text-gray-900 line-clamp-2">
                {item.title}
              </p>
              <p className="text-xs text-gray-400 mt-2">
                {item.author_name} · 좋아요 {item.like_count}
              </p>
            </Link>
          ))}
        </div>
      )}
    </section>
  );
}

function HubView({
  hubFeed,
  hubChildBoards,
}: {
  hubFeed: HubFeed;
  hubChildBoards?: HubChildBoard[];
}) {
  return (
    <div>
      <FeedSlide title="최신글" items={hubFeed.latest} />
      <FeedSlide title="인기글" items={hubFeed.popular} />
      <FeedSlide title="추천글" items={hubFeed.recommended} />

      {/* hubChildBoards가 아예 주어지지 않으면(예: 최상위 /boards 디렉토리처럼
          그룹별 목록을 이 컴포넌트 밖에서 직접 그리는 페이지) 이 섹션 자체를
          생략한다 — 진짜 hub 게시판(Silo Store 등)은 항상 배열을 넘긴다. */}
      {hubChildBoards && (
      <section>
        <h2 className="text-xs uppercase tracking-wide text-gray-400 mb-3">
          하위 게시판
        </h2>
        {hubChildBoards.length === 0 ? (
          <p className="text-sm text-gray-400">하위 게시판이 없어요.</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {hubChildBoards.map((board) =>
              board.locked ? (
                <div
                  key={board.id}
                  className="rounded-lg border border-gray-100 p-4 text-gray-300 cursor-not-allowed"
                >
                  <p className="font-serif font-medium">🔒 {board.name}</p>
                  <p className="text-xs mt-1">{board.lockMessage}</p>
                </div>
              ) : (
                <Link
                  key={board.id}
                  href={`/boards/${board.id}`}
                  className="block rounded-lg border border-gray-100 p-4 hover:shadow-md transition-shadow group"
                >
                  <p className="font-serif font-medium text-gray-900 group-hover:underline">
                    {board.name}
                  </p>
                </Link>
              ),
            )}
          </div>
        )}
      </section>
      )}
    </div>
  );
}

// Board Definition System(EPIC-047/048): 게시판별로 화면을 새로 만들지
// 않고, BoardDefinition.boardType 하나로 community/story/gallery/hub 네
// 레이아웃 중 하나를 선택해 렌더링한다 — definition을 통째로 받는 이유는,
// 태그/썸네일 같은 세부 토글도 여기서 그대로 참조할 수 있게 하기 위함.
// hub는 자기 자신의 글 목록(posts)이 아니라 하위 게시판들의 종합 피드
// (hubFeed)+카드(hubChildBoards)를 받아 그린다.
export function BoardRenderer({
  definition,
  boardId,
  posts,
  isQna,
  hubFeed,
  hubChildBoards,
}: {
  definition: BoardDefinition;
  boardId: string;
  posts: BoardPost[];
  isQna: boolean;
  hubFeed?: HubFeed;
  hubChildBoards?: HubChildBoard[];
}) {
  if (definition.boardType === "hub") {
    return (
      <HubView
        hubFeed={hubFeed ?? { latest: [], popular: [], recommended: [] }}
        hubChildBoards={hubChildBoards}
      />
    );
  }

  if (posts.length === 0) {
    return <p className="text-gray-400">아직 게시글이 없어요.</p>;
  }

  switch (definition.boardType) {
    case "story":
      return <StoryCards boardId={boardId} posts={posts} />;
    case "gallery":
      return <GalleryGrid boardId={boardId} posts={posts} />;
    case "community":
    default:
      return <CommunityList boardId={boardId} posts={posts} isQna={isQna} />;
  }
}
