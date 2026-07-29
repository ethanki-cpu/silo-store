import { GalleryModule } from "@/components/modules/GalleryModule";
import type { BoardRendererProps } from "./types";

// EPIC-066: Renderer Registry의 "gallery" 항목.
export function GalleryRenderer({ boardId, posts, boardCategory }: BoardRendererProps) {
  return <GalleryModule boardId={boardId} posts={posts} boardCategory={boardCategory} />;
}
