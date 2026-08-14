"use client";

// EPIC-113: /about-silo는 이전까지 catch-all(src/app/[...slug]/page.tsx)이
// page_builder 위젯으로 렌더링하던 slug였다 — 이 정적 라우트 파일을 두면
// Next.js가 catch-all보다 먼저 매칭해(홈페이지/스튜디오와 동일한 원칙,
// EPIC-099 참고) 위젯 시스템을 완전히 벗어난 3D 우주 경험으로 대체된다.
import { AboutSiloUniverse } from "@/components/about-silo/AboutSiloUniverse";

export default function AboutSiloPage() {
  return <AboutSiloUniverse />;
}
