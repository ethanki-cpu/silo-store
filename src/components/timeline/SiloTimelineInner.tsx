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
import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

const TL_BASE = "/vendor/timelinejs";
let tlLoadPromise: Promise<void> | null = null;

// HOTFIX-147.8(사용자 지시 — "타임라인 섹션이 처음 로딩되면 보이는 '혁명~
// 제국' 부분을 내가 텍스트를 변형하고 배경도 넣고 싶다, 드래그앤드랍/사이즈
// 조절을 자유롭게 하게 해달라" + 모바일에서 표지 텍스트가 화면보다 커서
// 스와이프 안내문과 겹치는 버그 실측 확인): TL3 자체 표지(title) 슬라이드
// 렌더링을 손대는 대신(라이브러리 내부 DOM/CSS라 안전하게 재배치 불가),
// SiloTimelineEmbedBlock이 이 위에 자기만의 자유배치 오버레이(배경 슬라이드+
// 자유배치 텍스트)를 얹는다 — TL3의 "change" 이벤트로 지금 표지를 보고
// 있는지 판별하고, `.tl-storyslider`의 실제 렌더링 영역을 ResizeObserver로
// 재서 그 위에만 겹치도록 한다(`.tl-timenav`(하단 대시보드)는 절대 가리지
// 않음 — 유저가 "1번(표지/슬라이드) 아래 2번 대시보드에서 다른 항목 클릭하면
// 1번이 바뀐다"고 정확히 묘사한 그 구조를 그대로 유지).
// HOTFIX-147.11(사용자 신고 — "표지 자유편집에 슬라이드/폰트를 넣어도 적용이
// 안 됨" 실측 재현): "표지 슬라이드의 unique_id는 항상 'title-headline'"이라던
// HOTFIX-147.8의 가정이 틀렸다 — TL3는 우리가 `title` 객체에 unique_id를
// 안 주면 headline 텍스트를 slugify해서 자기가 직접 생성한다("혁명 ~ 제국
// Revolution ~ Empire" → "-revolution-empire" 같은 식, 실측 콘솔 로그로
// 확인). 즉 표지 unique_id는 페이지마다 다르고, 고정 문자열과 비교하는
// 방식으로는 사실상 한 번도 true가 될 수 없어 오버레이(coverState.isTitle)가
// 항상 false로 남아 있었다 — 이게 사용자가 본 "슬라이드/폰트를 넣어도 적용이
// 안 된다"의 진짜 근본 원인. 고정 문자열을 추측하는 대신, 우리가 실제로
// 만든 이벤트들의 unique_id 목록(knownEventIds, 아래 fetch 결과에서 채움)에
// 없는 슬라이드는 전부 표지로 취급하도록 뒤집었다 — TL3가 표지에 어떤
// unique_id를 붙이든 항상 정확하다.

