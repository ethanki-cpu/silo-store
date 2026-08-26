import { SiloTimeline } from "@/components/timeline/SiloTimeline";
import type { BoardRendererProps } from "./types";

// EPIC-147: 게시판 목록(List)을 클래식 TimelineJS3 인터랙티브 슬라이드로
// 대체한다 — <SiloTimeline />이 /api/timeline/events에서 이 게시판의 글을
// 직접 다시 불러오므로, 이미 서버에서 내려준 `posts` prop은 쓰지 않는다
// (TLTimeline 스키마 변환은 API 라우트 한 곳에만 두고 싶어서 하는 의도적
// 선택). "게시판 관리" 미리보기 패널은 boardId="preview"(실제 게시판이
// 아님)로 호출하므로, 그 경우엔 실제 fetch 대신 안내 문구만 보여준다.
export function TimelineNgRenderer({ boardId, timelineNgStageHeightPx, timelineNgZoomFactor }: BoardRendererProps) {
  if (boardId === "preview") {
    return (
      <p className="p-6 text-sm text-gray-500">
        Timeline NG는 실제 게시글로만 미리 볼 수 있어요 — 저장 후 실제 게시판에서 확인하세요.
      </p>
    );
  }
  return <SiloTimeline boardId={boardId} stageHeightPx={timelineNgStageHeightPx} initialZoomFactor={timelineNgZoomFactor} />;
}
