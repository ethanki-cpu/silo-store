"use client";

// EPIC-136(헤더 재구축): Navbar.tsx의 각 요소(로고/탭/계정 메뉴 항목)를
// 감싸 "관리자 편집 모드에서 클릭→선택, 드래그→이동"을 붙이는 얇은 래퍼.
// headerLayoutPositions.ts 상단 주석 참고 — position:absolute가 아니라
// transform: translate(dx, dy)만 얹는 방식이라 원래 flex 레이아웃/문서
// 흐름을 전혀 바꾸지 않는다(기존 구조 회귀 위험 최소화).
//
// 이 컴포넌트는 Navbar.tsx 안에서만 쓰이지만, Navbar 함수 본문 안에
// inline으로 정의하면 매 렌더마다 새 컴포넌트 타입이 만들어져 리액트가
// 매번 마운트/언마운트로 취급해(드래그 중 포인터 캡처가 끊기는 등) 버그가
// 나므로 모듈 최상위에 독립 컴포넌트로 둔다.
import { createContext, useContext, useRef, useState, type CSSProperties, type PointerEvent as ReactPointerEvent, type ReactNode } from "react";
import { SelectionOverlay } from "@/components/SelectionOverlay";
import { DEFAULT_HEADER_SLOT_OFFSET, PC_HEADER_REFERENCE_WIDTH_PX, type HeaderSlotOffset } from "@/lib/headerLayoutPositions";
import { measureReferenceWidth, useReferenceWidth } from "@/lib/useReferenceWidth";

// HOTFIX-152.14(사용자 지시 — "창의 크기가 줄어들더라도, 로고, 아이콘의
// 간격이 유지가 되면서 줄어들어야지"): PC 계층에서는 Navbar.tsx가 헤더
// 전체를 CSS zoom으로 화면 폭 비율만큼 통째로 축소한다 — 그 안의 각
// HeaderSlot까지 자기 dx를 "지금 화면 폭" 기준으로 또 스케일링하면
// zoom과 이중으로 곱해져 실제보다 훨씬 더 작아진다. "fixed" 모드에서는
// dx를 PC_HEADER_REFERENCE_WIDTH_PX라는 고정 기준으로만 정규화하고,
// 화면 폭에 따른 축소는 전적으로 zoom에 맡긴다. 태블릿/모바일 탭은
// 이런 전체 zoom이 없으므로("dynamic", 기존과 동일) 지금 화면 폭
// 기준 스케일링을 그대로 유지한다.
export const HeaderScaleModeContext = createContext<"dynamic" | "fixed">("dynamic");

type DragState = { startX: number; startY: number; startDx: number; startDy: number; baseLeft: number; baseTop: number; width: number; height: number; refWidthPx: number };
type Guides = { v: number[]; h: number[] };

// HOTFIX-141.1(사용자 지시 — "'홈페이지 설정관리'의 live preview 에
// 요소를 드래그 할때, align guideline 이 보이면 좋겠어 그래서 중앙,
// 다른 요소들과 위치가 맞는지 알수 있게"): 드래그 중인 요소의 중심이
// (1) 캔버스([data-admin-canvas] 마커) 가로/세로 중앙, (2) 다른
// HeaderSlot([data-header-slot] 마커)들의 중심과 몇 픽셀 이내로
// 가까워지면 안내선을 그린다. 스냅(자동 보정)까지는 하지 않고 시각적
// 안내만 — 강제로 위치를 튕기면 "드래그가 먹통"처럼 느껴질 위험이 있어
// 순수 피드백으로만 범위를 좁혔다.
// HOTFIX-141.2(사용자 지시 — "가이드라인에 'center' 맞추기와 다른 요소들과의
// align이 가능하는걸 원해"): HOTFIX-141.1은 안내선을 순수 시각 피드백으로만
// 넣고 실제로 위치를 보정하지는 않았다(강제로 튕기면 드래그가 먹통처럼
// 느껴질까 봐) — 이번엔 그 요청대로 실제로 달라붙게 만든다. 이 반경 안에
// 들어오면 그 축으로 정확히 스냅하고 안내선도 그 자리에 뜬다.
const SNAP_THRESHOLD_PX = 6;

