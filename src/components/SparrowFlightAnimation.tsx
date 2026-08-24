"use client";

import { useEffect, useRef, useState, type RefObject } from "react";

// EPIC-145(사용자 지시 — "메인 헤더 영역에 참새 비행 애니메이션 추가"):
// 헤더 안을 날아다니다 특정 요소(로고/좌우 텍스트) 근처에 무작위로
// 착지하고, 잠시 대기한 뒤 다시 날아오르는 걸 무한 반복하는 순수 장식용
// 인터랙션. 새 의존성(GSAP/Framer Motion) 없이 requestAnimationFrame +
// 3차 베지어 곡선을 직접 계산해 구현한다(사용자 확인 — 기존 hover/스크롤
// 모션들(tabHoverMotion.ts, useScrollReveal.ts)도 전부 이 저장소 관례대로
// 순수 CSS/rAF 자체 구현이라 그 패턴을 그대로 따름, 번들 크기도 늘지
// 않음). 비행 궤적은 항상 이 컴포넌트가 매달리는 컨테이너(Navbar.tsx의
// topBarRef, "메인 헤더 영역") 내부 좌표계 기준이다.
//
// 착지 구역: 컨테이너 안에서 data-sparrow-zone 속성이 붙은 요소를 매
// 비행 시작 시점에 다시 조회한다(캐싱하지 않음 — 관리자가 로고/텍스트를
// 바꾸거나 리사이즈로 레이아웃이 달라져도 항상 "지금" DOM 기준으로 좌표를
// 계산). Navbar.tsx가 로고 이미지 Link와 좌/우 텍스트 span에 이 속성을
// 붙여둔다. "logo" 존은 안에 박힌 유리돔 그래픽이 보통 그래픽 오른쪽
// 끝부분에 있다는 걸 감안해(사용자가 준 레이아웃 스케치 참고) 오른쪽으로
// 치우친 지점을 우선 고른다. 태그된 요소가 하나도 없으면(로고 텍스트/
// 이미지가 전부 비어있는 극단적 설정) 컨테이너 안의 무작위 지점으로
// 폴백한다.
const SPARROW_ZONE_SELECTOR = "[data-sparrow-zone]";

// HOTFIX(사용자 제공 에셋 — 라이선스 구매 확인 후 제공한 원본 벡터를
// 그대로 사용): 처음엔 손으로 그린 근사 실루엣을 썼지만("펠리컨도
// 아니고" 라는 피드백대로 새로 안 읽혔다) — 사용자가 실제 라이선스를
// 구매한 연속선(continuous line) 참새 일러스트의 원본 SVG 파일을
// 제공해, 그 벡터 경로에서 새 본체 부분만 크롭해(가지/잎 긴 줄기는
// 제외 — 작은 크기로 날아다닐 때 얇은 가지가 거의 안 보여서) 이 저장소
// 자산으로 저장했다(public/sparrow.svg). 손그림 <path>를 <image>로
// 교체했을 뿐, 비행/자취/착지 로직은 전혀 안 바꿨다.
const SPARROW_ASSET_URL = "/sparrow.svg";
// sparrow.svg의 실제 crop 비율(1650:1300, viewBox="2250 900 1650 1300")과
// 맞춘 렌더 크기.
const SPARROW_WIDTH_PX = 44;
const SPARROW_HEIGHT_PX = Math.round((SPARROW_WIDTH_PX * 1300) / 1650);
// 원본 그림 자체가 향하는 기본 방향(머리/부리가 좌상단, 꼬리가
// 우하단) 각도 — 실제 비행 방향(atan2로 계산)에서 이 값만큼 보정해
// 회전시켜야 참새가 항상 나아가는 쪽을 바라본다.
const SPARROW_BASE_FACING_DEG = -151;

const TRACE_STROKE = "#166534";

const EDGE_MARGIN_PX = 18;

type Point = { x: number; y: number };

