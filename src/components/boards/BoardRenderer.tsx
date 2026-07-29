"use client";

import { BoardRendererRegistry, type BoardRendererProps } from "./renderers";
import { BoardEmptyState } from "./BoardEmptyState";

// Board Definition System(EPIC-047~050): 게시판별로 화면을 새로 만들지
// 않고, BoardDefinition.boardType 하나로 community/story/gallery/hub/
// timeline 다섯 레이아웃 중 하나를 선택해 렌더링한다.
//
// EPIC-066: board_type을 직접 분기하던 switch/case를
// BoardRendererRegistry(src/components/boards/renderers/index.ts)로
// 바꿨다 — 이 컴포넌트는 이제 "hub가 아니고 글이 0건이면 Empty State,
// 아니면 레지스트리에서 찾은 Renderer에게 넘긴다"는 얇은 라우팅만 한다.
export function BoardRenderer(props: BoardRendererProps) {
  const { definition, posts } = props;

  if (definition.boardType !== "hub" && posts.length === 0) {
    return <BoardEmptyState allowPosting={definition.allowPosting} />;
  }

  const Renderer = BoardRendererRegistry[definition.boardType];
  return <Renderer {...props} />;
}
