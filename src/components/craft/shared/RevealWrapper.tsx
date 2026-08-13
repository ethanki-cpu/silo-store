"use client";

// EPIC-102: 원자 블록이 자기 콘텐츠를 이 컴포넌트로 감싸면 motion 설정에 따라
// 스크롤 진입 시 나타나는 모션을 얻는다. Craft의 connect() 대상 DOM(블록
// 최상위)과는 별개로 내부 콘텐츠에만 씌운다 — connect ref와 IntersectionObserver
// ref를 하나로 합칠 필요가 없어 구현이 단순해진다.
import type { ReactNode } from "react";
import { useScrollReveal, type MotionConfig } from "@/lib/useScrollReveal";

export function RevealWrapper({
  motion,
  children,
  className,
}: {
  motion: MotionConfig;
  children: ReactNode;
  className?: string;
}) {
  const { ref, className: revealClassName, style } = useScrollReveal(motion);
  return (
    <div ref={ref} className={`${revealClassName} ${className ?? ""}`} style={style}>
      {children}
    </div>
  );
}
