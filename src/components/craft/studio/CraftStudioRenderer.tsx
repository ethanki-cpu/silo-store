"use client";

// EPIC-099(항목 3, Phase 2): 스튜디오 공개 렌더러 — 공용 CraftPageRenderer
// 셸에 이 페이지의 resolver/defaultTree만 끼워 넣는다.
import { CraftPageRenderer } from "@/components/craft/shared/CraftPageRenderer";
import { craftStudioResolver } from "./resolver";
import { studioDefaultTree } from "./defaultTree";

export function CraftStudioRenderer({ craftState }: { craftState?: string | null }) {
  return <CraftPageRenderer resolver={craftStudioResolver} craftState={craftState} defaultTree={studioDefaultTree} />;
}
