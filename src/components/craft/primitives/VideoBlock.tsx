"use client";

import { useNode } from "@craftjs/core";
import { useRef } from "react";
import { EditableBlockFrame, useCraftEditable } from "@/components/craft/home/editable";
import { RevealWrapper } from "@/components/craft/shared/RevealWrapper";
import { MotionSettingsSection } from "@/components/craft/shared/MotionSettingsSection";
import { FreePositionHandles } from "@/components/craft/shared/FreePositionHandles";
import { FreePositionSettingsSection } from "@/components/craft/shared/FreePositionSettingsSection";
import { DEFAULT_MOTION, type MotionConfig } from "@/lib/useScrollReveal";
import { DEFAULT_FREE_POSITION, freePositionStyle, type FreePosition } from "@/lib/useFreePosition";

export type VideoBlockProps = {
  url: string;
  autoplay: boolean;
  loop: boolean;
  muted: boolean;
  aspectRatio: string;
  motion?: MotionConfig;
  position?: FreePosition;
};

function parseEmbed(url: string): { type: "youtube" | "vimeo" | "file" | "empty"; id?: string } {
  if (!url) return { type: "empty" };
  const youtube = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([\w-]+)/);
  if (youtube) return { type: "youtube", id: youtube[1] };
  const vimeo = url.match(/vimeo\.com\/(\d+)/);
  if (vimeo) return { type: "vimeo", id: vimeo[1] };
  return { type: "file" };
}

export function VideoBlock({ url, autoplay, loop, muted, aspectRatio, motion = DEFAULT_MOTION, position = DEFAULT_FREE_POSITION }: VideoBlockProps) {
  const {
    connectors: { connect },
    setProp,
  } = useNode();
  const editable = useCraftEditable();
  const boxRef = useRef<HTMLDivElement>(null);
  const parsed = parseEmbed(url);

  let content;
  if (parsed.type === "empty") {
    content = (
      <div className="flex h-full w-full items-center justify-center bg-gray-100 text-xs text-gray-400">
        {editable ? "우측 설정 패널에서 영상 URL을 입력하세요" : ""}
      </div>
    );
  } else if (parsed.type === "youtube") {
    const params = new URLSearchParams({
      autoplay: autoplay ? "1" : "0",
      loop: loop ? "1" : "0",
      mute: muted || autoplay ? "1" : "0",
      playlist: loop ? (parsed.id ?? "") : "",
    });
    content = (
      <iframe
        src={`https://www.youtube.com/embed/${parsed.id}?${params.toString()}`}
        className="h-full w-full"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        allowFullScreen
      />
    );
  } else if (parsed.type === "vimeo") {
    const params = new URLSearchParams({
      autoplay: autoplay ? "1" : "0",
      loop: loop ? "1" : "0",
      muted: muted || autoplay ? "1" : "0",
    });
    content = (
      <iframe
        src={`https://player.vimeo.com/video/${parsed.id}?${params.toString()}`}
        className="h-full w-full"
        allow="autoplay; fullscreen; picture-in-picture"
        allowFullScreen
      />
    );
  } else {
    content = (
      <video
        src={url}
        className="h-full w-full object-cover"
        autoPlay={autoplay}
        loop={loop}
        muted={muted || autoplay}
        playsInline
        controls={!autoplay}
      />
    );
  }

  return (
    <div ref={(dom) => { if (dom) { connect(dom); boxRef.current = dom; } }} style={freePositionStyle(position)} className={position.enabled ? "h-full" : undefined}>
      <FreePositionHandles
        position={position}
        onChange={(next) => setProp((p) => { p.position = next; })}
        anchorRef={boxRef}
      />
      <EditableBlockFrame label="영상">
        <RevealWrapper motion={motion} className={position.enabled ? "block h-full" : undefined}>
          <div style={position.enabled ? undefined : { aspectRatio }} className="h-full w-full overflow-hidden bg-black">
            {content}
          </div>
        </RevealWrapper>
      </EditableBlockFrame>
    </div>
  );
}

function VideoSettings() {
  const { props, setProp } = useNode((node) => ({ props: node.data.props as VideoBlockProps }));

  return (
    <div className="space-y-3">
      <label className="block text-xs text-gray-600">
        영상 URL(YouTube/Vimeo/mp4)
        <input
          type="text"
          value={props.url}
          onChange={(e) => setProp((p) => { p.url = e.target.value; })}
          className="mt-1 w-full rounded border border-gray-300 px-2 py-1 text-xs"
        />
      </label>
      <label className="flex items-center gap-2 text-xs text-gray-600">
        <input
          type="checkbox"
          checked={props.autoplay}
          onChange={(e) => setProp((p) => { p.autoplay = e.target.checked; })}
        />
        자동재생(음소거로 강제 적용)
      </label>
      <label className="flex items-center gap-2 text-xs text-gray-600">
        <input
          type="checkbox"
          checked={props.loop}
          onChange={(e) => setProp((p) => { p.loop = e.target.checked; })}
        />
        반복재생
      </label>
      <label className="flex items-center gap-2 text-xs text-gray-600">
        <input
          type="checkbox"
          checked={props.muted}
          onChange={(e) => setProp((p) => { p.muted = e.target.checked; })}
        />
        음소거
      </label>
      <label className="block text-xs text-gray-600">
        가로세로 비율(CSS aspect-ratio, 예: 16/9)
        <input
          type="text"
          value={props.aspectRatio}
          onChange={(e) => setProp((p) => { p.aspectRatio = e.target.value; })}
          className="mt-1 w-full rounded border border-gray-300 px-2 py-1 text-xs"
        />
      </label>
      <MotionSettingsSection />
      <FreePositionSettingsSection />
    </div>
  );
}

VideoBlock.craft = {
  displayName: "VideoBlock",
  props: {
    url: "",
    autoplay: false,
    loop: false,
    muted: true,
    aspectRatio: "16/9",
    motion: DEFAULT_MOTION,
    position: DEFAULT_FREE_POSITION,
  } satisfies VideoBlockProps,
  related: { settings: VideoSettings },
};
