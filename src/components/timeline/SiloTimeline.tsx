"use client";

// EPIC-147/EPIC-147-후속: 사일로 게시글을 클래식 TimelineJS3(사용자가
// 원한 스타일)로 렌더링하는 브릿지. 실제 마운트는 SiloTimelineInner.tsx가
// 담당하고, 여기서는 next/dynamic({ssr:false})로 그 파일 자체를 클라이언트
// 전용으로만 불러온다 — TimelineJS3의 Timeline 생성자가 곧바로 DOM
// (container.offsetHeight 등)을 건드리는데, Next.js가 "use client"
// 페이지도 최초 요청 때 Node.js에서 한 번 SSR하는 그 순간 `document`가
// 없어 죽는다(자세한 배경은 SiloTimelineInner.tsx 주석 참고).
import dynamic from "next/dynamic";
import type { TimelineCoverState } from "./SiloTimelineInner";

const SiloTimelineInner = dynamic(() => import("./SiloTimelineInner"), {
  ssr: false,
  loading: () => <div style={{ minHeight: 600 }} className="animate-pulse bg-gray-50" />,
});

// HOTFIX-147.3(사용자 지시 — "온라인 도슨트 2단계 카테고리 페이지에도
// 타임라인을 넣어줘, 그 하위 3단계 카테고리들이 보일 수 있도록"): boardId
// 하나 대신, 여러 하위 게시판의 글을 한 타임라인에 모아 보여주는
// groupHref 모드를 추가한다 — 둘 중 하나만 넘긴다.
export function SiloTimeline({
  boardId,
  groupHref,
  stageHeightPx,
  initialZoomFactor,
  onCoverStateChange,
  markerColor,
  markerCardBg,
  markerCardText,
  markerCardHoverBg,
  markerCardHoverText,
  markerCardActiveBg,
  markerCardActiveText,
}: {
  boardId?: string;
  groupHref?: string;
  stageHeightPx?: number | null;
  /** HOTFIX-147.19(사용자 지시 — "대시보드가 그 타임라인 전체를 한눈에
   * 볼 수 없도록 줌인되어있다, 처음 default로 줌인되어있는걸 조절할수
   * 있는 기능을 넣고 전체를 한눈에 볼수있도록 줌을 조절해달라"):
   * TL3의 TimeNav 확대 배율(scale_factor, 낮을수록 더 넓게/줌아웃) —
   * SiloTimelineInner.tsx 주석 참고. */
  initialZoomFactor?: number | null;
  /** HOTFIX-147.8: SiloTimelineEmbedBlock의 표지 자유배치 오버레이용 —
   * SiloTimelineInner.tsx 주석 참고. */
  onCoverStateChange?: (state: TimelineCoverState) => void;
  /** HOTFIX-156.4: 대시보드(TimeNav) 이벤트 마커 점/카드 색상 커스터마이즈 —
   * SiloTimelineInner.tsx 주석 참고. null이면 TL3 기본 색상. */
  markerColor?: string | null;
  markerCardBg?: string | null;
  markerCardText?: string | null;
  markerCardHoverBg?: string | null;
  markerCardHoverText?: string | null;
  markerCardActiveBg?: string | null;
  markerCardActiveText?: string | null;
}) {
  return (
    <SiloTimelineInner
      boardId={boardId}
      groupHref={groupHref}
      stageHeightPx={stageHeightPx}
      initialZoomFactor={initialZoomFactor}
      onCoverStateChange={onCoverStateChange}
      markerColor={markerColor}
      markerCardBg={markerCardBg}
      markerCardText={markerCardText}
      markerCardHoverBg={markerCardHoverBg}
      markerCardHoverText={markerCardHoverText}
      markerCardActiveBg={markerCardActiveBg}
      markerCardActiveText={markerCardActiveText}
    />
  );
}
