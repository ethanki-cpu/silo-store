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
        // HOTFIX-151.3: 공식 공개 API(Timeline.js "PUBLIC API" 섹션) —
        // 표지가 있으면 표지로 이동("대시보드 빈 영역 클릭 → 표지로 이동"
        // 기능에 사용, SiloTimelineInner.tsx).
        goToStart(): void;
        // HOTFIX-147.8: 공식 문서화된 이벤트 구독 API — "change"(슬라이드
        // 전환)가 표지(title) 슬라이드 감지에 쓰인다(SiloTimelineInner.tsx).
        on(event: string, callback: (data: { unique_id?: string }) => void): void;
      };
    };
  }
}
