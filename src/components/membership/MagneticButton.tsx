"use client";

import { animated, useSpring } from "@react-spring/web";
import { useRef, type ReactNode } from "react";

// EPIC-163 / HOTFIX-164.1: 마우스가 다가오면 버튼이 자석처럼 끌려오는 Magnetic Hover — React Spring의 스프링 물리(tension/friction/mass)로 구현.
// 터치 기기(hover 없음)에서는 자연스럽게 무동작.
export function MagneticButton({
  children,
  onClick,
  disabled,
  className = "",
  style,
  strength = 0.35,
}: {
  children: ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  className?: string;
  style?: React.CSSProperties;
  strength?: number;
}) {
  const ref = useRef<HTMLButtonElement>(null);
  const [spring, api] = useSpring(() => ({ x: 0, y: 0, scale: 1, config: { tension: 220, friction: 14, mass: 0.6 } }));

  return (
    <div
      className="inline-block p-6 -m-6"
      onMouseMove={(e) => {
        if (disabled || !ref.current) return;
        const r = ref.current.getBoundingClientRect();
        api.start({ x: (e.clientX - (r.left + r.width / 2)) * strength, y: (e.clientY - (r.top + r.height / 2)) * strength });
      }}
      onMouseLeave={() => api.start({ x: 0, y: 0 })}
    >
      <animated.button
        ref={ref}
        type="button"
        onClick={onClick}
        disabled={disabled}
        style={{ ...style, x: spring.x, y: spring.y, scale: spring.scale }}
        onPointerDown={() => api.start({ scale: 0.96 })}
        onPointerUp={() => api.start({ scale: 1 })}
        onPointerLeave={() => api.start({ scale: 1 })}
        className={className}
      >
        {children}
      </animated.button>
    </div>
  );
}
