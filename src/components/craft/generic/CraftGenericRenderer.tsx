"use client";

// HOTFIX-152.18: 어떤 slug에도(CRAFT_RENDERERS 화이트리스트에 없어도) 쓸 수
// 있는 범용 Craft 공개 렌더러 — docent/CraftDocentRenderer.tsx와 동일한
// 패턴이지만 페이지 전용 블록 없이 genericResolver/genericDefaultTree만 쓴다.
import { CraftPageRenderer } from "@/components/craft/shared/CraftPageRenderer";
import { craftGenericResolver } from "./resolver";
import { genericDefaultTree } from "./defaultTree";

export function CraftGenericRenderer({ craftState }: { craftState?: string | null }) {
  return <CraftPageRenderer resolver={craftGenericResolver} craftState={craftState} defaultTree={genericDefaultTree} />;
}
