import type { BoardDefinition, BoardPost, HubFeed, HubChildBoard } from "@/lib/boardLayout";

// EPIC-066: Renderer Registry가 공유하는 단일 props 계약 — 모든 Renderer가
// 같은 모양을 받고, 자신에게 필요한 필드만 골라 쓴다(hub는 posts를 안 쓰고
// hubFeed/hubChildBoards를 쓰는 식). 이렇게 하면 BoardRendererRegistry가
// board_type을 몰라도 "이 props로 이 컴포넌트를 그린다"만 알면 되므로
// switch/case 없이 확장 가능하다 — 새 레이아웃을 추가할 때는 Renderer
// 컴포넌트 하나 + registry.ts에 한 줄만 추가하면 된다.
export type BoardRendererProps = {
  definition: BoardDefinition;
  boardId: string;
  posts: BoardPost[];
  isQna: boolean;
  hubFeed?: HubFeed;
  hubChildBoards?: HubChildBoard[];
  // EPIC-065: Board Widget "썸네일" 토글.
  showThumbnail?: boolean;
  // EPIC-066: 게시글이 아니라 게시판 단위 속성인 카테고리 — Story/
  // Community/Gallery Renderer가 태그 칩으로 함께 보여준다.
  boardCategory?: string | null;
};
