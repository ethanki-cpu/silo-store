// EPIC-108: 컨테이너 안에서 이미지 위에 이미지/텍스트/버튼을 겹쳐 놓는
// "콜라주" 배치 — 컨테이너 쿼리 기반 반응형을 유지하려고 px가 아니라 부모
// 기준 %로 저장한다(뷰포트가 바뀌어도 겹침 위치·비율이 그대로 유지됨).
import type { CSSProperties } from "react";

export type FreePosition = {
  enabled: boolean;
  xPct: number;
  yPct: number;
  widthPct: number;
  heightPct: number;
  zIndex: number;
};

export const DEFAULT_FREE_POSITION: FreePosition = {
  enabled: false,
  xPct: 10,
  yPct: 10,
  widthPct: 40,
  heightPct: 40,
  zIndex: 1,
};

// 항상 `position: relative`를 기본으로 깔아 자유배치 핸들(✥/리사이즈 점)이
// 이 요소 자신을 기준으로 정확히 붙게 하고, enabled일 때만 그 위에
// `position: absolute` + %좌표를 얹어 부모 컨테이너 기준으로 떠오르게 한다.
export function freePositionStyle(position: FreePosition): CSSProperties {
  if (!position.enabled) return { position: "relative" };
  return {
    position: "absolute",
    left: `${position.xPct}%`,
    top: `${position.yPct}%`,
    width: `${position.widthPct}%`,
    height: `${position.heightPct}%`,
    zIndex: position.zIndex,
  };
}

export function clampPct(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}
