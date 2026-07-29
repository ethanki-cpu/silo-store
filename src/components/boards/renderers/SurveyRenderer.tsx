import { CommunityListModule } from "@/components/modules/CommunityListModule";
import { StubTypeBanner } from "./StubTypeBanner";
import type { BoardRendererProps } from "./types";

// EPIC-066: Renderer Registry의 "survey" 항목 — 스텁(StubTypeBanner 참고).
export function SurveyRenderer({ boardId, posts, isQna, boardCategory, definition }: BoardRendererProps) {
  return (
    <div>
      <StubTypeBanner
        emoji="📊"
        message="설문형 게시판이에요 — 투표 집계 기능은 아직 준비 중이라 글 목록만 보여드려요."
      />
      <CommunityListModule
        boardId={boardId}
        posts={posts}
        isQna={isQna}
        boardCategory={boardCategory}
        showLikes={definition.likes}
        showComments={definition.comments}
        showViewCount={definition.showViewCount}
      />
    </div>
  );
}
