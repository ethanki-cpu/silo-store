"use client";

import { useBoardPosts } from "@/lib/useBoardPosts";
import { SlideModule } from "@/components/modules/SlideModule";
import { GalleryModule } from "@/components/modules/GalleryModule";
import { TimelineView } from "@/components/TimelineView";
import { renderTimelinePostLabel, renderTimelinePostPreview } from "@/components/boards/renderers/TimelineRenderer";
import type { SortOption } from "@/lib/boardLayout";

// EPIC-060: Page Builder의 Slide/Gallery/Timeline 모듈은 (Board 모듈과
// 달리) 게시판 하나의 최신 글만 미리보기로 보여주는 용도라 자체 검색/정렬
// UI가 없다 — src/components/modules/{SlideModule,GalleryModule}.tsx와
// src/components/TimelineView.tsx는 그대로 재사용하고, 이 파일은 board_id
// 로부터 최신 글을 가져와(useBoardPosts) 각 컴포넌트가 요구하는 데이터
// 모양으로 바꿔주는 얇은 어댑터 3개만 담는다(새 UI/마크업 없음).

function EmptyBoardHint({ loading }: { loading: boolean }) {
  if (loading) return <p className="text-gray-400 text-sm">불러오는 중...</p>;
  return <p className="text-gray-400 text-sm">연결된 게시판이 없거나 글이 없어요.</p>;
}

export function DbSlideModule({
  boardId,
  title,
  sort = "latest",
}: {
  boardId: string | null;
  title?: string;
  // EPIC-061: 같은 게시판이라도 sort만 다르게 주면 "최신 글"/"인기 글"이
  // 서로 다른 실제 데이터를 보여주는 두 모듈이 된다(가짜 중복 아님).
  sort?: SortOption;
}) {
  const { board, posts, loading } = useBoardPosts(boardId, 12, sort);
  if (!boardId || (!loading && posts.length === 0)) return <EmptyBoardHint loading={loading} />;

  const items = posts.map((p) => ({
    id: p.id,
    board_id: boardId,
    board_name: board?.name ?? "",
    title: p.title,
    like_count: p.like_count,
    author_name: p.author_name,
    created_at: p.created_at,
    photo_url: p.photo_url,
    comment_count: p.comment_count,
    view_count: p.view_count,
    tags: p.tags ?? [],
  }));

  return <SlideModule title={title ?? board?.name ?? "최신 글"} items={items} boardId={boardId} />;
}

export function DbGalleryModule({ boardId }: { boardId: string | null }) {
  const { posts, loading } = useBoardPosts(boardId);
  if (!boardId || (!loading && posts.length === 0)) return <EmptyBoardHint loading={loading} />;
  return <GalleryModule boardId={boardId} posts={posts} />;
}

// HOTFIX-097: 페이지 빌더 Timeline 위젯도 게시판 렌더러(TimelineRenderer.tsx)와
// 동일한 라벨/미리보기 마크업을 재사용한다 — 두 곳에 마크업이 따로
// 존재하면 디자인이 갈라진다(GalleryModule을 Board Widget/Renderer가 함께
// 재사용하는 기존 관례와 동일). 배치 방향/미리보기 여부도 이 위젯이 가리키는
// 게시판의 widget_settings에서 그대로 읽는다.
export function DbTimelineModule({ boardId }: { boardId: string | null }) {
  const { board, posts, loading } = useBoardPosts(boardId, 50);
  if (!boardId || (!loading && posts.length === 0)) return <EmptyBoardHint loading={loading} />;

  const entries = posts.map((p) => ({ ...p, createdAt: p.created_at }));
  const settings = board?.widget_settings;

  return (
    <TimelineView
      entries={entries}
      orientation={settings?.timelineOrientation ?? "vertical"}
      align={settings?.postMetaStyle?.position ?? "left"}
      accentColorHex={settings?.timelineAccentColorHex}
      lineWidthPx={settings?.timelineLineWidthPx}
      markerSizePx={settings?.timelineMarkerSizePx}
      cardTheme={settings?.timelineCardTheme ?? "light"}
      renderItem={(entry) => renderTimelinePostLabel(boardId, entry, undefined, settings?.postMetaStyle)}
      renderPreview={
        settings?.timelineShowPreview === false
          ? undefined
          : (entry) => renderTimelinePostPreview(boardId, entry, settings?.postMetaStyle, settings?.timelineCardTheme ?? "light")
      }
    />
  );
}
