"use client";

// EPIC-102: "존재하는 카테고리의 게시판과 연결" — 새로 게시판 fetch 로직을
// 만들지 않고 Native Page Builder의 board/slide/gallery 위젯이 이미 쓰는
// src/lib/useBoardPosts.ts를 그대로 재사용한다. posts에는 가격 필드가 없어
// (docs/database-schema.sql 확인) 썸네일/카테고리/제목/요약까지만 보여준다.
// EPIC-103(Kinfolk 3rd/6th/9th/15th/4th 블록): "화면 어디든 클릭+드래그로
// 좌우 이동하는 목록"(dragRow)과 "게시글 하나만 여백 넉넉하게 돋보이는"
// (spotlight) 카드 스타일을 추가한다.
import { useEffect, useState } from "react";
import { useNode } from "@craftjs/core";
import Link from "next/link";
import { EditableBlockFrame, useCraftEditable } from "@/components/craft/home/editable";
import { RevealWrapper } from "@/components/craft/shared/RevealWrapper";
import { MotionSettingsSection } from "@/components/craft/shared/MotionSettingsSection";
import { DEFAULT_MOTION, type MotionConfig } from "@/lib/useScrollReveal";
import { useBoardPosts } from "@/lib/useBoardPosts";
import { usePointerDragScroll } from "@/lib/usePointerDragScroll";
import type { BoardPost } from "@/lib/boardLayout";

export type BoardEmbedBlockProps = {
  boardId: string;
  cardStyle: "list" | "thumbnail" | "gallery" | "dragRow" | "spotlight";
  count: number;
  motion?: MotionConfig;
};

const GRID_CLASS: Record<"list" | "thumbnail" | "gallery", string> = {
  list: "flex flex-col divide-y divide-gray-100",
  thumbnail: "grid grid-cols-2 gap-4 @[768px]:grid-cols-4",
  gallery: "grid grid-cols-1 gap-6 @[768px]:grid-cols-3",
};

function summarize(body: string | null, max = 60) {
  if (!body) return "";
  const plain = body.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
  return plain.length > max ? `${plain.slice(0, max)}…` : plain;
}

function thumbnailOf(post: BoardPost) {
  return post.thumbnail_visible !== false ? post.featured_image_url || post.photo_url : null;
}

function GridPosts({
  posts,
  boardId,
  cardStyle,
}: {
  posts: BoardPost[];
  boardId: string;
  cardStyle: "list" | "thumbnail" | "gallery";
}) {
  return (
    <div className={GRID_CLASS[cardStyle]}>
      {posts.map((post) => {
        const thumbnail = thumbnailOf(post);
        return (
          <Link
            key={post.id}
            href={`/boards/${boardId}/${post.slug ?? post.id}`}
            className={cardStyle === "list" ? "flex items-center gap-3 py-3" : "block"}
          >
            {thumbnail && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={thumbnail}
                alt={post.title ?? ""}
                className={cardStyle === "list" ? "h-14 w-14 flex-shrink-0 object-cover" : "aspect-[4/3] w-full object-cover"}
              />
            )}
            <div className={cardStyle === "list" ? "min-w-0" : "pt-2"}>
              {post.category && <span className="text-[10px] uppercase tracking-wide text-gray-400">{post.category}</span>}
              <h4 className="truncate text-sm font-medium text-gray-900">{post.title}</h4>
              {cardStyle !== "list" && <p className="mt-1 line-clamp-2 text-xs text-gray-500">{summarize(post.body)}</p>}
            </div>
          </Link>
        );
      })}
    </div>
  );
}

function DragRowPosts({ posts, boardId }: { posts: BoardPost[]; boardId: string }) {
  const { ref, onPointerDown, onPointerMove, onPointerUp } = usePointerDragScroll<HTMLDivElement>();
  return (
    <div
      ref={ref}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerLeave={onPointerUp}
      className="flex cursor-grab select-none gap-4 overflow-x-auto pb-1 active:cursor-grabbing"
      style={{ scrollSnapType: "x proximity" }}
    >
      {posts.map((post) => {
        const thumbnail = thumbnailOf(post);
        return (
          <Link
            key={post.id}
            href={`/boards/${boardId}/${post.slug ?? post.id}`}
            className="block flex-shrink-0"
            style={{ scrollSnapAlign: "start", width: "min(70vw, 320px)" }}
            draggable={false}
          >
            {thumbnail && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={thumbnail}
                alt={post.title ?? ""}
                className="pointer-events-none aspect-[4/3] w-full object-cover"
                draggable={false}
              />
            )}
            <div className="pt-2">
              {post.category && <span className="text-[10px] uppercase tracking-wide text-gray-400">{post.category}</span>}
              <h4 className="text-sm font-medium text-gray-900">{post.title}</h4>
              <p className="mt-1 line-clamp-2 text-xs text-gray-500">{summarize(post.body)}</p>
            </div>
          </Link>
        );
      })}
    </div>
  );
}

