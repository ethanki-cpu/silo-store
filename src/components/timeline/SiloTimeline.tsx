"use client";

// EPIC-147/EPIC-147-후속: 사일로 게시글을 클래식 TimelineJS3(사용자가
// 원한 스타일)로 렌더링하는 브릿지. 실제 마운트는 SiloTimelineInner.tsx가
// 담당하고, 여기서는 next/dynamic({ssr:false})로 그 파일 자체를 클라이언트
// 전용으로만 불러온다 — TimelineJS3의 Timeline 생성자가 곧바로 DOM
// (container.offsetHeight 등)을 건드리는데, Next.js가 "use client"
// 페이지도 최초 요청 때 Node.js에서 한 번 SSR하는 그 순간 `document`가
// 없어 죽는다(자세한 배경은 SiloTimelineInner.tsx 주석 참고).
import dynamic from "next/dynamic";

const SiloTimelineInner = dynamic(() => import("./SiloTimelineInner"), {
  ssr: false,
  loading: () => <div style={{ minHeight: 600 }} className="animate-pulse bg-gray-50" />,
});

export function SiloTimeline({ boardId, stageHeightPx }: { boardId: string; stageHeightPx?: number | null }) {
  return <SiloTimelineInner boardId={boardId} stageHeightPx={stageHeightPx} />;
}
