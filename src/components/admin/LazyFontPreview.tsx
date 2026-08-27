"use client";

import { useEffect, useRef, useState } from "react";

// HOTFIX-151.2(사용자 신고 — "커스텀 폰트의 미리보기가 로딩이 너무 느려"):
// @font-face 선언 자체는 다운로드를 트리거하지 않지만, 실제로 그 폰트로
// 텍스트를 렌더링하는 순간 브라우저가 파일을 받아온다 — /admin/fonts와
// FontPicker 둘 다 등록된 모든 폰트의 미리보기 텍스트를 마운트 즉시
// 렌더링해서, 폰트가 여러 개(특히 한글 폰트는 파일 용량이 큼) 등록돼
// 있으면 페이지가 뜨자마자 전부 동시에 다운로드를 시작해 대역폭을
// 나눠 먹으며 전체가 느려졌다. IntersectionObserver로 실제로 화면에
// 보이는(또는 곧 보일) 항목만 폰트를 적용해 필요한 만큼만 순차적으로
// 받아오게 한다 — 보이기 전에는 기본 글꼴로 텍스트만 먼저 보여준다.
export function LazyFontPreview({
  fontFamily,
  text,
  className,
}: {
  fontFamily: string;
  text: string;
  className?: string;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { rootMargin: "200px" },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <span ref={ref} className={className} style={visible ? { fontFamily } : undefined}>
      {text}
    </span>
  );
}