function randomBetween(min: number, max: number): number {
  return min + Math.random() * (max - min);
}

function clampPoint(p: Point, width: number, height: number, margin: number): Point {
  return {
    x: Math.min(Math.max(p.x, margin), Math.max(margin, width - margin)),
    y: Math.min(Math.max(p.y, margin), Math.max(margin, height - margin)),
  };
}

// 3차 베지어 위의 t 지점 좌표.
function cubicPoint(p0: Point, p1: Point, p2: Point, p3: Point, t: number): Point {
  const mt = 1 - t;
  const a = mt * mt * mt;
  const b = 3 * mt * mt * t;
  const c = 3 * mt * t * t;
  const d = t * t * t;
  return {
    x: a * p0.x + b * p1.x + c * p2.x + d * p3.x,
    y: a * p0.y + b * p1.y + c * p2.y + d * p3.y,
  };
}

// 3차 베지어의 t 지점 접선(방향) 벡터 — 정규화하지 않아도 atan2 각도
// 계산에는 영향 없다.
function cubicTangent(p0: Point, p1: Point, p2: Point, p3: Point, t: number): Point {
  const mt = 1 - t;
  return {
    x: 3 * mt * mt * (p1.x - p0.x) + 6 * mt * t * (p2.x - p1.x) + 3 * t * t * (p3.x - p2.x),
    y: 3 * mt * mt * (p1.y - p0.y) + 6 * mt * t * (p2.y - p1.y) + 3 * t * t * (p3.y - p2.y),
  };
}

// 시작점→끝점 사이에 랜덤한 곡률을 준 제어점 두 개를 만든다 — 매번 곡선
// 모양이 달라지도록 부풀림 방향/크기를 무작위로 고른다.
function randomControlPoints(start: Point, end: Point): [Point, Point] {
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  const dist = Math.max(1, Math.hypot(dx, dy));
  // 진행 방향에 수직인 단위 벡터.
  const perpX = -dy / dist;
  const perpY = dx / dist;
  const bulge = randomBetween(dist * 0.18, dist * 0.5) * (Math.random() < 0.5 ? -1 : 1);
  const p1 = {
    x: start.x + dx * 0.33 + perpX * bulge * randomBetween(0.6, 1),
    y: start.y + dy * 0.33 + perpY * bulge * randomBetween(0.6, 1),
  };
  const p2 = {
    x: start.x + dx * 0.66 + perpX * bulge * randomBetween(0.4, 1),
    y: start.y + dy * 0.66 + perpY * bulge * randomBetween(0.4, 1),
  };
  return [p1, p2];
}

function pickLandingPoint(container: HTMLElement): Point {
  const containerRect = container.getBoundingClientRect();
  const zoneEls = Array.from(container.querySelectorAll<HTMLElement>(SPARROW_ZONE_SELECTOR)).filter(
    (el) => el.offsetWidth > 0 && el.offsetHeight > 0,
  );

  if (zoneEls.length === 0) {
    return clampPoint(
      { x: randomBetween(0, containerRect.width), y: randomBetween(0, containerRect.height) },
      containerRect.width,
      containerRect.height,
      EDGE_MARGIN_PX,
    );
  }

  const el = zoneEls[Math.floor(Math.random() * zoneEls.length)];
  const rect = el.getBoundingClientRect();
  const relLeft = rect.left - containerRect.left;
  const relTop = rect.top - containerRect.top;
  const isLogoZone = el.dataset.sparrowZone === "logo";

  // "logo" 존은 그래픽 안의 유리돔이 보통 오른쪽에 있다는 가정으로
  // 오른쪽에 치우친 지점을 고른다. 그 외(좌/우 텍스트 등)는 요소 안
  // 무작위 지점.
  const point = isLogoZone
    ? { x: relLeft + rect.width * randomBetween(0.75, 0.95), y: relTop + rect.height * randomBetween(0.2, 0.75) }
    : { x: relLeft + rect.width * randomBetween(0.15, 0.85), y: relTop + rect.height * randomBetween(0.15, 0.85) };

  return clampPoint(point, containerRect.width, containerRect.height, EDGE_MARGIN_PX);
}

