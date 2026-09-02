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
import { useCallback, useEffect, useRef, useState, type CSSProperties } from "react";
import { useRouter } from "next/navigation";

const TL_BASE = "/vendor/timelinejs";
let tlLoadPromise: Promise<void> | null = null;

// HOTFIX-156.4(사용자 지시 — "OTE 대시보드의 이벤트 시작 기점을 알리는
// '점'의 색깔을 바꿀 수 있게 해줘" + "각 이벤트의 대시보드에 보여지는
// 설정을 hover/평상시/클릭됐을 때로 나눠서 하게 해줘"): TL3(벤더)
// timeline.css가 마커 점(.tl-timemarker-line-*:after)과 마커 카드
// (.tl-timemarker-content-container)의 배경/텍스트 색을 하드코딩하고
// 있어(#919191/#e5e5e5/hover #737373·#fff/active #fff·#333) 벤더 CSS를
// 직접 고치는 대신 여기서 var(--silo-marker-*, 원래 하드코딩 값)로
// 오버라이드한다. 컨테이너 인라인 style에 커스텀 프로퍼티를 설정하면
// 그 인스턴스에만 적용되고(인라인이라 다른 .tl-silo-container로 안 샘),
// 아무것도 설정 안 하면 fallback이 그대로 원래 TL3 색상이라 회귀 없다.
const MARKER_STYLE_CSS = `
.tl-silo-container .tl-timemarker-line-left:after,
.tl-silo-container .tl-timemarker-line-right:after {
  background-color: var(--silo-marker-color, #919191);
}
.tl-silo-container .tl-timemarker-content-container {
  background-color: var(--silo-marker-card-bg, #e5e5e5);
}
.tl-silo-container .tl-timemarker-content-container .tl-timemarker-content .tl-timemarker-text h2.tl-headline {
  color: var(--silo-marker-card-text, inherit);
}
.tl-silo-container .tl-timemarker:hover .tl-timemarker-content-container,
.tl-silo-container .tl-timemarker:focus .tl-timemarker-content-container {
  background-color: var(--silo-marker-card-hover-bg, #737373);
}
.tl-silo-container .tl-timemarker:hover .tl-timemarker-content-container .tl-timemarker-content .tl-timemarker-text h2.tl-headline,
.tl-silo-container .tl-timemarker:focus .tl-timemarker-content-container .tl-timemarker-content .tl-timemarker-text h2.tl-headline {
  color: var(--silo-marker-card-hover-text, #fff);
}
.tl-silo-container .tl-timemarker.tl-timemarker-active .tl-timemarker-content-container {
  background-color: var(--silo-marker-card-active-bg, #fff);
}
.tl-silo-container .tl-timemarker.tl-timemarker-active .tl-timemarker-content-container .tl-timemarker-content .tl-timemarker-text h2.tl-headline {
  color: var(--silo-marker-card-active-text, #333);
}
`;