// HOTFIX-147.13(사용자 지시 — "표지뿐 아니라 그리스/르네상스/바로크/로코코
// 같은 하위 이벤트 화면에도 같은 자유편집을 넣고 싶다"): eventId를 추가해
// 지금 표지가 아니라면 정확히 "어느 이벤트"를 보고 있는지도 알려준다 —
// 표지일 때는 null. 부모(SiloTimelineEmbedBlock)가 이 id로 이벤트별
// 오버레이 설정(eventOverlays[eventId])을 찾아 표지와 동일한 자유편집
// 오버레이를 그 이벤트 위에도 겹칠 수 있다.
export type TimelineCoverState = { isTitle: boolean; eventId: string | null; top: number; height: number } | null;

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
  groupHref,
  stageHeightPx,
  onCoverStateChange,
}: {
  /** 단일 게시판 모드 — groupHref와 둘 중 하나만 준다. */
  boardId?: string;
  /** HOTFIX-147.3: 여러 하위 게시판(2단계 카테고리 아래 3단계 전부)의 글을
   * 한 타임라인에 모아 보여주는 집계 모드 — site_navigations의 href. */
  groupHref?: string;
  /** EPIC-147-후속(사용자 지시 — "타임라인의 윗부분... 위아래 폭이 너무
   * 좁아 설정할수 있게 해줘"): 슬라이드(미디어+제목+설명) 영역의 높이.
   * 없으면 TimelineJS3 기본값(컨테이너 높이 자동 계산)을 그대로 쓴다. */
  stageHeightPx?: number | null;
  /** HOTFIX-147.8: 표지 슬라이드를 보고 있는지 + `.tl-storyslider`의 실제
   * top/height(컨테이너 기준)를 알려준다 — 부모가 이 위에 자유배치 오버레이를
   * 정확히 겹칠 수 있도록. 매번 새 함수를 넘겨도 effect가 매번 재설정되지
   * 않도록 ref로 최신 값만 추적한다. */
  onCoverStateChange?: (state: TimelineCoverState) => void;
}) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const instanceRef = useRef<InstanceType<NonNullable<Window["TL"]>["Timeline"]> | null>(null);
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const onCoverStateChangeRef = useRef(onCoverStateChange);
  useEffect(() => {
    onCoverStateChangeRef.current = onCoverStateChange;
  });
  const isTitleRef = useRef(true);
  // HOTFIX-147.13: 표지가 아닐 때 지금 보고 있는 이벤트의 unique_id.
  const activeEventIdRef = useRef<string | null>(null);

  const emitCoverState = useCallback(() => {
    const cb = onCoverStateChangeRef.current;
    const container = containerRef.current;
    if (!cb || !container) return;
    const slider = container.querySelector<HTMLElement>(".tl-storyslider");
    if (!slider) return;
    const wrapperRect = container.getBoundingClientRect();
    const sliderRect = slider.getBoundingClientRect();
    cb({
      isTitle: isTitleRef.current,
      eventId: isTitleRef.current ? null : activeEventIdRef.current,
      top: sliderRect.top - wrapperRect.top,
      height: sliderRect.height,
    });
  }, []);

  // HOTFIX-147.8: `.tl-storyslider`는 TL3가 내부적으로 비동기 생성하므로
  // MutationObserver로 나타나길 기다렸다가 ResizeObserver를 붙인다 — 리사이즈/
  // 뷰포트 폭 변화(모바일 skinny 레이아웃 전환 등)마다 정확한 위치를 다시 잰다.
  // HOTFIX-147.11(사용자 신고 — "표지 자유편집에 슬라이드/폰트를 넣어도
  // 적용이 안 됨" 재현 확인): 관리자가 이미 렌더링된 타임라인을 보다가
  // "표지 자유 편집" 체크박스를 그제서야 켜는 게 실제 사용 흐름인데, 그
  // 시점엔 `.tl-storyslider`가 이미 DOM에 존재해 MutationObserver가 감시할
  // "새로 추가되는 순간"이 다시는 오지 않는다 — coverState가 영영 null로
  // 남아 오버레이(슬라이드/텍스트/폰트 전부) 자체가 안 그려졌다(TL3에서
  // 아무 이벤트나 한 번 클릭했다 표지로 돌아오면 change 이벤트가 emitCoverState를
  // 직접 불러 그제서야 나타남 — 실측으로 재현). effect 시작 시 이미 슬라이더가
  // 있는지 먼저 확인해 그 자리에서 바로 붙이도록 수정.
  useEffect(() => {
    if (!onCoverStateChange) return;
    const container = containerRef.current;
    if (!container) return;
    let ro: ResizeObserver | null = null;

    function attachIfPresent() {
      const slider = container!.querySelector(".tl-storyslider");
      if (slider && !ro) {
        ro = new ResizeObserver(emitCoverState);
        ro.observe(slider);
        ro.observe(container!);
        emitCoverState();
      }
    }

    attachIfPresent();
    const mo = new MutationObserver(attachIfPresent);
    mo.observe(container, { childList: true, subtree: true });

    return () => {
      mo.disconnect();
      ro?.disconnect();
    };
  }, [onCoverStateChange, emitCoverState, boardId, groupHref, stageHeightPx]);

  useEffect(() => {
    let cancelled = false;
    const container = containerRef.current;

    const eventsUrl = groupHref
      ? `/api/timeline/events?group=${encodeURIComponent(groupHref)}`
      : `/api/timeline/events?board=${encodeURIComponent(boardId ?? "")}`;

    Promise.all([loadTimelineJs(), fetch(eventsUrl).then((res) => res.json())])
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
        // HOTFIX-147.11: 표지 슬라이드의 unique_id를 TL3가 뭐라고 짓든(위
        // 주석 참고) 실제 이벤트 목록에 없는 unique_id는 전부 표지로 본다.
        const knownEventIds = new Set(
          (Array.isArray(data?.events) ? data.events : [])
            .map((e: { unique_id?: string }) => e?.unique_id)
            .filter((id: unknown): id is string => typeof id === "string"),
        );
        // TL3 내부가 `new URL(fragment, script_path)`로 폰트/테마 CSS를
        // 찾는데, URL 생성자의 base는 반드시 절대 URL이어야 한다(실측 —
        // "/vendor/..." 같은 루트-상대 경로를 넘기면 "Invalid base URL"로
        // 죽는다) — origin을 직접 붙인다.
        const instance = new TimelineCtor(container, data, {
          script_path: `${window.location.origin}${TL_BASE}/js/`,
          ...(stageHeightPx ? { height: stageHeightPx } : {}),
        });
        instanceRef.current = instance;
        isTitleRef.current = true;
        activeEventIdRef.current = null;
        instance.on("change", (d) => {
          const isKnownEvent = knownEventIds.has(d?.unique_id);
          isTitleRef.current = !isKnownEvent;
          activeEventIdRef.current = isKnownEvent ? (d.unique_id as string) : null;
          emitCoverState();
        });
        emitCoverState();
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
  }, [boardId, groupHref, stageHeightPx, emitCoverState]);

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
