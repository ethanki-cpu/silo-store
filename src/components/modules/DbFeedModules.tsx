"use client";

import Link from "next/link";
import { useBoardPosts } from "@/lib/useBoardPosts";
import { SlideModule } from "@/components/modules/SlideModule";
import { GalleryModule } from "@/components/modules/GalleryModule";
import { TimelineView } from "@/components/TimelineView";
import type { BoardPost } from "@/lib/boardLayout";

// EPIC-060: Page Builder의 Slide/Gallery/Timeline 모듈은 (Board 모듈과
// 달리) 게시판 하나의 최신 글만 미리보기로 보여주는 용도라 자체 검색/정렬
// UI가 없다 — src/components/modules/{SlideModule,GalleryModule}.tsx와
// src/components/TimelineView.tsx는 그대로 재사용하고, 이 파일은 board_id
// 로부터 최신 글을 가져와(useBoardPosts) 각 컴포넌트가 요구하는 데이터
// 모양으로 바꿔주는 얇은 어댑터 3개만 담는다(새 UI/마크업 없음).

function EmptyBoardHint({ loading }: { loading: boolean }) {
  if (loading) return <p className="text-gray-400 text-sm">불러오는 중...</p>;
  return <p className="text-gray-400 text-sm">연결된 게시판이 없거나 글이 없어요.</p>;
}

export function DbSlideModule({ boardId, title }: { boardId: string | null; title?: string }) {
  const { board, posts, loading } = useBoardPosts(boardId);
  if (!boardId || (!loading && posts.length === 0)) return <EmptyBoardHint loading={loading} />;

  const items = posts.map((p) => ({
    id: p.id,
    board_id: boardId,
    board_name: board?.name ?? "",
    title: p.title,
    like_count: p.like_count,
    author_name: p.author_name,
    created_at: p.created_at,
    photo_url: p.photo_url,
  }));

  return <SlideModule title={title ?? board?.name ?? "최신 글"} items={items} />;
}

export function DbGalleryModule({ boardId }: { boardId: string | null }) {
  const { posts, loading } = useBoardPosts(boardId);
  if (!boardId || (!loading && posts.length === 0)) return <EmptyBoardHint loading={loading} />;
  return <GalleryModule boardId={boardId} posts={posts} />;
}

function TimelinePostRow({ boardId, post }: { boardId: string; post: BoardPost }) {
  return (
    <Link
      href={`/boards/${boardId}/${post.id}`}
      className="block rounded-md border border-gray-100 p-3 hover:bg-gray-50"
    >
      <p className="text-sm font-medium text-gray-900">{post.title}</p>
      <p className="text-xs text-gray-400 mt-1">{post.author_name}</p>
    </Link>
  );
}

export function DbTimelineModule({ boardId }: { boardId: string | null }) {
  const { posts, loading } = useBoardPosts(boardId, 50);
  if (!boardId || (!loading && posts.length === 0)) return <EmptyBoardHint loading={loading} />;

  const entries = posts.map((p) => ({ ...p, createdAt: p.created_at }));

  return (
    <TimelineView
      entries={entries}
      renderItem={(entry) => <TimelinePostRow boardId={boardId} post={entry} />}
    />
  );
}
