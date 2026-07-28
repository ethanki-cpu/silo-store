"use client";

import Link from "next/link";
import type { BoardDefinition, BoardPost, HubFeed, HubChildBoard } from "@/lib/boardLayout";
import { TimelineView } from "@/components/TimelineView";
import { EmptyState } from "@/components/modules/EmptyState";
import { CommunityListModule } from "@/components/modules/CommunityListModule";
import { StoryThumbnailModule } from "@/components/modules/StoryThumbnailModule";
import { GalleryModule } from "@/components/modules/GalleryModule";
import { SlideModule } from "@/components/modules/SlideModule";

// Timeline Engine(EPIC-050): 연→월 순으로 묶어 보여주는 그룹핑 로직 —
// 독립 컴포넌트가 아니라 이 파일 안의 재사용 가능한 함수로 유지해, 향후
// 마이페이지 타임라인 탭(현재 PlaceholderPanel) 등 다른 화면도 "정렬된
// {created_at, title, ...} 목록"만 넘기면 같은 방식으로 묶을 수 있게 한다.
// timeline: 사일로상점+살롱데상의 모든 이벤트를 연/월/일 순으로 보여주는
// 반응형 타임라인 — 그룹핑/렌더링은 공용 Timeline Engine
// (src/lib/timelineEngine.ts + src/components/TimelineView.tsx)을 그대로
// 재사용하고, 여기서는 BoardPost를 그 계약({id, createdAt})에 맞게
// 어댑팅만 한다.
function BoardTimelineView({ boardId, posts }: { boardId: string; posts: BoardPost[] }) {
  const entries = posts.map((post) => ({ ...post, createdAt: post.created_at }));

  return (
    <TimelineView
      entries={entries}
      renderItem={(post) => (
        <Link href={`/boards/${boardId}/${post.id}`} className="block group">
          <p className="text-xs text-gray-400">
            {new Date(post.created_at).getDate()}일
          </p>
          <p className="font-serif text-gray-900 group-hover:underline">
            {post.title}
          </p>
        </Link>
      )}
    />
  );
}

// hub: 하위 게시판의 최신글/인기글/추천글 슬라이드(Slide Module, EPIC-056)
// + 하위 게시판 카드.
function HubView({
  hubFeed,
  hubChildBoards,
}: {
  hubFeed: HubFeed;
  hubChildBoards?: HubChildBoard[];
}) {
  return (
    <div>
      <SlideModule title="최신글" items={hubFeed.latest} />
      <SlideModule title="인기글" items={hubFeed.popular} />
      <SlideModule title="추천글" items={hubFeed.recommended} />

      {/* hubChildBoards가 아예 주어지지 않으면(예: 최상위 /boards 디렉토리처럼
          그룹별 목록을 이 컴포넌트 밖에서 직접 그리는 페이지) 이 섹션 자체를
          생략한다 — 진짜 hub 게시판(Silo Store 등)은 항상 배열을 넘긴다. */}
      {hubChildBoards && (
      <section>
        <h2 className="text-xs uppercase tracking-wide text-gray-400 mb-3">
          하위 게시판
        </h2>
        {hubChildBoards.length === 0 ? (
          <p className="text-sm text-gray-400">하위 게시판이 없어요.</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {hubChildBoards.map((board) =>
              board.locked ? (
                <div
                  key={board.id}
                  className="rounded-lg border border-gray-100 p-4 text-gray-300 cursor-not-allowed"
                >
                  <p className="font-serif font-medium">🔒 {board.name}</p>
                  <p className="text-xs mt-1">{board.lockMessage}</p>
                </div>
              ) : (
                <Link
                  key={board.id}
                  href={`/boards/${board.id}`}
                  className="block rounded-lg border border-gray-100 p-4 hover:shadow-md transition-shadow group"
                >
                  <p className="font-serif font-medium text-gray-900 group-hover:underline">
                    {board.name}
                  </p>
                </Link>
              ),
            )}
          </div>
        )}
      </section>
      )}
    </div>
  );
}

// Board Definition System(EPIC-047~050): 게시판별로 화면을 새로 만들지
// 않고, BoardDefinition.boardType 하나로 community/story/gallery/hub/
// timeline 다섯 레이아웃 중 하나를 선택해 렌더링한다 — definition을 통째로
// 받는 이유는, 태그/썸네일 같은 세부 토글도 여기서 그대로 참조할 수 있게
// 하기 위함. hub는 자기 자신의 글 목록(posts)이 아니라 하위 게시판들의
// 종합 피드(hubFeed)+카드(hubChildBoards)를 받아 그린다.
//
// EPIC-056: 각 레이아웃은 이제 독립적으로 재사용 가능한 Board Module
// (CommunityListModule/StoryThumbnailModule/GalleryModule/SlideModule,
// 전부 src/components/modules/)로 위임한다 — 이 컴포넌트는 boardType에
// 따라 알맞은 모듈을 고르는 조합기일 뿐, 레이아웃 마크업을 직접 갖지
// 않는다.
export function BoardRenderer({
  definition,
  boardId,
  posts,
  isQna,
  hubFeed,
  hubChildBoards,
}: {
  definition: BoardDefinition;
  boardId: string;
  posts: BoardPost[];
  isQna: boolean;
  hubFeed?: HubFeed;
  hubChildBoards?: HubChildBoard[];
}) {
  if (definition.boardType === "hub") {
    return (
      <HubView
        hubFeed={hubFeed ?? { latest: [], popular: [], recommended: [] }}
        hubChildBoards={hubChildBoards}
      />
    );
  }

  if (posts.length === 0) {
    // EPIC-054C: Board가 없는/게시글이 0건인 Board는 Placeholder Module이
    // 아니라 공용 EmptyState(Empty State Module, EPIC-056)로 보여준다.
    return <EmptyState title="아직 게시글이 없어요." />;
  }

  switch (definition.boardType) {
    case "story":
      return <StoryThumbnailModule boardId={boardId} posts={posts} />;
    case "gallery":
      return <GalleryModule boardId={boardId} posts={posts} />;
    case "timeline":
      return <BoardTimelineView boardId={boardId} posts={posts} />;
    case "community":
    default:
      return <CommunityListModule boardId={boardId} posts={posts} isQna={isQna} />;
  }
}
