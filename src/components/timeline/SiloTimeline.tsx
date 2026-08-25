"use client";

// EPIC-147(사용자 지시 — Knight Lab Timeline NG의 구조/프론트엔드를 그대로
// 써서 사일로 게시글을 인터랙티브 타임라인으로 보여달라): Svelte 5 컴포넌트
// (@knight-lab/timeline-ng의 SlidePlayer)를 React/Next.js 안에서 쓰기 위한
// 브릿지. 실제 마운트는 SiloTimelineInner.tsx가 담당하고, 여기서는
// next/dynamic({ssr:false})로 그 파일 자체를 클라이언트 전용으로만 불러온다
// — SSR 중에 이 모듈이 평가되면 timeline-ng 번들이 최상위에서 부르는
// DOMPurify.addHook(...)이 `window` 없는 Node 환경에서 죽는다(자세한 원인은
// SiloTimelineInner.tsx 주석 참고).
import dynamic from "next/dynamic";

const SiloTimelineInner = dynamic(() => import("./SiloTimelineInner"), {
  ssr: false,
  loading: () => <div style={{ minHeight: 600 }} className="animate-pulse bg-gray-50" />,
});

export function SiloTimeline({ boardId, theme }: { boardId: string; theme?: "light" | "dark" | "auto" }) {
  return <SiloTimelineInner boardId={boardId} theme={theme} />;
}
