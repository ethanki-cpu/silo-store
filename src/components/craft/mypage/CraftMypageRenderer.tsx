"use client";

// EPIC-099(항목 3, Phase 2): 마이 페이지 공개 렌더러 — 공용 CraftPageRenderer
// 셸에 이 페이지의 resolver/defaultTree만 끼워 넣는다.
import { CraftPageRenderer } from "@/components/craft/shared/CraftPageRenderer";
import { craftMypageResolver } from "./resolver";
import { mypageDefaultTree } from "./defaultTree";

export function CraftMypageRenderer({ craftState }: { craftState?: string | null }) {
  return <CraftPageRenderer resolver={craftMypageResolver} craftState={craftState} defaultTree={mypageDefaultTree} />;
}
