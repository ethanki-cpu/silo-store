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

// EPIC-109: "가로세로 비율 직접 입력"용 파서 — "4/3", "4:3", "1.33" 전부
// 허용한다. 유효하지 않으면 null(비율 고정 안 함으로 취급).
export function parseAspectRatio(value: string): number | null {
  if (!value) return null;
  const parts = value.split(/[/:]/).map((s) => Number.parseFloat(s.trim()));
  if (parts.length === 2 && parts.every((n) => Number.isFinite(n) && n > 0)) {
    return parts[0] / parts[1];
  }
  const single = Number.parseFloat(value);
  return Number.isFinite(single) && single > 0 ? single : null;
}

// 자유 배치 리사이즈 프리셋(가로/세로) — 이미지 블록의 "비율 선택" 드롭다운이
// 이 목록을 그대로 쓴다.
export const ASPECT_RATIO_PRESETS: { label: string; value: string }[] = [
  { label: "자유(비율 안 씀)", value: "" },
  { label: "정사각형 1:1", value: "1/1" },
  { label: "4:3", value: "4/3" },
  { label: "3:4(세로)", value: "3/4" },
  { label: "3:2", value: "3/2" },
  { label: "2:3(세로)", value: "2/3" },
  { label: "16:9", value: "16/9" },
  { label: "9:16(세로)", value: "9/16" },
  { label: "21:9(파노라마)", value: "21/9" },
  { label: "5:4", value: "5/4" },
];
