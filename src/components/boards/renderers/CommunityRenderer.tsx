import { CommunityListModule } from "@/components/modules/CommunityListModule";
import type { BoardRendererProps } from "./types";

// EPIC-066: Renderer Registry의 "community" 항목.
export function CommunityRenderer({ boardId, posts, isQna, boardCategory, definition }: BoardRendererProps) {
  return (
    <CommunityListModule
      boardId={boardId}
      posts={posts}
      isQna={isQna}
      boardCategory={boardCategory}
      showLikes={definition.likes}
      showComments={definition.comments}
      showViewCount={definition.showViewCount}
    />
  );
}
