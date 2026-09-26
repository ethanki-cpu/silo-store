"use client";

import type { DepthVideo } from "@/lib/membershipContentDefaults";

// HOTFIX-165.1(사용자 지시 — "각 depth마다 opacity 조절되는 webm을 올릴 수 있게"): 관리자가 올린 영상(webm/mp4)을 깊이 위에 겹친다.
// 영상마다 불투명도(0~100)·혼합 방식(screen은 검은 배경 영상을 빛처럼 얹을 때, normal은 알파 채널 webm)·채우기 방식을 정한다.
// 자동 재생·반복·무음. 깊이가 화면 근처일 때만 마운트해(호출부 `near`) 멀리 있는 깊이의 영상은 내려받지 않는다.
export function DepthVideoLayer({ videos }: { videos: DepthVideo[] }) {
  const list = videos.filter((v) => v.url);
  if (list.length === 0) return null;
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
      {list.map((v) => (
        <video
          key={v.id}
          src={v.url}
          autoPlay
          loop
          muted
          playsInline
          preload="auto"
          className="absolute inset-0 h-full w-full"
          style={{ objectFit: v.fit ?? "cover", opacity: Math.min(100, Math.max(0, v.opacity ?? 100)) / 100, mixBlendMode: v.blend ?? "normal" }}
        />
      ))}
    </div>
  );
}
