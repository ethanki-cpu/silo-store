import { SlideModule } from "@/components/modules/SlideModule";
import type { HubFeedItem } from "@/lib/boardLayout";
import type { BoardRendererProps } from "./types";

// EPIC-066: Renderer Registry의 "slide" 항목 — HubRenderer가 하위 게시판
// 종합 피드에 쓰는 기존 SlideModule을, 이 게시판 자기 자신의 글로 1열
// 재사용한다(새 UI를 만들지 않고 기존 컴포넌트만 다른 데이터로 그림).
export function SlideRenderer({ boardId, posts, definition }: BoardRendererProps) {
  const items: HubFeedItem[] = posts.map((post) => ({
    id: post.id,
    board_id: boardId,
    board_name: definition.title_ko,
    title: post.title,
    like_count: post.like_count,
    author_name: post.author_name,
    created_at: post.created_at,
    photo_url: post.photo_url,
    comment_count: post.comment_count,
    view_count: post.view_count ?? undefined,
    tags: post.tags ?? undefined,
  }));

  return <SlideModule title={definition.title_ko} items={items} />;
}
