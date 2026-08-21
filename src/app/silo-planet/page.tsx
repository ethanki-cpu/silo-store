"use client";

// HOTFIX-141.1(사용자 지시 — "Silo Planet 이라는 페이지를 만들어서,
// 현재 About Silo 페이지에 뜨는 3d 우주를 옮기길 원해. About Silo
// 페이지는 예전처럼 갤러리 게시판과 '페이지 수정'이 뜨는 페이지로
// 만들어"): EPIC-113이 /about-silo에 만들었던 정적 라우트 오버라이드를
// 그대로 이 새 경로로 옮긴 것 — src/app/about-silo/page.tsx는 삭제해
// /about-silo가 다시 catch-all([...slug]/page.tsx)의 page_builder
// 렌더링(이미 hero/quote/board/gallery 모듈이 살아있던 기존 데이터)을
// 받도록 되돌렸다.
import { AboutSiloUniverse } from "@/components/about-silo/AboutSiloUniverse";

export default function SiloPlanetPage() {
  return <AboutSiloUniverse />;
}
