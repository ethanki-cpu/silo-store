"use client";

import { useSyncExternalStore } from "react";

// EPIC-163: /membership의 캐러셀에서 활성화된 등급(rank)을 같은 페이지의 다른 위젯(권한 표 열 글로우 등)과 실시간으로 공유한다.
let activeRank = 0;
const listeners = new Set<() => void>();

export function setActiveMembershipRank(rank: number) {
  if (rank === activeRank) return;
  activeRank = rank;
  listeners.forEach((l) => l());
}

export function useActiveMembershipRank(): number {
  return useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    () => activeRank,
    () => 0,
  );
}
