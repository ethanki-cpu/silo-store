"use client";

import { useState } from "react";
import type { DepthVideo } from "@/lib/membershipContentDefaults";

// HOTFIX-165.1 / HOTFIX-167.6(사용자 지시 — "오버레이 영상을 여러 개 플레이리스트로 올리고 반복"): 관리자가 올린 영상(webm/mp4)을 깊이 위에 겹친다.
// 영상마다 불투명도(0~100)·혼합 방식(screen은 검은 배경 영상을 빛처럼 얹을 때, normal은 알파 채널 webm)·채우기 방식을 정한다. 자동 재생·무음.
//  · 겹치기(기본): 목록의 영상을 전부 동시에 겹쳐 각자 반복 재생.
//  · 플레이리스트: 목록 순서대로 한 편씩 재생하고 끝나면 다음 편, 마지막 편이 끝나면 처음부터 계속 반복. 다음 편은 미리 받아 두어 이음새가 끊기지 않게 하고, 재생 못 하는 파일은 건너뛴다.
// 깊이가 화면 근처일 때만 마운트해(호출부 `near`) 멀리 있는 깊이의 영상은 내려받지 않는다.
const clamp01 = (n: number | undefined) => Math.min(100, Math.max(0, n ?? 100)) / 100;

function Playlist({ list }: { list: DepthVideo[] }) {
  const [idx, setIdx] = useState(0);
  const cur = list[idx % list.length];
  const next = list[(idx + 1) % list.length];
  const advance = () => setIdx((i) => (i + 1) % list.length);
  return (
    <>
      {/* key로 편이 바뀔 때마다 새 <video>가 마운트돼 처음부터 재생된다. 한 편뿐이면 그냥 loop. */}
      <video
        key={`${idx}-${cur.id}`}
        src={cur.url}
        autoPlay
        muted
        playsInline
        preload="auto"
        loop={list.length === 1}
        onEnded={advance}
        onError={advance}
        className="absolute inset-0 h-full w-full"
        style={{ objectFit: cur.fit ?? "cover", opacity: clamp01(cur.opacity), mixBlendMode: cur.blend ?? "normal" }}
      />
      {/* 다음 편 미리 받아두기(화면에는 안 보임) */}
      {list.length > 1 && <video key={`pre-${next.id}`} src={next.url} muted playsInline preload="auto" className="hidden" />}
    </>
  );
}

export function DepthVideoLayer({ videos, playlist = false }: { videos: DepthVideo[]; playlist?: boolean }) {
  const list = videos.filter((v) => v.url);
  if (list.length === 0) return null;
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
      {playlist ? (
        <Playlist list={list} />
      ) : (
        list.map((v) => (
          <video
            key={v.id}
            src={v.url}
            autoPlay
            loop
            muted
            playsInline
            preload="auto"
            className="absolute inset-0 h-full w-full"
            style={{ objectFit: v.fit ?? "cover", opacity: clamp01(v.opacity), mixBlendMode: v.blend ?? "normal" }}
          />
        ))
      )}
    </div>
  );
}
