"use client";

// EPIC-161 Phase 3: 선택된 회원 행성의 2D 오버레이 패널 — 기존
// PlanetSettingsPanel/ObjectInspectorPanel과 같은 자리(Canvas 바깥, absolute
// overlay)에 뜨는 독립 패널. 좋아요(Great Gatsby+)/자기 행성 glb 업로드
// (Patron+)를 담당한다.

import { useState } from "react";
import type { MemberPlanet } from "./MemberPlanetMarkers";

export function MemberPlanetPanel({
  planet,
  canLike,
  canUploadOwn,
  onClose,
  onToggleLike,
  onUploadGlb,
}: {
  planet: MemberPlanet;
  canLike: boolean;
  canUploadOwn: boolean;
  onClose: () => void;
  onToggleLike: () => void;
  onUploadGlb: (glbUrl: string) => Promise<void>;
}) {
  const [glbUrlInput, setGlbUrlInput] = useState(planet.glb_url ?? "");
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  async function handleSave() {
    if (!glbUrlInput.trim()) return;
    setSaving(true);
    setSaveError(null);
    try {
      await onUploadGlb(glbUrlInput.trim());
    } catch (e) {
      setSaveError(e instanceof Error ? e.message : "저장에 실패했어요.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="pointer-events-auto absolute bottom-6 left-6 z-40 w-72 rounded-xl border border-white/20 bg-black/70 p-4 text-white backdrop-blur-md">
      <div className="flex items-start justify-between">
        <p className="text-sm font-medium">
          {planet.member_name}
          {planet.is_mine && <span className="ml-1 text-xs text-amber-300">(내 행성)</span>}
        </p>
        <button type="button" onClick={onClose} className="text-white/50 hover:text-white">
          ✕
        </button>
      </div>

      <div className="mt-3 flex items-center gap-2 text-xs text-white/70">
        {canLike ? (
          <button
            type="button"
            onClick={onToggleLike}
            className={`rounded-full border px-3 py-1 ${
              planet.liked_by_me ? "border-red-300 bg-red-500/20 text-red-200" : "border-white/20 text-white/80"
            }`}
          >
            {planet.liked_by_me ? "♥ 좋아요 취소" : "♡ 좋아요"} {planet.like_count > 0 ? planet.like_count : ""}
          </button>
        ) : (
          <span>좋아요 {planet.like_count}개 — Great Gatsby 등급부터 누를 수 있어요.</span>
        )}
      </div>

      {planet.is_mine && (
        <div className="mt-3 border-t border-white/10 pt-3">
          {canUploadOwn ? (
            <div className="space-y-2">
              <p className="text-xs text-white/70">내 행성에 놓을 .glb 파일 URL(Patron 등급 혜택)</p>
              <input
                value={glbUrlInput}
                onChange={(e) => setGlbUrlInput(e.target.value)}
                placeholder="https://.../my-model.glb"
                className="w-full rounded border border-white/20 bg-white/10 px-2 py-1 text-xs text-white placeholder:text-white/40"
              />
              <button
                type="button"
                onClick={handleSave}
                disabled={saving || !glbUrlInput.trim()}
                className="rounded bg-amber-400 px-3 py-1 text-xs font-medium text-black disabled:opacity-40"
              >
                {saving ? "저장 중..." : "저장"}
              </button>
              {saveError && <p className="text-xs text-red-300">{saveError}</p>}
            </div>
          ) : (
            <p className="text-xs text-white/60">내 행성에 나만의 .glb 오브젝트를 놓는 건 Patron 등급부터 가능해요.</p>
          )}
        </div>
      )}
    </div>
  );
}