// HOTFIX-151.3(사용자 신고 — "타임라인이 로딩되면 첫 이벤트가 너무
// 오른쪽에 있어, 나머지 이벤트들도 첫 화면부터 한눈에 보이게 해줘"):
// TimelineJS3(벤더, node_modules/@knight-lab/timelinejs/src/js/timenav/
// TimeNav.js의 animateMovement)는 항상 "현재 마커를 트랙 가운데 정렬"하는
// 고정 공식(`slider.style.left = -markerLeft + width/2`)만 쓴다 — 표지에는
// 마커가 없어 처음 로드 시에도 결국 마커 0(첫 이벤트)이 가운데로 온다.
// 벤더 코드는 손대지 않고 직접 보정한다. 실측(2026-08-28) 결과, "이미 적용된
// 가운데 정렬 값에서 width/2를 빼는" 역산 방식은 표지→goToStart() 경로에서
// TL3가 매번 정확히 같은 "가운데 정렬" 공식을 타지 않아(경로에 따라 slider
// 위치가 다르게 남는 경우 확인) 첫 마커가 오히려 화면 밖으로 나가버리는
// 버그가 있었다 — 대신 첫 마커의 "지금 실제 화면 위치"를 직접 측정해서
// 원하는 왼쪽 여백 위치로 정확히 옮기는 방식으로 교체(TL3 내부 공식에
// 의존하지 않아 언제 호출해도 안전).
const OVERVIEW_LEFT_PADDING_PX = 40;
function alignTimeNavToOverview(container: HTMLElement) {
  const timenav = container.querySelector<HTMLElement>(".tl-timenav");
  const slider = container.querySelector<HTMLElement>(".tl-timenav-slider");
  const firstMarker = container.querySelector<HTMLElement>(".tl-timemarker");
  if (!timenav || !slider || !firstMarker) return;
  const currentLeft = parseFloat(slider.style.left);
  if (!Number.isFinite(currentLeft)) return;
  const timenavLeft = timenav.getBoundingClientRect().left;
  const markerLeft = firstMarker.getBoundingClientRect().left;
  const delta = OVERVIEW_LEFT_PADDING_PX - (markerLeft - timenavLeft);
  slider.style.left = `${currentLeft + delta}px`;
}

// 사용자 지시(2026-09-02 — "제국~군주" 타임라인에서 르네상스/바로크/로코코
// 처럼 짧은 시대 여러 개가 몰려있으면 라벨이 서로 겹쳐 보이는 문제,
// "촘촘한 연대의 경우 좀 더 unit을 넓게 보였으면 좋겠다"): TimelineJS3의
// TimeNav는 순수 선형 축이라(TimeScale.getPosition = (t - earliest) *
// pixels_per_milli, node_modules/@knight-lab/timelinejs/src/js/timenav/
// TimeScale.js 확인) 실제 연대 비율 그대로 그린다 — 로마제국(BC146~AD476,
// 622년)/비잔틴(AD476~1453, 977년) 같은 긴 시대 옆에 르네상스(250년)/
// 바로크(150년)/로코코(65년)가 붙으면 뒤쪽 세 시대가 극단적으로 눌린다.
// 실측(2026-09-02, 로컬 dev 서버) 결과 "전체를 한 화면에" 보여주는 현재
// 뷰포트엔 여유 공간이 사실상 없어(로코코 끝이 이미 화면 오른쪽 경계에
// 거의 닿아있음), 촘촘한 구간만 넓히려면 반드시 어딘가(성긴 구간)에서
// 그만큼을 가져와야 한다 — 사용자 승인(2026-09-02, "성긴 구간은 8.7%
// 정도 줄어도 되니 촘촘한 구간을 30% 넓혀줘")에 따라 다음 알고리즘을
// 적용한다.
//
// 1. TimeScale이 이미 계산해둔 이벤트별 픽셀 위치(_positions, 순수
//    선형값)에서 "구간 경계"(각 이벤트의 시작/끝 픽셀 좌표) 목록을 뽑는다.
// 2. 경계 사이 각 구간의 길이를 평균과 비교해 "촘촘함"(평균의 60% 미만)과
//    "성김"(평균의 150% 초과)을 분류한다.
// 3. 촘촘한 구간은 30% 늘리고, 늘어난 만큼을 성긴 구간에서 "평균 길이까지만"
//    줄여 되찾아온다(평균보다 더 줄이지 않음 — 정상 밀도 구간은 절대
//    안 건드림). 되찾을 수 있는 양이 필요한 양보다 적으면 촘촘한 구간의
//    확대율도 비례해서 낮춰 전체 폭(마지막 경계까지의 총합)이 정확히
//    보존되도록 한다.
// 4. 위 경계별 배율로 구간별 선형 보간하는 "warp(x)" 함수를 만들어, 마커의
//    시작/끝 픽셀값(→ TimeNav.positionMarkers가 읽는 _positions[i].start/
//    width)과 축 눈금 라벨의 픽셀값(→ TimeScale.getPosition, TimeAxis가
//    직접 호출)에 동일하게 적용한다 — 둘 다 같은 warp를 거치므로 눈금과
//    마커가 계속 서로 일치해 보인다.
//
// 이벤트 3개 미만이거나 촘촘한/성긴 구간이 뚜렷하지 않으면(늘릴 곳이 없거나
// 안전하게 되찾아올 곳이 없으면) 아무것도 바꾸지 않고 원래 선형 그대로
// 둔다 — 이 보정은 "전부 한 화면에 보이는 초기 개요" 렌더링 1회에만
// 적용되고(줌/리사이즈 시 TimeNav가 TimeScale을 통째로 새로 만들어 이
// 보정은 자연히 사라진다 — alignTimeNavToOverview와 동일한 범위), 이미
// 그 시점 이후의 정상적인 확대/축소 동작에는 관여하지 않는다.
type TLPositionInfo = { start: number; width: number; [key: string]: unknown };

