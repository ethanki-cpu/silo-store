"use client";

// EPIC-099(항목 3, Phase 2): 온라인 도슨트 공개 렌더러 — 공용 CraftPageRenderer
// 셸에 이 페이지의 resolver/defaultTree만 끼워 넣는다.
import { CraftPageRenderer } from "@/components/craft/shared/CraftPageRenderer";
import { craftDocentResolver } from "./resolver";
import { docentDefaultTree } from "./defaultTree";

export function CraftDocentRenderer({ craftState }: { craftState?: string | null }) {
  return <CraftPageRenderer resolver={craftDocentResolver} craftState={craftState} defaultTree={docentDefaultTree} />;
}
