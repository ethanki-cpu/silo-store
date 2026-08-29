"use client";

// 사용자 신고(2026-08-30, 실제 모바일 크롬 스크린샷 — "실제 크롬 모바일
// 화면은 '홈페이지 설정'의 '모바일' 프리뷰와 달라"): 실제 사이트 헤더
// (nav 탭/로고 전부)가 모바일 폭에서 통째로 사라지는 심각한 버그. 원인
// 추적 결과 — layout.tsx의 `<Suspense fallback={null}><Navbar /></Suspense>`
// (useSearchParams() 때문에 필요, Navbar.tsx 참고)가 Error Boundary 없이
// 단독으로 쓰이면, Navbar 렌더 중 스트리밍 단계에서 뭔가 실패했을 때
// React가 그 Suspense 구간의 완료 신호(`$RC` 스왑 스크립트)를 영영 못
// 내보내는 상태에 빠진다 — 서버는 `<div hidden id="S:0">` 안에 실제
// 헤더 HTML을 이미 스트리밍해뒀지만, 그걸 보이게 바꿔주는 스크립트가
// 응답에 끝까지 안 나타나 헤더가 영구히 숨김 상태로 남는다(에러 자체는
// 콘솔에 안 찍힘 — 조용히 멈춰버림). 이 현상은 오늘 세션 이전 커밋
// (HOTFIX-151.6, 99579a1)에서도 그대로 재현돼 이번 세션에서 새로 생긴
// 버그가 아니라 이미 있던 문제로 확인했다. 로컬에서 여러 번 교차 검증한
// 결과 — 이 Suspense를 Error Boundary로 감싸는 것만으로 매번(4/4) 확실하게
// 해결됨(정확한 근본 원인은 React/Next.js 스트리밍 내부 동작이라 완전히
// 특정하지 못했지만, Suspense+Error Boundary 짝짓기는 React 공식 권장
// 패턴이기도 하다). 실제로 에러가 발생하면(향후 다른 원인으로) 최소한
// 사이트를 완전히 못 쓰게 만들지 않도록 홈 링크만이라도 보여준다.
import React from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";

// HOTFIX-152.4: 이 Error Boundary가 실제로 뭔가를 잡는 순간이 온다면(지금까지
// 관찰된 원래 버그는 componentDidCatch가 한 번도 안 불렸을 가능성이 높다 —
// 콘솔에 에러가 안 찍혔다는 사용자 신고와 일치) client_error_logs에 남겨
// src/instrumentation.ts의 서버측 onRequestError와 짝을 이루는 클라이언트측
// 증거를 확보한다.
function reportClientError(error: unknown, componentStack: string | null | undefined) {
  const message = error instanceof Error ? error.message : String(error);
  supabase
    .from("client_error_logs")
    .insert({
      source: "client-boundary",
      message,
      path: typeof window !== "undefined" ? window.location.pathname : null,
      user_agent: typeof navigator !== "undefined" ? navigator.userAgent : null,
      extra: { componentStack: componentStack ?? null },
    })
    .then(() => {}, () => {});
}

export class NavbarBoundary extends React.Component<{ children: React.ReactNode }, { hasError: boolean }> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }
  static getDerivedStateFromError() {
    return { hasError: true };
  }
  componentDidCatch(error: unknown, errorInfo: React.ErrorInfo) {
    // eslint-disable-next-line no-console
    console.error("NavbarBoundary caught an error while rendering the header:", error);
    reportClientError(error, errorInfo.componentStack);
  }
  render() {
    if (this.state.hasError) {
      return (
        <div className="border-b border-gray-200 bg-white p-3 text-center">
          <Link href="/" className="text-sm font-semibold text-gray-800">
            사일로 스토어
          </Link>
        </div>
      );
    }
    return this.props.children;
  }
}
