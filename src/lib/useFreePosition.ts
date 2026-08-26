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

// HOTFIX-147.7(사용자 지시 — "모바일에서 텍스트 위치를 드래그 드롭으로 따로
// 설정할 수 있게 해줘"): mobilePosition이 있는 블록만 쓰는 확장판 —
// 인라인 style 대신 CSS 커스텀 프로퍼티 + 정적 클래스(globals.css의
// .craft-free-pos, `@container (max-width:767px)` 오버라이드)로 좌표를
// 넘긴다. Tailwind는 런타임에 동적으로 만든 `left-[42%]` 같은 클래스명을
// 빌드 타임에 못 보므로(JIT 스캔 불가) 임의 값을 그대로 유틸리티 클래스로
// 못 쓴다 — CSS 변수가 그 우회로다. mobilePosition이 없으면(대부분의 기존
// 블록) 기존 freePositionStyle과 완전히 동일하게 동작한다(모바일 오버레이
// 클래스 자체가 안 붙음).
export function freePositionResponsiveAttrs(
  position: FreePosition,
  mobilePosition?: FreePosition | null,
): { style: CSSProperties; className: string } {
  if (!position.enabled) return { style: { position: "relative" }, className: "" };

  const vars: Record<string, string> = {
    "--fp-x": `${position.xPct}%`,
    "--fp-y": `${position.yPct}%`,
    "--fp-w": `${position.widthPct}%`,
    "--fp-h": `${position.heightPct}%`,
  };
  const hasMobile = !!mobilePosition;
  if (hasMobile) {
    vars["--fp-x-m"] = `${mobilePosition!.xPct}%`;
    vars["--fp-y-m"] = `${mobilePosition!.yPct}%`;
    vars["--fp-w-m"] = `${mobilePosition!.widthPct}%`;
    vars["--fp-h-m"] = `${mobilePosition!.heightPct}%`;
  }

  return {
    style: { ...(vars as CSSProperties), zIndex: position.zIndex },
    className: `craft-free-pos${hasMobile ? " craft-free-pos--has-mobile" : ""}`,
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

// EPIC-111: "가로세로 비율 직접 입력"(텍스트로 "4/3" 등을 타이핑) 대신
// 너비(px)/높이(px) 두 숫자 입력으로 대체하면서, 기존 저장값을 그 두
// 입력창에 최대한 그대로 되비쳐 보여주기 위한 역파서 — "4/3"이면 [4,3]을
// 그대로, 파싱 불가능한 값이면 프리셋 중 하나로도 안 맞았을 값이니 기본
// 4:3으로 되돌린다(parseAspectRatio가 null을 주는 경우와 동일 기준).
export function splitAspectRatio(value: string): [number, number] {
  const parts = value.split(/[/:]/).map((s) => Number.parseFloat(s.trim()));
  if (parts.length === 2 && parts.every((n) => Number.isFinite(n) && n > 0)) {
    return [parts[0], parts[1]];
  }
  const single = Number.parseFloat(value);
  return Number.isFinite(single) && single > 0 ? [single, 1] : [4, 3];
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
