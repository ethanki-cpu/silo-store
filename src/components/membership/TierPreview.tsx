"use client";

import { useAuth } from "@/lib/AuthProvider";
import { OWNER_RANK, PREVIEW_RANKS, TIER_NAMES } from "@/lib/ownerPreview";

// EPIC-168(사용자 지시 — "Owner가 각 등급을 체험할 수 있는 기능"): Owner 전용. 다른 등급 회원의 눈으로 사이트를 써 볼 수 있다.
//  · OwnerPreviewPanel — 상단 '등급' 팝오버 안의 선택 패널(등급 버튼 6개 + Owner로 돌아가기).
//  · TierPreviewBanner — 체험 중일 때 화면 아래에 항상 떠 있는 안내 띠(등급 바꾸기·Owner로 돌아가기). 체험 중에는 관리자 화면·권한이 그 등급에 맞게 사라지므로,
//    언제든 돌아올 수 있는 이 띠가 유일한 탈출구다.
export function OwnerPreviewPanel({ onNavigate }: { onNavigate?: () => void }) {
  const { isOwner, previewRank, setPreviewRank } = useAuth();
  if (!isOwner) return null;
  return (
    <div className="mb-3 border-t border-gray-100 pt-3">
      <p className="mb-1 text-xs font-semibold text-gray-700">🎭 등급 체험 <span className="font-normal text-gray-400">(Owner 전용)</span></p>
      <p className="mb-2 text-[11px] leading-4 text-gray-500">고른 등급 회원처럼 화면과 권한이 바뀌어요(관리자 기능은 숨겨져요). 화면 아래 띠에서 언제든 Owner로 돌아올 수 있어요.</p>
      <div className="flex flex-wrap gap-1.5">
        {PREVIEW_RANKS.map((r) => (
          <button
            key={r}
            type="button"
            onClick={() => {
              onNavigate?.();
              setPreviewRank(r);
            }}
            className={`rounded-full border px-2.5 py-1 text-[11px] ${previewRank === r ? "border-amber-500 bg-amber-100 font-semibold text-amber-900" : "border-gray-300 bg-white text-gray-700 hover:bg-gray-50"}`}
          >
            {TIER_NAMES[r]}
          </button>
        ))}
        {previewRank != null && (
          <button type="button" onClick={() => setPreviewRank(null)} className="rounded-full border border-gray-900 bg-gray-900 px-2.5 py-1 text-[11px] font-semibold text-white">
            Owner로 돌아가기
          </button>
        )}
      </div>
    </div>
  );
}

export function TierPreviewBanner() {
  const { isOwner, previewRank, setPreviewRank } = useAuth();
  if (!isOwner || previewRank == null) return null;
  return (
    <div role="status" className="fixed bottom-3 left-1/2 z-[70] flex max-w-[94vw] -translate-x-1/2 flex-wrap items-center justify-center gap-x-3 gap-y-1.5 rounded-2xl border border-amber-400 bg-black/85 px-4 py-2 text-xs text-white shadow-2xl backdrop-blur">
      <span className="font-semibold">
        🎭 <b className="text-amber-300">{TIER_NAMES[previewRank]}</b> 등급으로 체험 중
      </span>
      <span className="flex flex-wrap items-center gap-1">
        {PREVIEW_RANKS.map((r) => (
          <button key={r} type="button" onClick={() => setPreviewRank(r)} disabled={r === previewRank} className={`rounded-full border px-2 py-0.5 text-[11px] ${r === previewRank ? "border-amber-300 bg-amber-300 font-semibold text-black" : "border-white/40 hover:bg-white/15"}`}>
            {TIER_NAMES[r]}
          </button>
        ))}
      </span>
      <button type="button" onClick={() => setPreviewRank(null)} className="rounded-full bg-white px-3 py-1 text-[11px] font-bold text-black hover:bg-amber-200">
        {TIER_NAMES[OWNER_RANK]}로 돌아가기
      </button>
    </div>
  );
}
