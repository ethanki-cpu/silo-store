"use client";

import { useNode } from "@craftjs/core";
import { EditableBlockFrame } from "@/components/craft/home/editable";
import { TextField } from "@/components/craft/shared/FieldControls";

export type YoutubeBlockProps = {
  url: string;
};

// youtu.be/<id>, youtube.com/watch?v=<id>, youtube.com/embed/<id>,
// youtube.com/shorts/<id> — 흔한 4가지 형태를 전부 커버.
function extractYoutubeId(url: string): string | null {
  const patterns = [
    /youtu\.be\/([\w-]{11})/,
    /youtube\.com\/watch\?v=([\w-]{11})/,
    /youtube\.com\/embed\/([\w-]{11})/,
    /youtube\.com\/shorts\/([\w-]{11})/,
  ];
  for (const re of patterns) {
    const m = url.match(re);
    if (m) return m[1];
  }
  return null;
}

export function YoutubeBlock({ url }: YoutubeBlockProps) {
  const {
    connectors: { connect },
  } = useNode();
  const videoId = extractYoutubeId(url);

  return (
    <div ref={(dom) => { if (dom) connect(dom); }}>
      <EditableBlockFrame label="유튜브">
        <div className="px-6 py-4">
          {videoId ? (
            <div className="relative aspect-video w-full overflow-hidden rounded-md bg-black">
              <iframe
                src={`https://www.youtube.com/embed/${videoId}`}
                title="YouTube video"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                className="absolute inset-0 h-full w-full"
              />
            </div>
          ) : (
            <div className="flex aspect-video w-full items-center justify-center rounded-md bg-gray-100 text-xs text-gray-400">
              우측 설정 패널에서 유튜브 URL을 입력하세요
            </div>
          )}
        </div>
      </EditableBlockFrame>
    </div>
  );
}

function YoutubeSettings() {
  const { props, setProp } = useNode((node) => ({ props: node.data.props as YoutubeBlockProps }));

  return (
    <div className="space-y-3">
      <TextField
        label="유튜브 URL"
        value={props.url}
        placeholder="https://www.youtube.com/watch?v=..."
        onChange={(v) => setProp((p) => { p.url = v; })}
      />
    </div>
  );
}

YoutubeBlock.craft = {
  displayName: "YoutubeBlock",
  props: {
    url: "",
  } satisfies YoutubeBlockProps,
  related: { settings: YoutubeSettings },
};
