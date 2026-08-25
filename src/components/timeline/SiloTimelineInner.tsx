"use client";

// EPIC-147-후속(사용자 지시 — "지금 네가 구현한 스타일은 싫어... 예전
// 스타일의 타임라인을 원해. 여기에 단지 하단 줌인 줌아웃 기능이 추가된걸
// 원해"): 처음엔 @knight-lab/timeline-ng(Svelte 5, "Timeline NG" 신버전)로
// 구현했으나 그 컴포넌트의 화면 자체가 사용자가 원하는 클래식 TimelineJS3
// 스타일(전체 배경 이미지+오버레이 텍스트, 아이콘 칩 형태의 TimeNav)과
// 근본적으로 다른 레이아웃이라 CSS로는 되돌릴 수 없었다 — 클래식 스타일을
// 실제로 만드는 라이브러리인 @knight-lab/timelinejs(TimelineJS3, 순수
// JS/DOM, Svelte 아님)로 교체한다.
//
// TimelineJS3를 `import`로 번들에 넣지 않고 <script>/<link> 태그로 직접
// 주입하는 이유(실측으로 확인한 두 단계 문제):
// 1. package root(`@knight-lab/timelinejs`)로 import하면 raw source(src/js/
//    index.js)가 .less 파일을 직접 import해 Turbopack이 "Unknown module
//    type"으로 빌드 자체를 실패시킨다(로더 미설정).
// 2. 미리 빌드된 dist/js/timeline.js(순수 스크립트, `var TL = ...`로 전역에
//    등록되는 방식)를 `import`로 가져오면, 번들러가 모든 모듈을 자기 함수
//    스코프로 감싸버려 그 `var TL`이 더 이상 진짜 전역(window.TL)에 닿지
//    않는다 — 실제로 로드는 되지만 window.TL이 계속 undefined였다.
// 해결: 이 파일(및 CSS)을 public/vendor/timelinejs/로 복사해 자체 호스팅하고,
// 브라우저 DOM에 진짜 <script src>/<link> 태그를 직접 넣는다 — 번들러
// 스코프를 완전히 우회해 원래 라이브러리가 기대하는 대로 전역에 등록된다.
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

const TL_BASE = "/vendor/timelinejs";
let tlLoadPromise: Promise<void> | null = null;

function loadTimelineJs(): Promise<void> {
  if (window.TL?.Timeline) return Promise.resolve();
  if (tlLoadPromise) return tlLoadPromise;

  tlLoadPromise = new Promise((resolve, reject) => {
    if (!document.querySelector(`link[data-tl3-css]`)) {
      const link = document.createElement("link");
      link.rel = "stylesheet";
      link.href = `${TL_BASE}/css/timeline.css`;
      link.setAttribute("data-tl3-css", "1");
      document.head.appendChild(link);
    }
    const script = document.createElement("script");
    script.src = `${TL_BASE}/js/timeline.js`;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("TimelineJS3 스크립트를 불러오지 못했어요."));
    document.head.appendChild(script);
  });
  return tlLoadPromise;
}

export default function SiloTimelineInner({
  boardId,
  stageHeightPx,
}: {
  boardId: string;
  /** EPIC-147-후속(사용자 지시 — "타임라인의 윗부분... 위아래 폭이 너무
   * 좁아 설정할수 있게 해줘"): 슬라이드(미디어+제목+설명) 영역의 높이.
   * 없으면 TimelineJS3 기본값(컨테이너 높이 자동 계산)을 그대로 쓴다. */
  stageHeightPx?: number | null;
}) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const instanceRef = useRef<{ zoomIn: () => void; zoomOut: () => void } | null>(null);
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const container = containerRef.current;

    Promise.all([
      loadTimelineJs(),
      fetch(`/api/timeline/events?board=${encodeURIComponent(boardId)}`).then((res) => res.json()),
    ])
      .then(([, data]) => {
        if (cancelled || !container) return;
        if (data?.error) {
          setError(data.error);
          return;
        }
        const TimelineCtor = window.TL?.Timeline;
        if (!TimelineCtor) {
          setError("TimelineJS3 스크립트를 불러오지 못했어요.");
          return;
        }
        // TL3 내부가 `new URL(fragment, script_path)`로 폰트/테마 CSS를
        // 찾는데, URL 생성자의 base는 반드시 절대 URL이어야 한다(실측 —
        // "/vendor/..." 같은 루트-상대 경로를 넘기면 "Invalid base URL"로
        // 죽는다) — origin을 직접 붙인다.
        instanceRef.current = new TimelineCtor(container, data, {
          script_path: `${window.location.origin}${TL_BASE}/js/`,
          ...(stageHeightPx ? { height: stageHeightPx } : {}),
        });
      })
      .catch((e) => {
        if (!cancelled) setError(e instanceof Error ? e.message : String(e));
      });

    return () => {
      cancelled = true;
      instanceRef.current = null;
      // TimelineJS3는 명시적 destroy API가 없다 — 컨테이너를 비우는 것이
      // 공식적으로 안내된 정리 방법(다른 사용자들도 재마운트 시 이렇게 함).
      if (container) container.innerHTML = "";
    };
  }, [boardId, stageHeightPx]);

  // EPIC-147(요구사항 3 — 새로고침 없이 상세 페이지로 이동): TimelineJS3가
  // 그리는 순수 DOM이라 React가 그 안의 <a> 클릭을 알 방법이 없다 —
  // 컨테이너 레벨 native click 리스너로 "자세히 보기" 링크를 가로챈다.
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    function handleClick(e: MouseEvent) {
      const target = e.target as HTMLElement | null;
      const link = target?.closest("a");
      if (!link) return;
      const href = link.getAttribute("href");
      if (!href || !href.startsWith("/") || href.startsWith("//")) return;
      e.preventDefault();
      router.push(href);
    }

    container.addEventListener("click", handleClick);
    return () => container.removeEventListener("click", handleClick);
  }, [router]);

  // EPIC-147-후속(사용자 지시 — "새로운 버전에서 좋은점은... 스크롤로 줌인
  // 줌아웃 할수 있다는거야... 여기에 단지 하단 줌인 줌아웃 기능이 추가된걸
  // 원해"): 클래식 스타일은 그대로 쓰되, TimeNav(.tl-timenav) 위에서
  // 마우스 휠을 굴리면 TimelineJS3가 공식 지원하는 zoomIn()/zoomOut()을
  // 호출한다 — 페이지 자체가 스크롤되지 않도록 그 영역 안에서는
  // preventDefault. 휠 이벤트가 한 번에 여러 번 들어와도(트랙패드 등)
  // 과도하게 줌되지 않도록 60ms 간격으로 스로틀한다.
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    let lastZoomAt = 0;

    function handleWheel(e: WheelEvent) {
      const timenav = (e.target as HTMLElement | null)?.closest(".tl-timenav");
      const instance = instanceRef.current;
      if (!timenav || !instance) return;
      e.preventDefault();
      const now = Date.now();
      if (now - lastZoomAt < 60) return;
      lastZoomAt = now;
      if (e.deltaY < 0) instance.zoomIn();
      else if (e.deltaY > 0) instance.zoomOut();
    }

    container.addEventListener("wheel", handleWheel, { passive: false });
    return () => container.removeEventListener("wheel", handleWheel);
  }, []);

  if (error) {
    return <p className="p-6 text-sm text-red-600">타임라인을 불러오지 못했어요: {error}</p>;
  }

  return <div ref={containerRef} className="tl-silo-container" style={{ height: stageHeightPx ? stageHeightPx + 260 : 650 }} />;
}
