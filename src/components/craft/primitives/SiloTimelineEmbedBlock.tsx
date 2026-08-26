"use client";

// HOTFIX-147.3(사용자 지시 — 온라인 도슨트 2단계 카테고리 페이지(혁명~제국
// 등)에도 클래식 타임라인을 넣고, Craft 에디터로 자유롭게 편집할 수 있게
// 해달라는 요청): 이미 있는 TimelineEmbedBlock(AlternatingTimelineCanvas,
// 손으로 스타일링한 zig-zag 카드형)과는 다른 블록이다 — 이건 실제
// TimelineJS3(SiloTimeline, EPIC-147) 위젯을 그대로 Craft 캔버스에 꽂는다.
// 게시판 하나(mode="board")뿐 아니라, site_navigations의 한 branch(href)
// 아래 모든 하위 게시판 글을 한 타임라인에 모으는 집계 모드(mode="group")도
// 지원한다 — 온라인 도슨트 2단계 카테고리 페이지가 이 모드를 쓴다.
import { useEffect, useState } from "react";
import { useNode } from "@craftjs/core";
import { EditableBlockFrame, useCraftEditable } from "@/components/craft/home/editable";
import { RevealWrapper } from "@/components/craft/shared/RevealWrapper";
import { MotionSettingsSection } from "@/components/craft/shared/MotionSettingsSection";
import { DEFAULT_MOTION, type MotionConfig } from "@/lib/useScrollReveal";
import { SiloTimeline } from "@/components/timeline/SiloTimeline";
import { supabase } from "@/lib/supabaseClient";

export type SiloTimelineEmbedBlockProps = {
  mode: "board" | "group";
  boardId: string;
  groupHref: string;
  stageHeightPx: number;
  motion?: MotionConfig;
};

export function SiloTimelineEmbedBlock({
  mode,
  boardId,
  groupHref,
  stageHeightPx,
  motion = DEFAULT_MOTION,
}: SiloTimelineEmbedBlockProps) {
  const {
    connectors: { connect },
  } = useNode();
  const ready = mode === "group" ? !!groupHref : !!boardId;

  return (
    <div ref={(dom) => { if (dom) connect(dom); }}>
      <EditableBlockFrame label="사일로 타임라인 연동">
        <RevealWrapper motion={motion}>
          {!ready ? (
            <div className="flex h-24 items-center justify-center bg-gray-50 text-xs text-gray-400">
              우측 설정 패널에서 {mode === "group" ? "카테고리" : "게시판"}을 선택하세요
            </div>
          ) : mode === "group" ? (
            <SiloTimeline groupHref={groupHref} stageHeightPx={stageHeightPx || undefined} />
          ) : (
            <SiloTimeline boardId={boardId} stageHeightPx={stageHeightPx || undefined} />
          )}
        </RevealWrapper>
      </EditableBlockFrame>
    </div>
  );
}

type BoardOption = { id: string; name: string };
type NavOption = { href: string; title: string };

function SiloTimelineEmbedSettings() {
  const { props, setProp } = useNode((node) => ({ props: node.data.props as SiloTimelineEmbedBlockProps }));
  const editable = useCraftEditable();
  const [boards, setBoards] = useState<BoardOption[]>([]);
  const [navGroups, setNavGroups] = useState<NavOption[]>([]);

  useEffect(() => {
    if (!editable) return;
    fetch("/api/boards")
      .then((res) => res.json())
      .then((data) => setBoards(Array.isArray(data) ? data : []))
      .catch(() => setBoards([]));
    // 자식이 있는 site_navigations 노드만 "카테고리 그룹" 후보로 보여준다 —
    // 게시판 하나짜리 leaf가 아니라 여러 하위 게시판을 묶는 branch만 의미가 있다.
    supabase
      .from("site_navigations")
      .select("id, parent_id, href, title")
      .then(({ data }) => {
        const rows = (data ?? []) as { id: string; parent_id: string | null; href: string | null; title: string }[];
        const parentIds = new Set(rows.map((r) => r.parent_id).filter(Boolean));
        setNavGroups(
          rows
            .filter((r) => parentIds.has(r.id) && r.href)
            .map((r) => ({ href: r.href as string, title: r.title })),
        );
      });
  }, [editable]);

  return (
    <div className="space-y-3">
      <label className="block text-xs text-gray-600">
        모드
        <select
          value={props.mode}
          onChange={(e) => setProp((p) => { p.mode = e.target.value as SiloTimelineEmbedBlockProps["mode"]; })}
          className="mt-1 w-full rounded border border-gray-300 px-2 py-1 text-xs"
        >
          <option value="board">게시판 하나</option>
          <option value="group">카테고리(하위 게시판 전부 모아서)</option>
        </select>
      </label>

      {props.mode === "board" ? (
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
      ) : (
        <label className="block text-xs text-gray-600">
          카테고리
          <select
            value={props.groupHref}
            onChange={(e) => setProp((p) => { p.groupHref = e.target.value; })}
            className="mt-1 w-full rounded border border-gray-300 px-2 py-1 text-xs"
          >
            <option value="">선택 안 함</option>
            {navGroups.map((g) => (
              <option key={g.href} value={g.href}>
                {g.title}
              </option>
            ))}
          </select>
        </label>
      )}

      <label className="block text-xs text-gray-600">
        슬라이드 영역 높이(px, 비우면 자동)
        <input
          type="number"
          min={300}
          max={1200}
          value={props.stageHeightPx || ""}
          placeholder="자동"
          onChange={(e) => setProp((p) => { p.stageHeightPx = Number(e.target.value) || 0; })}
          className="mt-1 w-full rounded border border-gray-300 px-2 py-1 text-xs"
        />
      </label>

      <MotionSettingsSection />
    </div>
  );
}

SiloTimelineEmbedBlock.craft = {
  displayName: "SiloTimelineEmbedBlock",
  props: {
    mode: "board",
    boardId: "",
    groupHref: "",
    stageHeightPx: 0,
    motion: DEFAULT_MOTION,
  } satisfies SiloTimelineEmbedBlockProps,
  related: { settings: SiloTimelineEmbedSettings },
};
