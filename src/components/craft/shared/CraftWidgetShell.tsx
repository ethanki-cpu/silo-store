"use client";

// EPIC-099(Phase 3): Native Page Builder 위젯 안에 Craft 블록 하나를 섞어
// 넣기 위한 최소 셸. CraftPageRenderer(페이지 전체를 Craft가 그리는 용도)와
// 달리 이건 단일 블록 하나만을 위한 Editor+Frame 컨텍스트다 — Craft 블록은
// useNode()로 자기 Craft 노드 컨텍스트를 읽으므로(EditableBlockFrame의
// "편집 모드인가" 체크 포함) <Editor><Frame> 밖에서 직접 렌더링하면 크래시
// 한다. enabled={false}로 고정해 공개 페이지 어디서 쓰이든 항상 보기 전용
// (인라인 더블클릭 편집 없음)으로만 렌더링한다 — 편집은 이 위젯의
// WidgetInspectorForm 필드 폼으로만 한다.
import { Editor, Frame, Element, type Resolver } from "@craftjs/core";
import type { ReactNode } from "react";
import { RootContainer } from "@/components/craft/home/RootContainer";
import { editorialSerif } from "@/components/craft/home/font";

export function CraftWidgetShell({ resolver, children }: { resolver: Resolver; children: ReactNode }) {
  return (
    <div className={`craft-home ${editorialSerif.variable}`}>
      <Editor resolver={resolver} enabled={false}>
        <Frame>
          <Element is={RootContainer} canvas id="ROOT">
            {children}
          </Element>
        </Frame>
      </Editor>
    </div>
  );
}