function SpotlightPost({ post, boardId }: { post: BoardPost; boardId: string }) {
  const thumbnail = thumbnailOf(post);
  return (
    <Link href={`/boards/${boardId}/${post.slug ?? post.id}`} className="mx-auto block max-w-md py-10 text-center">
      {thumbnail && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={thumbnail} alt={post.title ?? ""} className="mx-auto aspect-square w-40 object-cover" />
      )}
      {post.category && <span className="mt-4 block text-[10px] uppercase tracking-wide text-gray-400">{post.category}</span>}
      <h4 className="mt-1 text-xl font-medium text-gray-900">{post.title}</h4>
      <p className="mt-2 text-sm text-gray-500">{summarize(post.body, 120)}</p>
    </Link>
  );
}

export function BoardEmbedBlock({ boardId, cardStyle, count, motion = DEFAULT_MOTION }: BoardEmbedBlockProps) {
  const {
    connectors: { connect },
  } = useNode();
  const { posts, loading } = useBoardPosts(boardId || null, count);
  const slice = posts.slice(0, count);

  return (
    <div ref={(dom) => { if (dom) connect(dom); }}>
      <EditableBlockFrame label="게시판 연동">
        <RevealWrapper motion={motion}>
          {!boardId ? (
            <div className="flex h-24 items-center justify-center bg-gray-50 text-xs text-gray-400">
              우측 설정 패널에서 게시판을 선택하세요
            </div>
          ) : loading ? (
            <div className="flex h-24 items-center justify-center text-xs text-gray-400">불러오는 중...</div>
          ) : slice.length === 0 ? (
            <div className="flex h-24 items-center justify-center text-xs text-gray-400">게시글이 없어요</div>
          ) : cardStyle === "dragRow" ? (
            <DragRowPosts posts={slice} boardId={boardId} />
          ) : cardStyle === "spotlight" ? (
            <SpotlightPost post={slice[0]} boardId={boardId} />
          ) : (
            <GridPosts posts={slice} boardId={boardId} cardStyle={cardStyle} />
          )}
        </RevealWrapper>
      </EditableBlockFrame>
    </div>
  );
}

type BoardOption = { id: string; name: string; category: string | null };

function BoardEmbedSettings() {
  const { props, setProp } = useNode((node) => ({ props: node.data.props as BoardEmbedBlockProps }));
  const editable = useCraftEditable();
  const [boards, setBoards] = useState<BoardOption[]>([]);

  useEffect(() => {
    if (!editable) return;
    fetch("/api/boards")
      .then((res) => res.json())
      .then((data) => setBoards(Array.isArray(data) ? data : []))
      .catch(() => setBoards([]));
  }, [editable]);

  return (
    <div className="space-y-3">
      <label className="block text-xs text-gray-600">
        게시판
        <select
          value={props.boardId}
          onChange={(e) => setProp((p) => { p.boardId = e.target.value; })}
          className="mt-1 w-full rounded border border-gray-300 px-2 py-1 text-xs"
        >
          <option value="">선택 안 함</option>
          {boards.map((board) => (
            <option key={board.id} value={board.id}>
              {board.name}
            </option>
          ))}
        </select>
      </label>
      <label className="block text-xs text-gray-600">
        카드 스타일
        <select
          value={props.cardStyle}
          onChange={(e) => setProp((p) => { p.cardStyle = e.target.value as BoardEmbedBlockProps["cardStyle"]; })}
          className="mt-1 w-full rounded border border-gray-300 px-2 py-1 text-xs"
        >
          <option value="list">리스트</option>
          <option value="thumbnail">썸네일</option>
          <option value="gallery">갤러리</option>
          <option value="dragRow">드래그 스크롤 목록</option>
          <option value="spotlight">스포트라이트(게시글 1개 강조)</option>
        </select>
      </label>
      <label className="block text-xs text-gray-600">
        개수
        <input
          type="number"
          min={1}
          max={24}
          value={props.count}
          onChange={(e) => setProp((p) => { p.count = Number(e.target.value) || 6; })}
          className="mt-1 w-full rounded border border-gray-300 px-2 py-1 text-xs"
        />
      </label>
      <MotionSettingsSection />
    </div>
  );
}

BoardEmbedBlock.craft = {
  displayName: "BoardEmbedBlock",
  props: {
    boardId: "",
    cardStyle: "thumbnail",
    count: 6,
    motion: DEFAULT_MOTION,
  } satisfies BoardEmbedBlockProps,
  related: { settings: BoardEmbedSettings },
};
