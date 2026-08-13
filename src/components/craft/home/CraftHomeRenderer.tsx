"use client";

// EPIC-098: 공개 홈페이지가 쓰는 읽기 전용 Craft.js 렌더러.
// EPIC-102: 다른 5개 페밀리와 동일한 공용 셸(CraftPageRenderer)에 위임하도록
// 마이그레이션 — 기본 트리는 defaultTree.tsx의 homeDefaultTree(다른 페밀리와
// 동일한 "컴포넌트가 아니라 값" 패턴)를 그대로 재사용한다. 동작은 이전과
// 동일(craft_state 있으면 그 트리, 없으면 6블록 기본 스켈레톤)하고, EPIC-101이
// 고친 `@container`도 CraftPageRenderer가 이미 갖고 있어 계속 유지된다.
import { CraftPageRenderer } from "@/components/craft/shared/CraftPageRenderer";
import { craftHomeResolver } from "./resolver";
import { homeDefaultTree } from "./defaultTree";

export function CraftHomeRenderer({ craftState }: { craftState?: string | null }) {
  return <CraftPageRenderer resolver={craftHomeResolver} craftState={craftState} defaultTree={homeDefaultTree} />;
}
