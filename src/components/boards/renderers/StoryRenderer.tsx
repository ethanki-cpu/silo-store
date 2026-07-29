import { StoryThumbnailModule } from "@/components/modules/StoryThumbnailModule";
import type { BoardRendererProps } from "./types";

// EPIC-066: Renderer Registry의 "story" 항목 — 실제 렌더링 로직은
// StoryThumbnailModule(EPIC-056)에 그대로 위임하는 얇은 어댑터다.
export function StoryRenderer({ boardId, posts, showThumbnail, boardCategory }: BoardRendererProps) {
  return (
    <StoryThumbnailModule
      boardId={boardId}
      posts={posts}
      showThumbnail={showThumbnail}
      boardCategory={boardCategory}
    />
  );
}
