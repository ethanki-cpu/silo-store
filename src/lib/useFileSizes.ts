"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

// 홈페이지 설정에서 등록된 파일들의 용량(바이트)을 서버(/api/admin/media-size)로 조회한다.
// 같은 URL은 세션 동안 한 번만 조회하도록 모듈 단위로 캐시한다(null = 조회 실패/알 수 없음).
const cache = new Map<string, number | null>();
const inflight = new Set<string>();
const listeners = new Set<() => void>();

async function fetchSizes(urls: string[]) {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session) return;
  try {
    const res = await fetch("/api/admin/media-size", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${session.access_token}` },
      body: JSON.stringify({ urls }),
    });
    const json = res.ok ? ((await res.json()) as { sizes: Record<string, number | null> }) : null;
    for (const u of urls) cache.set(u, json?.sizes[u] ?? null);
  } catch {
    for (const u of urls) cache.set(u, null);
  } finally {
    for (const u of urls) inflight.delete(u);
    listeners.forEach((l) => l());
  }
}

export function formatBytes(bytes: number): string {
  if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(bytes >= 10 * 1024 * 1024 ? 1 : 2)}MB`;
  if (bytes >= 1024) return `${Math.round(bytes / 1024)}KB`;
  return `${bytes}B`;
}

/** urls의 용량 맵을 돌려준다(아직 모르면 undefined, 조회 실패는 null). */
export function useFileSizes(urls: string[]): Record<string, number | null | undefined> {
  const [, force] = useState(0);
  const key = [...new Set(urls.filter(Boolean))].sort().join("\n");

  useEffect(() => {
    const listener = () => force((n) => n + 1);
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  }, []);

  useEffect(() => {
    const need = key ? key.split("\n").filter((u) => !cache.has(u) && !inflight.has(u)) : [];
    if (need.length === 0) return;
    need.forEach((u) => inflight.add(u));
    for (let i = 0; i < need.length; i += 100) void fetchSizes(need.slice(i, i + 100));
  }, [key]);

  const out: Record<string, number | null | undefined> = {};
  for (const u of key ? key.split("\n") : []) out[u] = cache.get(u);
  return out;
}
