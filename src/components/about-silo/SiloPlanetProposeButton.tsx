"use client";

// EPIC-161 Phase 3: Lautrec 전용 — 실로플래닛에 행성/별/모션 추가 제안.
// board_proposals를 board_id=null(kind='planet')로 재사용하는 /api/silo-planet/propose로 제출.

import { useState } from "react";

export function SiloPlanetProposeButton({ accessToken }: { accessToken: string }) {
  const [open, setOpen] = useState(false);
  const [body, setBody] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit() {
    if (!body.trim()) return;
    setSubmitting(true);
    setError(null);
    const res = await fetch("/api/silo-planet/propose", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${accessToken}` },
      body: JSON.stringify({ body }),
    });
    setSubmitting(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "제안 제출에 실패했어요.");
      return;
    }
    setBody("");
    setOpen(false);
    setDone(true);
  }

  if (done) {
    return (
      <div className="pointer-events-auto absolute bottom-6 right-6 z-40 rounded-full border border-white/20 bg-black/60 px-4 py-2 text-xs text-white backdrop-blur-sm">
        제안을 보냈어요. 검토 후 반영돼요.
      </div>
    );
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="pointer-events-auto absolute bottom-6 right-6 z-40 rounded-full border border-amber-300/40 bg-black/60 px-4 py-2 text-xs text-amber-200 backdrop-blur-sm hover:bg-black/80"
      >
        ✨ 우주에 추가 제안하기
      </button>
    );
  }

  return (
    <div className="pointer-events-auto absolute bottom-6 right-6 z-40 w-72 rounded-xl border border-amber-300/30 bg-black/75 p-4 text-white backdrop-blur-md">
      <p className="mb-2 text-sm font-medium text-amber-200">우주에 행성·별·모션 추가 제안</p>
      <textarea
        value={body}
        onChange={(e) => setBody(e.target.value)}
        placeholder="어떤 걸 추가하고 싶은지 적어주세요"
        rows={3}
        className="w-full rounded border border-white/20 bg-white/10 px-2 py-1 text-xs text-white placeholder:text-white/40"
      />
      {error && <p className="mt-1 text-xs text-red-300">{error}</p>}
      <div className="mt-2 flex gap-2">
        <button
          type="button"
          onClick={handleSubmit}
          disabled={submitting || !body.trim()}
          className="rounded bg-amber-400 px-3 py-1 text-xs font-medium text-black disabled:opacity-40"
        >
          {submitting ? "보내는 중..." : "제안 보내기"}
        </button>
        <button type="button" onClick={() => setOpen(false)} className="rounded border border-white/20 px-3 py-1 text-xs text-white/80">
          취소
        </button>
      </div>
    </div>
  );
}
