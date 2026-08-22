// EPIC-136(헤더 재구축 — 사용자 지시 "드래그앤 드롭으로 버튼이든, 이미지,
// 영상, 무슨 요소든지 자유롭게 내가 선택하면 그 화면 안에서 마음대로
// 움직일수 있게 해달라"): Navbar.tsx의 각 요소(로고/탭/계정 메뉴 항목)를
// 화면 어디로든 자유롭게 드래그해 옮길 수 있게 하는 저장 데이터.
//
// EPIC-108(홈페이지 콜라주)의 useFreePosition.ts(xPct/yPct/widthPct/
// heightPct, position:absolute 기반)를 그대로 재사용하지 않는다 — 그
// 시스템은 "공유된 하나의 position:relative 캔버스" 위에서 %좌표로 절대
// 배치하는 걸 전제로 하는데, Navbar.tsx의 로고 줄/탭 줄은 이미 각자
// 독립된 position:relative 컨테이너를 갖고 있어(드롭다운 메가메뉴가
// 그 relative에 의존) 공유 캔버스로 합치려면 그 relative들을 걷어내야 해
// 회귀 위험이 크다. 대신 이 저장소가 이미 쓰고 있는 더 안전한 패턴
// (EPIC-117의 tier1Tabs "translate-y-1/2로 로고 줄에 걸치기" 트릭)을
// 일반화한다 — 각 요소는 원래의 flex 레이아웃 자리를 그대로 유지한 채
// (자리 자체를 차지하는 채로) `transform: translate(dxPx, dyPx)`만
// 얹어 시각적으로 어디로든 옮겨 보이게 한다. transform은 어떤 조상이
// position:relative인지와 무관하게 항상 동작하고, 문서 흐름/CSS 포함
// 블록 계산에 전혀 영향을 주지 않아 기존 구조(메가메뉴 hover, 사이드바
// 등)를 전혀 건드리지 않고 얹을 수 있는 가장 안전한 방식이다.
export type HeaderSlotOffset = {
  dxPx: number;
  dyPx: number;
  /** 한 번이라도 옮긴 적이 있으면 true — z-index를 올려 원래 자리의 다른 요소 위로 보이게 한다. */
  raised: boolean;
  // HOTFIX-141.13(사용자 지시 — "드래그로 움직이고, 수정이 끝나면 고정되도록,
  // pc와 mobile 둘 다"): true면 드래그 핸들 자체가 렌더링되지 않아 실수로
  // 다시 끌리는 일을 막는다(로고+양옆 텍스트 간격이 자꾸 흐트러지던 문제의
  // 재발 방지) — 위치 값은 그대로 두고 "더 이상 움직이지 않게" 잠그기만
  // 한다. Controls 패널이나 캔버스의 🔓/🔒 버튼으로 언제든 다시 풀 수 있다.
  locked?: boolean;
};

export const DEFAULT_HEADER_SLOT_OFFSET: HeaderSlotOffset = { dxPx: 0, dyPx: 0, raised: false, locked: false };

export type HeaderPositionsConfig = {
  slots: Record<string, HeaderSlotOffset>;
};

export type HeaderPositionsValue = { pc: HeaderPositionsConfig; mobile: HeaderPositionsConfig };

export function defaultHeaderPositionsConfig(): HeaderPositionsConfig {
  return { slots: {} };
}

export function defaultHeaderPositionsValue(): HeaderPositionsValue {
  return { pc: defaultHeaderPositionsConfig(), mobile: defaultHeaderPositionsConfig() };
}

function normalizeConfig(raw: unknown): HeaderPositionsConfig {
  const value = raw as Partial<HeaderPositionsConfig> | null;
  return { slots: { ...(value?.slots ?? {}) } };
}

export function normalizeHeaderPositions(raw: unknown): HeaderPositionsValue {
  if (!raw || typeof raw !== "object") return defaultHeaderPositionsValue();
  const obj = raw as Record<string, unknown>;
  if (obj.pc || obj.mobile) {
    return { pc: normalizeConfig(obj.pc), mobile: normalizeConfig(obj.mobile) };
  }
  return defaultHeaderPositionsValue();
}

export function getSlotOffset(config: HeaderPositionsConfig | null | undefined, slotKey: string): HeaderSlotOffset {
  return config?.slots[slotKey] ?? DEFAULT_HEADER_SLOT_OFFSET;
}
