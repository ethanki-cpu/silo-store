import type { ComponentType } from "react";
import type { BoardLayoutType } from "@/lib/boardLayout";
import { StoryRenderer } from "./StoryRenderer";
import { CommunityRenderer } from "./CommunityRenderer";
import { GalleryRenderer } from "./GalleryRenderer";
import { TimelineRenderer } from "./TimelineRenderer";
import { HubRenderer } from "./HubRenderer";
import { SlideRenderer } from "./SlideRenderer";
import { SurveyRenderer } from "./SurveyRenderer";
import { CalendarRenderer } from "./CalendarRenderer";
import { ApplicationRenderer } from "./ApplicationRenderer";
import type { BoardRendererProps } from "./types";

export type { BoardRendererProps } from "./types";

// EPIC-066: Renderer Registry — board_type을 switch/case로 분기하던 것을
// "레이아웃 키 → 컴포넌트" 맵 하나로 바꾼다. 새 레이아웃을 추가할 때는
// Renderer 컴포넌트 파일 하나 + 이 맵에 한 줄만 추가하면 되고,
// BoardRenderer.tsx(호출부)는 전혀 손댈 필요가 없다 — 실제 존재하는
// BoardLayoutType 9종(community/story/gallery/hub/timeline/slide/survey/
// calendar/application, src/lib/boardLayout.ts) 전부를 키로 강제하므로
// (Record<BoardLayoutType, ...>) 새 레이아웃이 boardLayout.ts에 추가되는데
// 여기 등록을 빠뜨리면 타입 에러로 즉시 드러난다.
export const BoardRendererRegistry: Record<BoardLayoutType, ComponentType<BoardRendererProps>> = {
  story: StoryRenderer,
  community: CommunityRenderer,
  gallery: GalleryRenderer,
  timeline: TimelineRenderer,
  hub: HubRenderer,
  slide: SlideRenderer,
  survey: SurveyRenderer,
  calendar: CalendarRenderer,
  application: ApplicationRenderer,
};
