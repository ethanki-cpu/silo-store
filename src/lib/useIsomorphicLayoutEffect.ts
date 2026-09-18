"use client";

// HOTFIX-156.13: `useLayoutEffect`는 SSR(서버에는 window가 없음)에서 호출되면
// 콘솔 경고를 낸다 — 그렇다고 무조건 `useEffect`만 쓰면, 뷰포트 폭처럼
// "클라이언트에서만 알 수 있는 값"을 measure하는 훅들이 브라우저의 "첫 페인트
// 이후"에야 값을 갱신해, 그 첫 프레임 한 번은 항상 틀린(SSR 기본값 그대로인)
// 상태로 그려진다(데스크톱에서는 안 보일 만큼 짧지만 느린 실기기에서는 눈에
// 띌 수 있다 — 실제로 HOTFIX-156.12/156.13에서 헤더 오버플로우 재신고의
// 원인 중 하나였다). 클라이언트에서는 `useLayoutEffect`(페인트 전 동기 실행)를,
// 서버에서는 안전하게 `useEffect`로 폴백하는 표준 isomorphic layout effect
// 패턴 — `useReferenceWidth`/`useDeviceTier` 등 뷰포트 의존 훅들이 공유한다.
import { useEffect, useLayoutEffect } from "react";

export const useIsomorphicLayoutEffect = typeof window !== "undefined" ? useLayoutEffect : useEffect;
