// EPIC-147-후속: TimelineJS3(@knight-lab/timelinejs)는 <script src>로
// 직접 주입한다(SiloTimelineInner.tsx 상단 주석 참고 — import 방식은
// 두 가지 실측 문제로 막혔다) — 그 스크립트가 전역에 등록하는 `window.TL`
// 타입만 여기서 선언한다.
export {};

declare global {
  interface Window {
    TL?: {
      Timeline: new (elem: HTMLElement | string, data: unknown, options?: Record<string, unknown>) => {
        zoomIn(): void;
        zoomOut(): void;
      };
    };
  }
}
