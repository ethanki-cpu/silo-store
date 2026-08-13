"use client";

// EPIC-099(항목 3, Phase 2): 홈페이지 전용이던 CraftHomeRenderer.tsx의
// 일반화 버전 — resolver/defaultTree를 파라미터로 받아 어떤 Craft 페이지든
// 재사용한다. CraftHomeRenderer.tsx 자체는 이미 검증·병합된 코드라 건드리지
// 않고 그대로 둔다(회귀 위험 최소화) — 새 페이지(사일로 상점 등)부터 이
// 공용 셸을 쓴다.
import { Editor, Frame, type Resolver } from "@craftjs/core";
import type { ReactNode } from "react";
import { editorialSerif } from "@/components/craft/home/font";

export function CraftPageRenderer({
  resolver,
  craftState,
  defaultTree,
}: {
  resolver: Resolver;
  craftState?: string | null;
  defaultTree: ReactNode;
}) {
  return (
    <div className={`craft-home ${editorialSerif.variable}`}>
      <Editor resolver={resolver} enabled={false}>
        <Frame data={craftState ?? undefined}>{!craftState && defaultTree}</Frame>
      </Editor>
    </div>
  );
}
