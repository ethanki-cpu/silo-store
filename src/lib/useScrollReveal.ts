"use client";

// EPIC-102: Craft.js 프리폼 에디터의 모든 원자 블록이 공유하는 "스크롤로
// 뷰포트에 들어오면 나타나는" 모션 훅. 한 번 노출되면 되돌리지 않는다(다시
// 스크롤을 올려도 사라지지 않음 — Kinfolk류 에디토리얼 사이트의 일반적인
// 동작과 일치). `prefers-reduced-motion`을 존중해 그 설정이 켜져 있으면
// 모션 없이 즉시 최종 상태로 렌더링한다.
import { useEffect, useRef, useState, type CSSProperties } from "react";

export type MotionType = "none" | "fade" | "slide-up" | "slide-left";

export type MotionConfig = {
  type: MotionType;
  delayMs: number;
  durationMs: number;
};

export const DEFAULT_MOTION: MotionConfig = { type: "none", delayMs: 0, durationMs: 600 };

export const MOTION_TYPE_LABELS: Record<MotionType, string> = {
  none: "없음",
  fade: "페이드 인",
  "slide-up": "아래에서 위로",
  "slide-left": "오른쪽에서 왼쪽으로",
};

const HIDDEN_CLASS: Record<MotionType, string> = {
  none: "",
  fade: "opacity-0",
  "slide-up": "opacity-0 translate-y-6",
  "slide-left": "opacity-0 translate-x-6",
};

export function useScrollReveal(motion: MotionConfig) {
  const ref = useRef<HTMLDivElement | null>(null);
  const [revealed, setRevealed] = useState(motion.type === "none");

  useEffect(() => {
    if (motion.type === "none") {
      setRevealed(true);
      return;
    }
    if (typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) {
      setRevealed(true);
      return;
    }
    const node = ref.current;
    if (!node) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          setRevealed(true);
          observer.disconnect();
        }
      },
      { threshold: 0.15 },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [motion.type]);

  return {
    ref,
    className: `transition-all ease-out ${revealed ? "opacity-100 translate-x-0 translate-y-0" : HIDDEN_CLASS[motion.type]}`,
    style: {
      transitionDuration: `${motion.durationMs}ms`,
      transitionDelay: revealed ? `${motion.delayMs}ms` : "0ms",
    } as CSSProperties,
  };
}