export function SparrowFlightAnimation({ containerRef }: { containerRef: RefObject<HTMLElement | null> }) {
  const [enabled, setEnabled] = useState(false);
  const sparrowSvgRef = useRef<SVGSVGElement>(null);
  const sparrowGroupRef = useRef<SVGGElement>(null);
  const tracePathRef = useRef<SVGPathElement>(null);

  const currentPosRef = useRef<Point | null>(null);
  const isFlyingRef = useRef(false);
  const rafIdRef = useRef<number | null>(null);
  const idleTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const fadeTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // HOTFIX(성능/접근성): 첫 마운트에만 판단 — 사용자가 "동작 줄이기"를
  // 켰으면 이 순수 장식 애니메이션 자체를 렌더링하지 않는다(스크롤/메인
  // 스레드에 아무 부담도 주지 않는 가장 확실한 방법).
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    setEnabled(true);
  }, []);

  useEffect(() => {
    if (!enabled) return;
    const container = containerRef.current;
    const sparrowSvg = sparrowSvgRef.current;
    const sparrowGroup = sparrowGroupRef.current;
    const tracePath = tracePathRef.current;
    if (!container || !sparrowSvg || !sparrowGroup || !tracePath) return;

    let cancelled = false;

    function positionSparrow(p: Point, rotationDeg: number) {
      if (!sparrowSvg || !sparrowGroup) return;
      sparrowSvg.setAttribute("x", String(p.x - SPARROW_WIDTH_PX / 2));
      sparrowSvg.setAttribute("y", String(p.y - SPARROW_HEIGHT_PX / 2));
      sparrowGroup.setAttribute("transform", `rotate(${rotationDeg} ${SPARROW_WIDTH_PX / 2} ${SPARROW_HEIGHT_PX / 2})`);
    }

    function scheduleNextFlight(delayMs: number) {
      idleTimeoutRef.current = setTimeout(() => {
        if (!cancelled) startFlight();
      }, delayMs);
    }

    function startFlight() {
      if (cancelled) return;
      const el = containerRef.current;
      if (!el || !sparrowSvg || !sparrowGroup || !tracePath) {
        scheduleNextFlight(2000);
        return;
      }
      const containerRect = el.getBoundingClientRect();
      const target = pickLandingPoint(el);
      const start =
        currentPosRef.current ??
        clampPoint(
          {
            x: Math.random() < 0.5 ? -EDGE_MARGIN_PX : containerRect.width + EDGE_MARGIN_PX,
            y: randomBetween(0, containerRect.height),
          },
          containerRect.width,
          containerRect.height,
          -EDGE_MARGIN_PX * 2,
        );
      const [p1, p2] = randomControlPoints(start, target);
      const distance = Math.hypot(target.x - start.x, target.y - start.y);
      const durationMs = Math.min(2600, Math.max(900, distance * 5));

      // 자취 경로 — 실제로 날아갈 베지어 곡선과 동일한 d. pathLength="1"로
      // 정규화해뒀기 때문에 stroke-dashoffset을 그냥 (1 - t)로 두면 비행
      // 진행률과 그대로 맞아떨어진다(길이 계산 불필요).
      tracePath.style.transition = "none";
      tracePath.style.opacity = "1";
      tracePath.setAttribute(
        "d",
        `M ${start.x} ${start.y} C ${p1.x} ${p1.y} ${p2.x} ${p2.y} ${target.x} ${target.y}`,
      );
      tracePath.style.strokeDashoffset = "1";

      isFlyingRef.current = true;
      const t0 = performance.now();

      function frame(now: number) {
        if (cancelled || !sparrowSvg || !sparrowGroup || !tracePath) return;
        const t = Math.min(1, (now - t0) / durationMs);
        const pos = cubicPoint(start, p1, p2, target, t);
        const tangent = cubicTangent(start, p1, p2, target, t);
        const angleDeg = (Math.atan2(tangent.y, tangent.x) * 180) / Math.PI;
        positionSparrow(pos, angleDeg - SPARROW_BASE_FACING_DEG);
        tracePath.style.strokeDashoffset = String(1 - t);

        if (t < 1) {
          rafIdRef.current = requestAnimationFrame(frame);
        } else {
          isFlyingRef.current = false;
          currentPosRef.current = target;
          onLanded();
        }
      }
      rafIdRef.current = requestAnimationFrame(frame);
    }

    function onLanded() {
      // 착지 직후 잠깐 자취를 그대로 보여주다가 서서히 사라지게 한다.
      fadeTimeoutRef.current = setTimeout(() => {
        if (cancelled || !tracePath) return;
        tracePath.style.transition = "opacity 2200ms ease";
        tracePath.style.opacity = "0";
      }, 500);
      scheduleNextFlight(randomBetween(2500, 6000));
    }

    // 첫 비행까지 약간의 지연(페이지 로드 직후 바로 날아다니기 시작하면
    // 정신없어 보여서, 방문자가 화면을 한 번 인지할 시간을 준다).
    scheduleNextFlight(randomBetween(800, 2000));

    // HOTFIX(사용자 지시 — "화면 크기가 변할 때 착지 좌표가 어긋나지
    // 않도록 반응형 처리"): 착지해 대기 중일 때 컨테이너 크기가 바뀌면
    // (모바일 회전, 창 크기 조절 등) 지금 좌표가 새 레이아웃 기준으로는
    // 엉뚱한 자리일 수 있다 — 비행 중이 아니면 즉시(애니메이션 없이) 존을
    // 다시 골라 스냅한다. 특정 좌표를 "보존"하려 하지 않는 이유: 애초에
    // 좌표는 DOM 요소(로고/텍스트) 기준으로 매번 새로 계산되므로, 리사이즈
        // 후에도 항상 "지금 유효한" 존 중 하나에 있는 것이 어색한 위치에
      // 고정되는 것보다 낫다.
    const resizeObserver = new ResizeObserver(() => {
      if (cancelled || isFlyingRef.current) return;
      const el = containerRef.current;
      if (!el) return;
      const next = pickLandingPoint(el);
      currentPosRef.current = next;
      positionSparrow(next, 0);
    });
    resizeObserver.observe(container);

    return () => {
      cancelled = true;
      resizeObserver.disconnect();
      if (rafIdRef.current !== null) cancelAnimationFrame(rafIdRef.current);
      if (idleTimeoutRef.current !== null) clearTimeout(idleTimeoutRef.current);
      if (fadeTimeoutRef.current !== null) clearTimeout(fadeTimeoutRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled]);

  if (!enabled) return null;

  return (
    <svg
      aria-hidden
      className="pointer-events-none absolute inset-0 z-30 h-full w-full overflow-visible"
    >
      <path
        ref={tracePathRef}
        d=""
        fill="none"
        stroke={TRACE_STROKE}
        strokeWidth={1.5}
        strokeLinecap="round"
        pathLength={1}
        strokeDasharray={1}
        strokeDashoffset={1}
        opacity={0}
      />
      <svg
        ref={sparrowSvgRef}
        x={-9999}
        y={-9999}
        width={SPARROW_WIDTH_PX}
        height={SPARROW_HEIGHT_PX}
        style={{ overflow: "visible" }}
      >
        <g ref={sparrowGroupRef}>
          <image href={SPARROW_ASSET_URL} width={SPARROW_WIDTH_PX} height={SPARROW_HEIGHT_PX} />
        </g>
      </svg>
    </svg>
  );
}
