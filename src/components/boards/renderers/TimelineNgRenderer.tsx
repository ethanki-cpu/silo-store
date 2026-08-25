import { SiloTimeline } from "@/components/timeline/SiloTimeline";
import type { BoardRendererProps } from "./types";

// EPIC-147: 게시판 목록(List)을 Knight Lab Timeline NG 인터랙티브
// 슬라이드로 대체한다 — <SiloTimeline />이 /api/timeline/events에서 이
// 게시판의 글을 직접 다시 불러오므로, 이미 서버에서 내려준 `posts` prop은
// 쓰지 않는다(다른 Renderer들과 달리 이 레이아웃만 자체 fetch를 한다 —
// TLTimeline 스키마 변환은 API 라우트 한 곳에만 두고 싶어서 하는 의도적
// 선택, TimelineRenderer의 기존 EPIC-050 "연/월/일 리스트"와는 완전히
// 별개 레이아웃).
export function TimelineNgRenderer({ boardId }: BoardRendererProps) {
  return <SiloTimeline boardId={boardId} />;
}