const DENSE_RATIO = 0.6;
const SPARSE_RATIO = 1.5;
const DENSE_EXPAND = 1.3;

function buildDensityWarp(positions: TLPositionInfo[]): ((x: number) => number) | null {
  if (positions.length < 3) return null;

  const boundarySet = new Set<number>();
  for (const p of positions) {
    if (!Number.isFinite(p.start) || !Number.isFinite(p.width)) continue;
    boundarySet.add(p.start);
    boundarySet.add(p.start + p.width);
  }
  const boundaries = [...boundarySet].sort((a, b) => a - b);
  if (boundaries.length < 3) return null;

  const segLens = boundaries.slice(1).map((b, i) => b - boundaries[i]);
  const mean = segLens.reduce((a, b) => a + b, 0) / segLens.length;
  if (!Number.isFinite(mean) || mean <= 0) return null;

  const scales: number[] = segLens.map((len) => (len < mean * DENSE_RATIO ? DENSE_EXPAND : 1));
  const totalExpand = segLens.reduce((sum, len, i) => sum + (scales[i] > 1 ? len * (scales[i] - 1) : 0), 0);
  if (totalExpand <= 0) return null;

  const sparseIdx: number[] = [];
  let reclaimPool = 0;
  segLens.forEach((len, i) => {
    if (len > mean * SPARSE_RATIO) {
      reclaimPool += len - mean;
      sparseIdx.push(i);
    }
  });
  if (sparseIdx.length === 0) return null;

  const shrinkRatio = Math.min(1, totalExpand / reclaimPool);
  let actualReclaimed = 0;
  sparseIdx.forEach((i) => {
    const available = segLens[i] - mean;
    const taken = available * shrinkRatio;
    scales[i] = (segLens[i] - taken) / segLens[i];
    actualReclaimed += taken;
  });

  // 되찾은 양이 필요한 양보다 적으면, 총 폭이 보존되도록 확대율 자체를 낮춘다.
  const fitRatio = Math.min(1, actualReclaimed / totalExpand);
  if (fitRatio < 1) {
    for (let i = 0; i < scales.length; i++) {
      if (scales[i] === DENSE_EXPAND) scales[i] = 1 + (DENSE_EXPAND - 1) * fitRatio;
    }
  }

  const newBoundaries = [boundaries[0]];
  for (let i = 0; i < segLens.length; i++) newBoundaries.push(newBoundaries[i] + segLens[i] * scales[i]);

  const first = boundaries[0];
  const last = boundaries[boundaries.length - 1];
  const newFirst = newBoundaries[0];
  const newLast = newBoundaries[newBoundaries.length - 1];

  return (x: number): number => {
    if (x <= first) return x - (first - newFirst);
    if (x >= last) return newLast + (x - last);
    for (let i = 0; i < boundaries.length - 1; i++) {
      if (x >= boundaries[i] && x <= boundaries[i + 1]) {
        const span = boundaries[i + 1] - boundaries[i];
        const t = span > 0 ? (x - boundaries[i]) / span : 0;
        return newBoundaries[i] + t * (newBoundaries[i + 1] - newBoundaries[i]);
      }
    }
    return x;
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function warpTimeScale(timescale: any): void {
  const positions: TLPositionInfo[] | undefined = timescale?._positions;
  if (!timescale || typeof timescale.getPosition !== "function" || !Array.isArray(positions)) return;
  // 실측(2026-09-02): 이 timescale이 컨테이너가 아직 레이아웃되기 전(폭 0)에
  // 만들어졌으면 모든 위치가 0으로 퇴화한다 — 그런 경우는 조용히 건너뛴다.
  // TL3가 나중에 실제 폭을 알고 나서 _getTimeScale()을 다시 부르면(초기
  // 동기 생성 시 폭이 이미 있었다면 그 즉시, 아니라면 재계산 시점에) 이
  // 함수도 감싸둔 래퍼를 통해 다시 호출되어 그때 정상 적용된다.
  const warp = buildDensityWarp(positions);
  if (!warp) return;

  for (const p of positions) {
    if (!Number.isFinite(p.start) || !Number.isFinite(p.width)) continue;
    const originalEnd = p.start + p.width;
    const newStart = warp(p.start);
    p.start = newStart;
    p.width = Math.max(0, warp(originalEnd) - newStart);
  }

  const originalGetPosition = timescale.getPosition.bind(timescale);
  timescale.getPosition = (t: number) => warp(originalGetPosition(t));
}

// 실측(2026-09-02, 로컬 dev 서버): TimeNav._getTimeScale()은 최초 생성
// 시점뿐 아니라 컨테이너 크기가 나중에 확정될 때(리사이즈/재레이아웃)마다
// 다시 호출되어 this.timescale을 완전히 새 객체로 교체한다 — 한 번만
// warpTimeScale을 호출해두면 그 뒤에 일어나는 재계산에서 원래(선형) 축으로
// 되돌아가 버린다. _getTimeScale 자체를 감싸 호출될 때마다 매번 새
// timescale에 다시 적용되도록 한다(호출부인 TimeNav 자신이 그 직후
// positionMarkers/drawTicks·positionTicks를 이어서 부르므로, 여기서 마커/
// 눈금을 직접 다시 그릴 필요는 없다 — timescale 객체 자체를 반환 전에
// 미리 바꿔두기만 하면 된다).
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function installDensityWarp(instance: any) {
  const timenav = instance?._timenav;
  if (!timenav || typeof timenav._getTimeScale !== "function") return;
  if (timenav.__siloDensityWarpInstalled) return;
  timenav.__siloDensityWarpInstalled = true;

  const originalGetTimeScale = timenav._getTimeScale.bind(timenav);
  timenav._getTimeScale = () => {
    const ts = originalGetTimeScale();
    warpTimeScale(ts);
    return ts;
  };

  // 생성자가 이미 한 번(원래 함수로) 호출해 만들어둔 현재 timescale에도
  // 소급 적용 + 화면에 반영.
  warpTimeScale(timenav.timescale);
  if (typeof timenav.positionMarkers === "function") timenav.positionMarkers();
  if (typeof timenav.timeaxis?.positionTicks === "function") {
    timenav.timeaxis.positionTicks(timenav.timescale, timenav.options?.optimal_tick_width);
  }
}

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
  /** 단일 게시판 모드 — groupHref와 둘 중 하나만 준다. */
  boardId?: string;
  /** HOTFIX-147.3: 여러 하위 게시판(2단계 카테고리 아래 3단계 전부)의 글을
   * 한 타임라인에 모아 보여주는 집계 모드 — site_navigations의 href. */
  groupHref?: string;
  /** EPIC-147-후속(사용자 지시 — "타임라인의 윗부분... 위아래 폭이 너무
   * 좁아 설정할수 있게 해줘"): 슬라이드(미디어+제목+설명) 영역의 높이.
   * 없으면 TimelineJS3 기본값(컨테이너 높이 자동 계산)을 그대로 쓴다. */
  stageHeightPx?: number | null;
  /** HOTFIX-147.19(사용자 지시 — "타임라인 대시보드가 전체를 한눈에 볼 수
   * 없도록 줌인되어있다"): TL3의 TimeNav 확대 배율(공식 옵션명
   * `scale_factor` — "타임라인이 화면 몇 개 너비만큼인가", 낮을수록
   * 더 넓게/줌아웃) 초기값. TL3 자체 기본값은 2(전체 기간의 절반만
   * 화면에 보임) — 공식 zoom_sequence 최솟값인 0.5(실측상 4단계 마커가
   * 전부 스크롤 없이 들어옴)를 우리 기본값으로 쓴다. null/undefined면
   * (예: 이 필드가 생기기 전에 저장된 craft_state) 이 0.5가 적용된다. */
  initialZoomFactor?: number | null;
  /** HOTFIX-147.8: 표지 슬라이드를 보고 있는지 + `.tl-storyslider`의 실제
   * top/height(컨테이너 기준)를 알려준다 — 부모가 이 위에 자유배치 오버레이를
   * 정확히 겹칠 수 있도록. 매번 새 함수를 넘겨도 effect가 매번 재설정되지
   * 않도록 ref로 최신 값만 추적한다. */
  onCoverStateChange?: (state: TimelineCoverState) => void;
  // HOTFIX-156.4(사용자 지시 — "OTE 대시보드의 이벤트 시작 기점을 알리는
  // '점'의 색깔을 바꿀 수 있게 해줘" + "각 이벤트의 대시보드에 보여지는
  // 설정을 hover/평상시/클릭됐을 때로 나눠서 하게 해줘"): TL3 대시보드
  // (TimeNav)의 마커 점/카드 색상 — 전부 null이면 TL3 기본 색상 그대로.
  // CSS 커스텀 프로퍼티로 이 컴포넌트 인스턴스에만(컨테이너에 인라인
  // style로) 스코프해 적용한다(panSpeedSeconds 등과 동일한 패턴) — 아래
  // <style> 블록이 var(--silo-marker-*, 기본값)로 참조한다.
  markerColor?: string | null;
  markerCardBg?: string | null;
  markerCardText?: string | null;
  markerCardHoverBg?: string | null;
  markerCardHoverText?: string | null;
  markerCardActiveBg?: string | null;
  markerCardActiveText?: string | null;
}) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const instanceRef = useRef<InstanceType<NonNullable<Window["TL"]>["Timeline"]> | null>(null);
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  // HOTFIX-152.20(사용자 지시 — "'온라인 도슨트'의 타임라인 이벤트의
  // '화면 자유편집'을 앞으로 OTE라고 지칭할게" 세션에서 "'/online-docent/
  // digital-ai'에 timeline_ng를 만들어줘. 그리고 게시판도 만들어줘"를
  // 실행하던 중 발견): 새로 만든 게시판처럼 게시글이 0개면 TimelineJS3가
  // `events` 배열이 비어있다는 이유로(표지 title 슬라이드가 있어도) 자체
  // DOM에 영어 원시 에러("ERROR: Timeline configuration has no
  // events...")를 그대로 그려버린다 — 우리 쪽 error state(React가 관리)를
  // 거치지 않는 라이브러리 내부 동작이라 지금까지는 매번 "샘플 게시글을
  // 채워 넣는" 임시방편(HOTFIX-151.10/151.11)으로만 피해왔다. 게시글이
  // 0개인 게시판/집계가 아예 정상적인 상태(콘텐츠를 아직 안 쓴 것뿐)이므로,
  // TL3 생성자를 호출하기 전에 이벤트 개수를 먼저 확인해 0개면 아예
  // 생성하지 않고 우리 자체 안내 문구로 대체한다 — 앞으로 새 타임라인
  // 게시판을 만들 때마다 이 문제가 재발하지 않는다.
  const [isEmpty, setIsEmpty] = useState(false);
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
        // HOTFIX-152.20: TL3는 events가 0개면(표지 title만 있어도) 자기
        // DOM에 직접 영어 원시 에러를 그려버린다 — 생성자를 아예 부르지
        // 않고 우리 안내 문구로 대체한다.
        if (!Array.isArray(data?.events) || data.events.length === 0) {
          setIsEmpty(true);
          return;
        }
        setIsEmpty(false);
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
        // 사용자 지시(2026-08-27 — "대시보드가 타임라인 전체를 한눈에 볼
        // 수 없도록 줌인되어있다, 전체를 한눈에 볼 수 있도록 줌을
        // 조절해달라"): TL3 자체 기본값(scale_factor 2)은 전체 기간의
        // 절반 정도만 화면에 보인다. 실측(elementFromPoint 대신
        // getBoundingClientRect로 마커 좌표를 직접 대조): TL3 공식
        // zoom_sequence의 최솟값인 0.5를 쓰면 이 4단계 카테고리
        // 전부(그리스~로코코) 마커가 스크롤 없이 화면 안에 들어온다 —
        // 그보다 더 작은 값(0.05 등)은 마커는 다 들어오지만 축 눈금
        // 라벨이 서로 겹쳐 못 읽는 부작용이 있어(TL3가 그 span에 맞춰
        // 과도하게 넓은 눈금 범위를 그림) 공식 프리셋 중 가장 작은 0.5를
        // 기본값으로 쓴다.
        const instance = new TimelineCtor(container, data, {
          script_path: `${window.location.origin}${TL_BASE}/js/`,
          ...(stageHeightPx ? { height: stageHeightPx } : {}),
          scale_factor: initialZoomFactor || 0.5,
        });
        instanceRef.current = instance;
        isTitleRef.current = true;
        activeEventIdRef.current = null;
        // HOTFIX-151.3: 최초 로드 시 딱 1번만 "전체 개요" 위치로 보정한다
        // — TL3의 첫 배치 애니메이션(기본 ~1000ms)이 끝난 뒤 적용해야
        // 덮어써지지 않는다. 이후 사용자가 마커를 직접 클릭할 땐 TL3의
        // 원래 동작(클릭한 마커를 가운데 정렬)을 그대로 둔다.
        let hasAlignedOverview = false;
        instance.on("change", (d) => {
          const isKnownEvent = knownEventIds.has(d?.unique_id);
          isTitleRef.current = !isKnownEvent;
          activeEventIdRef.current = isKnownEvent ? (d.unique_id as string) : null;
          emitCoverState();
          if (!hasAlignedOverview) {
            hasAlignedOverview = true;
            // 실측(2026-09-02): `new TL.Timeline(...)`이 반환된 시점엔
            // `instance._timenav`가 아직 Timeline.js 생성자 맨 앞에서 잡아둔
            // 빈 자리표(`{}`)뿐이고, "change" 이벤트가 막 도착한 시점에도
            // 컨테이너가 아직 레이아웃 폭을 못 얻어 timescale의 모든 위치가
            // 0으로 퇴화해 있는 경우가 있다(실측 로그로 확인) — TL3의 첫
            // 배치 애니메이션이 끝나는 이 시점(1150ms 뒤, alignTimeNavToOverview와
            // 동일 타이밍)에는 항상 실제 폭을 가진 상태였다.
            setTimeout(() => {
              if (cancelled || !container) return;
              // 촘촘한 시대 구간 확대 보정 — TimeNav가 자기 컨테이너 크기를
              // 다시 알게 될 때마다(리사이즈 등) timescale을 통째로 새로
              // 만들기 때문에, 한 번만 적용하지 않고 그 재계산 지점 자체를
              // 감싸 매번 다시 적용되도록 설치한다(installDensityWarp 주석
              // 참고) — alignTimeNavToOverview보다 먼저 호출해 마커가 이미
              // 보정된 최종 위치에 있는 상태로 개요 정렬이 이뤄지게 한다.
              installDensityWarp(instance);
              alignTimeNavToOverview(container);
            }, 1150);
          }
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
  }, [boardId, groupHref, stageHeightPx, initialZoomFactor, emitCoverState]);

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

  // HOTFIX-151.3(사용자 지시 — "대시보드의 이벤트가 없는 빈 영역을
  // 클릭하면 맨 처음 표지 화면으로 이동하게 해줘"): TimeNav는 마커
  // (.tl-timemarker) 클릭에만 반응하고(TimeNav.js _initEvents) 빈 트랙
  // 영역엔 리스너가 없다 — 마커가 아닌 곳을 클릭하면 TL3 공식 API인
  // goToStart()(표지가 있으면 표지로 이동)를 호출한다. goToStart()도
  // 내부적으로 "가운데 정렬" 애니메이션을 다시 타므로, 끝난 뒤 위 개요
  // 정렬을 재적용해 전체가 한눈에 보이는 상태로 돌아오게 한다.
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    function handleTrackClick(e: MouseEvent) {
      const target = e.target as HTMLElement | null;
      if (!target?.closest(".tl-timenav")) return;
      if (target.closest(".tl-timemarker")) return;
      instanceRef.current?.goToStart();
      setTimeout(() => {
        if (container) alignTimeNavToOverview(container);
      }, 1150);
    }

    container.addEventListener("click", handleTrackClick);
    return () => container.removeEventListener("click", handleTrackClick);
  }, []);

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

  // HOTFIX-152.20: TL3 생성 자체를 건너뛴 상태 — containerRef를 그대로
  // 쓰는 대신 안내 문구만 그린다(다음에 게시글이 생겨 새로고침하면 이
  // 컴포넌트가 다시 mount/effect 재실행되며 정상적으로 TL3가 뜬다).
  if (isEmpty) {
    return (
      <div
        className="flex items-center justify-center bg-gray-50 text-sm text-gray-400"
        style={{ height: stageHeightPx ? stageHeightPx + 260 : 650 }}
      >
        아직 게시글이 없어요.
      </div>
    );
  }

  // HOTFIX-156.4(실측 중 발견한 버그): TL3(TimeNav.js)가 초기화되면서
  // 이 컨테이너의 className을 자기 것("tl-timeline tl-layout-landscape"
  // 등)으로 통째로 덮어써서, containerRef 자체에 "tl-silo-container"
  // 클래스를 직접 주면 초기화 직후 사라져 위 <style>의 셀렉터가 아무것도
  // 못 찾는다(실제 배포 페이지에서 getElementsByClassName으로 확인).
  // TL3는 style 속성은 안 건드리므로, "tl-silo-container" 클래스와 CSS
  // 변수는 TL3가 손 안 대는 바깥 래퍼에 두고 TL3의 실제 마운트 지점
  // (containerRef)은 안쪽 별도 div로 분리한다.
  const outerStyle = {
    ...(markerColor ? { "--silo-marker-color": markerColor } : {}),
    ...(markerCardBg ? { "--silo-marker-card-bg": markerCardBg } : {}),
    ...(markerCardText ? { "--silo-marker-card-text": markerCardText } : {}),
    ...(markerCardHoverBg ? { "--silo-marker-card-hover-bg": markerCardHoverBg } : {}),
    ...(markerCardHoverText ? { "--silo-marker-card-hover-text": markerCardHoverText } : {}),
    ...(markerCardActiveBg ? { "--silo-marker-card-active-bg": markerCardActiveBg } : {}),
    ...(markerCardActiveText ? { "--silo-marker-card-active-text": markerCardActiveText } : {}),
  } as CSSProperties;
  const innerHeight = stageHeightPx ? stageHeightPx + 260 : 650;

  return (
    <>
      <style>{MARKER_STYLE_CSS}</style>
      <div className="tl-silo-container" style={outerStyle}>
        <div ref={containerRef} style={{ height: innerHeight }} />
      </div>
    </>
  );
}
