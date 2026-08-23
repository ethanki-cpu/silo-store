"use client";

import { useState } from "react";
import { useAuth } from "@/lib/AuthProvider";
import { supabase } from "@/lib/supabaseClient";

const primaryButtonClass = "rounded-md bg-gray-800 text-white px-4 py-2 text-sm disabled:opacity-50";

// EPIC-143: Instagram Graph API 동기화를 실제로 트리거하는 유일한 화면 —
// /api/instagram/fetch는 관리자만 호출할 수 있고, 한 번에 한 페이지(12개)만
// 처리해 서버리스 타임아웃을 피한다(route.ts 주석 참고) — 이 페이지가
// nextCursor가 없어질 때까지 자동으로 반복 호출해 "전체 동기화" 버튼
// 하나로 보이게 만든다.
type SyncResult = { synced: number; skipped: number; errors: string[]; fetched: number; nextCursor: string | null; hasMore: boolean };

const MAX_PAGES_PER_RUN = 20; // 안전장치 — 12*20=240개 정도면 한 번에 충분.

export default function AdminInstagramSyncPage() {
  const { session } = useAuth();
  const [running, setRunning] = useState(false);
  const [totalSynced, setTotalSynced] = useState(0);
  const [totalSkipped, setTotalSkipped] = useState(0);
  const [errors, setErrors] = useState<string[]>([]);
  const [statusText, setStatusText] = useState<string | null>(null);
  const [feedCount, setFeedCount] = useState<number | null>(null);

  async function loadFeedCount() {
    const { count } = await supabase.from("instagram_feeds").select("id", { count: "exact", head: true });
    setFeedCount(count ?? 0);
  }

  async function runSync() {
    if (!session) {
      setStatusText("로그인이 필요해요.");
      return;
    }
    setRunning(true);
    setErrors([]);
    setTotalSynced(0);
    setTotalSkipped(0);
    setStatusText("동기화를 시작해요...");

    let cursor: string | undefined;
    let page = 0;
    try {
      while (page < MAX_PAGES_PER_RUN) {
        page += 1;
        setStatusText(`${page}번째 페이지 처리 중...`);
        const res = await fetch("/api/instagram/fetch", {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${session.access_token}` },
          body: JSON.stringify(cursor ? { after: cursor } : {}),
        });
        const data: SyncResult & { error?: string } = await res.json();
        if (!res.ok) {
          setErrors((prev) => [...prev, data.error ?? "알 수 없는 오류"]);
          break;
        }
        setTotalSynced((prev) => prev + data.synced);
        setTotalSkipped((prev) => prev + data.skipped);
        if (data.errors.length > 0) setErrors((prev) => [...prev, ...data.errors]);

        // 이번 페이지가 전부 이미 동기화된 것들이었고(skipped만 있고 synced
        // 없음) 다음 페이지도 없으면 더 갈 이유가 없다 — 최신순이라 첫
        // "완전히 겹치는" 페이지를 만나면 그 뒤도 전부 이미 있는 것들이므로
        // 여기서 멈춰도 안전(최초 동기화 이후의 "증분 동기화" 최적화).
        if (data.synced === 0 && !data.hasMore) break;
        if (data.synced === 0 && data.skipped === data.fetched && page > 1) break;

        if (!data.hasMore || !data.nextCursor) break;
        cursor = data.nextCursor;
      }
      setStatusText("동기화 완료");
    } catch (e) {
      setErrors((prev) => [...prev, e instanceof Error ? e.message : "알 수 없는 오류"]);
      setStatusText("동기화 중 오류가 발생했어요");
    } finally {
      setRunning(false);
      loadFeedCount();
    }
  }

  return (
    <main className="flex-1 px-8 pb-8 max-w-2xl mx-auto w-full">
      <h1 className="mb-1 mt-6 text-2xl font-bold">Instagram 동기화</h1>
      <p className="mb-6 text-xs text-gray-400">
        Instagram Graph API(_silo_store)로 게시물을 읽어와 Cloudflare R2에 저장하고 DB에 캐싱해요. Instagram
        원본 UI(iframe/embed)는 전혀 쓰지 않아요 — 프론트엔드는 R2 사본만 읽어요.
      </p>

      <button type="button" onClick={runSync} disabled={running} className={primaryButtonClass}>
        {running ? "동기화 중..." : "최근 게시물 동기화"}
      </button>
      <button
        type="button"
        onClick={loadFeedCount}
        className="ml-2 rounded-md border border-gray-300 px-4 py-2 text-sm text-gray-600 hover:bg-gray-50"
      >
        저장된 게시물 수 확인
      </button>

      {statusText && <p className="mt-4 text-sm text-gray-600">{statusText}</p>}
      {(totalSynced > 0 || totalSkipped > 0) && (
        <p className="mt-1 text-sm text-gray-600">
          새로 저장 {totalSynced}개 · 이미 있어서 건너뜀 {totalSkipped}개
        </p>
      )}
      {feedCount !== null && <p className="mt-1 text-sm text-gray-600">DB에 저장된 총 게시물: {feedCount}개</p>}

      {errors.length > 0 && (
        <div className="mt-4 rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-700">
          <p className="mb-1 font-semibold">일부 게시물을 처리하지 못했어요:</p>
          <ul className="list-disc space-y-0.5 pl-4">
            {errors.slice(0, 20).map((e, i) => (
              <li key={i}>{e}</li>
            ))}
          </ul>
        </div>
      )}
    </main>
  );
}
