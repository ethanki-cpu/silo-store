"use client";

// EPIC-102: 게시판 글을 타임라인 항목으로 보여주는 원자 블록 — 기존
// AlternatingTimelineCanvas(EPIC-097, TimelineItemSettings[] 렌더러)를
// 재사용하되 항목을 운영자가 손으로 입력하는 대신 useBoardPosts로 실제
// 게시글에서 자동 매핑한다.
import { useEffect, useState } from "react";
import { useNode } from "@craftjs/core";
import { EditableBlockFrame, useCraftEditable } from "@/components/craft/home/editable";
import { RevealWrapper } from "@/components/craft/shared/RevealWrapper";
import { MotionSettingsSection } from "@/components/craft/shared/MotionSettingsSection";
import { DEFAULT_MOTION, type MotionConfig } from "@/lib/useScrollReveal";
import { useBoardPosts } from "@/lib/useBoardPosts";
import { AlternatingTimelineCanvas } from "@/components/modules/AlternatingTimelineCanvas";
import type { TimelineItemSettings } from "@/lib/widgetSchema";

export type TimelineEmbedBlockProps = {
  boardId: string;
  count: number;
  // EPIC-106: BoardEmbedBlock과 동일한 post.category 필터(빈 문자열/
  // 미지정=전체).
  category?: string;
  motion?: MotionConfig;
};

export function TimelineEmbedBlock({ boardId, count, category = "", motion = DEFAULT_MOTION }: TimelineEmbedBlockProps) {
  const {
    connectors: { connect },
  } = useNode();
  const { posts, loading } = useBoardPosts(boardId || null, count, "latest", category || null);

  const items: TimelineItemSettings[] = posts.slice(0, count).map((post) => ({
    id: post.id,
    title: post.title ?? "",
    subtitle: new Date(post.created_at).toLocaleDateString("ko-KR"),
    imageUrl: (post.thumbnail_visible !== false ? post.featured_image_url || post.photo_url : null) ?? undefined,
    linkUrl: `/boards/${boardId}/${post.slug ?? post.id}`,
    linkText: "더 보기",
  }));

  return (
    <div ref={(dom) => { if (dom) connect(dom); }}>
      <EditableBlockFrame label="타임라인 연동">
        <RevealWrapper motion={motion}>
          {!boardId ? (
            <div className="flex h-24 items-center justify-center bg-gray-50 text-xs text-gray-400">
              우측 설정 패널에서 게시판을 선택하세요
            </div>
          ) : loading ? (
            <div className="flex h-24 items-center justify-center text-xs text-gray-400">불러오는 중...</div>
          ) : (
            <AlternatingTimelineCanvas items={items} />
          )}
        </RevealWrapper>
      </EditableBlockFrame>
    </div>
  );
}

type BoardOption = { id: string; name: string };

function TimelineEmbedSettings() {
  const { props, setProp } = useNode((node) => ({ props: node.data.props as TimelineEmbedBlockProps }));
  const editable = useCraftEditable();
  const [boards, setBoards] = useState<BoardOption[]>([]);
  const { availableCategories } = useBoardPosts(editable ? props.boardId || null : null, 1);

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
          onChange={(e) => setProp((p) => { p.boardId = e.target.value; p.category = ""; })}
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
      {props.boardId && (
        <label className="block text-xs text-gray-600">
          카테고리 필터
          <select
            value={props.category ?? ""}
            onChange={(e) => setProp((p) => { p.category = e.target.value; })}
            className="mt-1 w-full rounded border border-gray-300 px-2 py-1 text-xs"
          >
            <option value="">전체</option>
            {availableCategories.map((cat) => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
          </select>
        </label>
      )}
      <label className="block text-xs text-gray-600">
        개수
        <input
          type="number"
          min={1}
          max={30}
          value={props.count}
          onChange={(e) => setProp((p) => { p.count = Number(e.target.value) || 10; })}
          className="mt-1 w-full rounded border border-gray-300 px-2 py-1 text-xs"
        />
      </label>
      <MotionSettingsSection />
    </div>
  );
}

TimelineEmbedBlock.craft = {
  displayName: "TimelineEmbedBlock",
  props: {
    boardId: "",
    count: 10,
    category: "",
    motion: DEFAULT_MOTION,
  } satisfies TimelineEmbedBlockProps,
  related: { settings: TimelineEmbedSettings },
};
