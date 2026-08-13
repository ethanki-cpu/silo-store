"use client";

// EPIC-099(항목 3, Phase 2): 살롱데상 공개 렌더러 — 공용 CraftPageRenderer
// 셸에 이 페이지의 resolver/defaultTree만 끼워 넣는다.
import { CraftPageRenderer } from "@/components/craft/shared/CraftPageRenderer";
import { craftSalonResolver } from "./resolver";
import { salonDefaultTree } from "./defaultTree";

export function CraftSalonRenderer({ craftState }: { craftState?: string | null }) {
  return <CraftPageRenderer resolver={craftSalonResolver} craftState={craftState} defaultTree={salonDefaultTree} />;
}