function collectGuideTargets(selfEl: Element): { vCenters: number[]; hCenters: number[] } {
  const vCenters: number[] = [];
  const hCenters: number[] = [];
  const canvas = document.querySelector("[data-admin-canvas]");
  if (canvas) {
    const r = canvas.getBoundingClientRect();
    vCenters.push(r.left + r.width / 2);
  }
  document.querySelectorAll("[data-header-slot]").forEach((el) => {
    if (el === selfEl) return;
    const r = el.getBoundingClientRect();
    if (r.width === 0 && r.height === 0) return;
    vCenters.push(r.left + r.width / 2);
    hCenters.push(r.top + r.height / 2);
  });
  return { vCenters, hCenters };
}

export function HeaderSlot({
  slotKey,
  label,
  offset,
  editable,
  selected,
  onSelect,
  onOffsetChange,
  as: Tag = "div",
  className,
  style,
  children,
  interactive = false,
}: {
  slotKey: string;
  label: string;
  offset: HeaderSlotOffset | undefined;
  editable: boolean;
  selected: boolean;
  onSelect: (slotKey: string) => void;
  onOffsetChange: (slotKey: string, next: HeaderSlotOffset) => void;
  as?: "div" | "span";
  className?: string;
  style?: CSSProperties;
  children: ReactNode;
  // HOTFIX-140.2(사용자 지시 — "상단 사이드바를 여는 아이콘을 클릭하면...
  // 실제 상단 사이드 바가 열리고"): HOTFIX-137.1이 편집 모드에서 모든
  // children의 실제 동작(로그아웃 실행, 링크 네비게이션)을 캡처 단계에서
  // 막았는데, 이건 "화면을 벗어나거나 세션에 부작용을 주는" 위험한
  // 동작에는 맞지만, "이 페이지 안에서 패널을 열고 닫는" 안전한 토글
  // 동작(상단/좌우 사이드바 열기 버튼 등)까지 똑같이 막아버려 "클릭해도
  // 캔버스에서 미리보기가 안 열린다"는 새 버그가 됐다. interactive=true인
  // 슬롯은 선택 처리(onSelect)는 그대로 하되 preventDefault/stopPropagation을
  // 걸지 않아 children 자신의 onClick(토글)도 정상적으로 함께 실행된다 —
  // 네비게이션이나 세션 변경이 없는, 로컬 state 토글 트리거에만 사용할 것.
  interactive?: boolean;
}) {
  const value = offset ?? DEFAULT_HEADER_SLOT_OFFSET;
  const dragRef = useRef<DragState | null>(null);
  const wrapperRef = useRef<HTMLElement | null>(null);
  const moved = value.dxPx !== 0 || value.dyPx !== 0;
  const [guides, setGuides] = useState<Guides>({ v: [], h: [] });

  // HOTFIX-141.15: 저장된 dxPx는 refWidthPx(드래그 당시 기준 폭) 기준이다
  // — 지금 기준 폭과 비율만큼 스케일링해 실제로 적용한다(가로만 — 세로는
  // 폭 변화와 무관하므로 그대로).
  // HOTFIX-146(사용자 반복 신고 — "'홈페이지 설정 관리'의 preview가 실제
  // 홈페이지 출력과 다르다"): refWidthPx가 없는 경우를 "배율 1로 적용"
  // 취급했던 게 진짜 원인이었다 — 141.15 이전에 드래그돼 refWidthPx 없이
  // 저장된 값(예: '관리자' dxPx=-747, '스튜디오' dxPx=-735)은 그 당시
  // 캔버스 폭에서만 유효한 큰 픽셀값인데, "배율 1"로 아무 폭에서나 그대로
  // 적용해버리면 관리자 캔버스 폭과 실제 방문자 창 폭이 조금만 달라도
  // 화면 밖으로 완전히 밀려나 사라진다(실측: 관리자 캔버스에서는 우연히
  // 보이는 위치였지만 실제 사이트 폭에서는 x좌표가 음수로 나가 안 보임).
  // 기준 폭을 모르는 오프셋은 "적당히 맞겠지"로 그대로 믿기보다
  // 아예 무시(0)하는 게 안전하다 — 원래 flex 자리로 돌아가 항상 화면
  // 안에 보이는 값이 "폭 불명 오프셋을 그대로 믿어 화면 밖으로 나가는 것"보다
  // 훨씬 낫다. 새로 드래그하면 refWidthPx가 항상 함께 저장되니(위 startDrag
  // 참고) 이 경로를 다시 타지 않는다.
  const referenceWidth = useReferenceWidth();
  const scaleMode = useContext(HeaderScaleModeContext);
  const hasKnownRefWidth = typeof value.refWidthPx === "number" && value.refWidthPx > 0;
  const targetWidth = scaleMode === "fixed" ? PC_HEADER_REFERENCE_WIDTH_PX : referenceWidth;
  const scaleFactor = hasKnownRefWidth && targetWidth > 0 ? targetWidth / value.refWidthPx! : 1;
  const effectiveDx = hasKnownRefWidth ? value.dxPx * scaleFactor : 0;

  function startDrag(e: ReactPointerEvent<HTMLElement>) {
    e.stopPropagation();
    e.preventDefault();
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {
      // no-op — 캡처 실패해도 아래 dragRef는 그대로 세팅
    }
    // 지금 화면상 rect에서 현재 transform(dx,dy)을 빼서 "변형 전" 기준
    // 위치를 구해둔다 — 드래그 도중에는 매번 DOM을 재측정하지 않고
    // 이 기준값 + 실시간 dx/dy만으로 투영 위치를 계산한다(레이아웃
    // thrashing과, 방금 적용한 transform이 아직 반영 안 된 상태를
        // 읽어버리는 stale read를 둘 다 피한다).
    // HOTFIX-141.15: startDx는 "지금 화면에 실제로 보이는" 오프셋
    // (effectiveDx, 오늘 폭 기준)에서 시작 — 그래야 드래그를 마칠 때
    // 새로 저장하는 dxPx/refWidthPx가 지금 이 순간의 폭에 다시 맞춰
    // 재보정된다(이전에 다른 폭에서 저장된 값을 그대로 이어받지 않음).
    const rect = wrapperRef.current?.getBoundingClientRect();
    dragRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      startDx: effectiveDx,
      startDy: value.dyPx,
      baseLeft: (rect?.left ?? 0) - effectiveDx,
      baseTop: (rect?.top ?? 0) - value.dyPx,
      width: rect?.width ?? 0,
      height: rect?.height ?? 0,
      refWidthPx: measureReferenceWidth(),
    };
  }
  function moveDrag(e: ReactPointerEvent<HTMLElement>) {
    const drag = dragRef.current;
    if (!drag) return;
    let nextDx = drag.startDx + (e.clientX - drag.startX);
    let nextDy = drag.startDy + (e.clientY - drag.startY);

    if (wrapperRef.current) {
      const centerX = drag.baseLeft + drag.width / 2 + nextDx;
      const centerY = drag.baseTop + drag.height / 2 + nextDy;
      const { vCenters, hCenters } = collectGuideTargets(wrapperRef.current);

      // 여러 후보가 반경 안에 들어오면 가장 가까운 것 하나에만 달라붙는다
      // (여러 축에 동시에 끌려가면 오히려 어디에 붙었는지 헷갈린다).
      let bestV: number | null = null;
      let bestVDist = SNAP_THRESHOLD_PX;
      for (const x of vCenters) {
        const d = Math.abs(x - centerX);
        if (d < bestVDist) {
          bestVDist = d;
          bestV = x;
        }
      }
      let bestH: number | null = null;
      let bestHDist = SNAP_THRESHOLD_PX;
      for (const y of hCenters) {
        const d = Math.abs(y - centerY);
        if (d < bestHDist) {
          bestHDist = d;
          bestH = y;
        }
      }
      if (bestV !== null) nextDx += bestV - centerX;
      if (bestH !== null) nextDy += bestH - centerY;
      setGuides({ v: bestV !== null ? [bestV] : [], h: bestH !== null ? [bestH] : [] });
    }

    onOffsetChange(slotKey, { dxPx: nextDx, dyPx: nextDy, raised: true, refWidthPx: drag.refWidthPx });
  }
  function endDrag() {
    dragRef.current = null;
    setGuides({ v: [], h: [] });
  }
  // HOTFIX-141.13(사용자 지시 — "드래그로 움직이고, 수정이 끝나면
  // 고정되도록, pc와 mobile 둘 다"): 잠금 토글 — dx/dy는 그대로 두고
  // locked만 뒤집는다.
  function toggleLock() {
    onOffsetChange(slotKey, { ...value, locked: !value.locked });
  }

  // HOTFIX-141.8(사용자 신고 — "'관리자' 랑 '스튜디오' 가 클릭이 안되잖아":
  // 실제로 재현해보니 dxPx/dyPx가 전부 0이어도 여전히 막혀 있었다 — 예전엔
  // "한 번이라도 드래그된 적 있으면"(value.raised, 드래그 종료 시 영구
  // true로 저장됨) z-index:30을 계속 유지했는데, 로고처럼 flex-1로 헤더
  // 폭 전체를 차지하는 슬롯이 이 상태가 되면 실제 위치는 그대로여도
  // z-index만 남아 시각적으로 안 보여도 자기 박스 범위 안의 다른(격상 안 된)
  // 요소 클릭을 전부 가로챈다 — "관리자"/"스튜디오"가 반복해서 다시
  // 막히던 진짜 원인이었다(DB의 오프셋 값을 아무리 0,0으로 되돌려도
  // raised:true만 남아있으면 재발). 이제 "실제로 옮겨진 상태"(moved) 또는
  // "지금 선택된 상태"(selected)일 때만 격상한다 — 과거에 한 번 드래그됐던
  // 이력 자체는 더 이상 격상 이유가 아니다.
  // HOTFIX-141.14(사용자 지시 — "pc 와 모바일 모두, 요소의 어디를
  // 일부분을 클릭하든 드래그를 할수 있게 해줘"): 예전엔 요소 위에 뜨는
  // 작은 ✥ 핸들(20x20px)만 드래그를 시작할 수 있어 손가락/마우스로
  // 정확히 그 지점을 집어야 했다 — 이미 선택된 상태라면 요소 어디를
  // 눌러도(포인터다운이 이 wrapper까지 버블링) 바로 드래그가 시작되게
  // 한다. 아직 선택 전(첫 클릭)에는 이 핸들러를 걸지 않아 기존처럼
  // "먼저 클릭해서 선택 → 그다음 드래그"가 그대로 유지된다. 잠겨있으면
  // (locked) 걸지 않아 실수로 다시 끌리지 않는다는 원칙도 동일하게 지킨다.
  const wholeElementDraggable = editable && selected && !value.locked;
  const wrapperStyle: CSSProperties = {
    ...style,
    ...(moved || (selected && editable) ? { position: "relative", zIndex: 30 } : undefined),
    ...(moved ? { transform: `translate(${effectiveDx}px, ${value.dyPx}px)` } : undefined),
    ...(wholeElementDraggable ? { cursor: "move" } : undefined),
  };

  return (
    <>
    <Tag
      ref={wrapperRef as never}
      data-header-slot={editable ? slotKey : undefined}
      style={wrapperStyle}
      className={className}
      onPointerDown={wholeElementDraggable ? startDrag : undefined}
      onPointerMove={wholeElementDraggable ? moveDrag : undefined}
      onPointerUp={wholeElementDraggable ? endDrag : undefined}
      onPointerLeave={wholeElementDraggable ? endDrag : undefined}
      // HOTFIX-137.1(사용자 지시 — "'로그아웃' 버튼을 조정하려고 클릭하면
      // 진짜 로그아웃이 되버려"): 예전엔 onClick(버블 단계)에서 선택만
      // 처리하고 stopPropagation만 했는데, 그건 "위로 전파되는 것"만 막지
      // "이 요소 자신의 onClick/기본 동작(로그아웃 실행, <a> 네비게이션)"은
      // 전혀 막지 못한다 — 클릭 이벤트는 자식(children) 쪽에서 먼저
      // 발생하므로 children의 onClick(handleLogout 등)이 그대로 실행된
      // "뒤에" 이 wrapper의 onClick이 뒤늦게 선택 처리를 했던 것. 캡처
      // 단계(onClickCapture, 루트→타깃 방향으로 자식보다 먼저 실행)에서
      // preventDefault+stopPropagation을 걸어 아예 children까지 이벤트가
      // 도달하기 전에 막는다 — 편집 모드에서는 어떤 children(로그아웃
      // 버튼/링크 등)도 실제 동작을 실행하지 않고 오직 선택만 된다.
      onClickCapture={
        editable
          ? (e) => {
              if (!interactive) {
                e.preventDefault();
                e.stopPropagation();
              }
              onSelect(slotKey);
            }
          : undefined
      }
    >
      {children}
      {editable && (
        <>
          <SelectionOverlay selected={selected} hovered={false} label={label} />
          {selected && (
            <div className="absolute -top-3 left-1/2 z-30 flex -translate-x-1/2 items-center gap-1">
              {/* HOTFIX-141.13: 잠겨있으면 드래그 핸들 자체를 렌더링하지
                  않는다 — 핸들이 없으면 startDrag를 걸 방법이 없어 실수로
                  다시 끌리는 게 구조적으로 불가능해진다(잠금 버튼만 눌러
                  풀어야 다시 나타남). */}
              {!value.locked && (
                <button
                  type="button"
                  onPointerDown={startDrag}
                  onPointerMove={moveDrag}
                  onPointerUp={endDrag}
                  onPointerLeave={endDrag}
                  title="드래그해서 이동"
                  className="flex h-5 w-5 cursor-move items-center justify-center rounded bg-blue-500 text-[10px] text-white shadow"
                >
                  ✥
                </button>
              )}
              <button
                type="button"
                onClick={toggleLock}
                title={value.locked ? "잠금 해제(다시 드래그 가능)" : "지금 위치에 고정(실수로 다시 끌리지 않게)"}
                className={`flex h-5 w-5 items-center justify-center rounded text-[10px] text-white shadow ${
                  value.locked ? "bg-amber-500" : "bg-gray-400 hover:bg-gray-500"
                }`}
              >
                {value.locked ? "🔒" : "🔓"}
              </button>
            </div>
          )}
        </>
      )}
    </Tag>
      {/* HOTFIX-141.1: 안내선은 position:fixed라 <Tag>가 이동 중
          transform을 갖게 되면(그게 새 containing block이 돼) 뷰포트
          기준이 깨진다 — 그래서 <Tag> 형제(바깥 Fragment)로 렌더링한다. */}
      {(guides.v.length > 0 || guides.h.length > 0) && (
        <>
          {guides.v.map((x) => (
            <div key={`v-${x}`} className="pointer-events-none fixed inset-y-0 z-[999] w-px bg-pink-500" style={{ left: x }} />
          ))}
          {guides.h.map((y) => (
            <div key={`h-${y}`} className="pointer-events-none fixed inset-x-0 z-[999] h-px bg-pink-500" style={{ top: y }} />
          ))}
        </>
      )}
    </>
  );
}
