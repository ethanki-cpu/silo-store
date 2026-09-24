"use client";

import { motion, useMotionValue, useSpring } from "framer-motion";
import { useRef, type ReactNode } from "react";

// EPIC-163: 마우스가 다가오면 버튼이 자석처럼 끌려오는 Magnetic Hover. 터치 기기(hover 없음)에서는 자연스럽게 무동작.
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
  const x = useSpring(useMotionValue(0), { stiffness: 220, damping: 16, mass: 0.4 });
  const y = useSpring(useMotionValue(0), { stiffness: 220, damping: 16, mass: 0.4 });

  return (
    <div
      className="inline-block p-6 -m-6"
      onMouseMove={(e) => {
        if (disabled || !ref.current) return;
        const r = ref.current.getBoundingClientRect();
        x.set((e.clientX - (r.left + r.width / 2)) * strength);
        y.set((e.clientY - (r.top + r.height / 2)) * strength);
      }}
      onMouseLeave={() => {
        x.set(0);
        y.set(0);
      }}
    >
      <motion.button ref={ref} type="button" onClick={onClick} disabled={disabled} style={{ x, y, ...style }} whileTap={{ scale: 0.96 }} className={className}>
        {children}
      </motion.button>
    </div>
  );
}
