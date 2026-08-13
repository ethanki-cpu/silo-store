"use client";

// EPIC-099(항목 3, Phase 2): 사일로 상점 공개 렌더러 — 공용 CraftPageRenderer
// 셸에 이 페이지의 resolver/defaultTree만 끼워 넣는다.
import { CraftPageRenderer } from "@/components/craft/shared/CraftPageRenderer";
import { craftShopResolver } from "./resolver";
import { shopDefaultTree } from "./defaultTree";

export function CraftShopRenderer({ craftState }: { craftState?: string | null }) {
  return <CraftPageRenderer resolver={craftShopResolver} craftState={craftState} defaultTree={shopDefaultTree} />;
}
