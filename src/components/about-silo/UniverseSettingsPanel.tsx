"use client";

// EPIC-119: [3D World Builder] — 관리자가 3D 모델(.glb)/텍스처/유튜브
// 프리셋/궤도 데이터 소스를 직접 올리고 고를 수 있는 커스텀 설정 패널.
// Leva(우측 상단, AboutSiloUniverse.tsx)는 색상/토글/슬라이더처럼 단순한
// 값만 계속 맡고, 파일 업로드·배열 편집·드롭다운처럼 Leva 기본 컨트롤로
// 표현하기 애매한 것들은 전부 이 패널(좌측 하단, 접이식)이 담당한다.
import { useEffect, useState } from "react";
import { uploadFile } from "@/lib/storage";
import type { UniverseConfig, UniverseObject } from "@/lib/aboutSiloUniverseConfig";

type BoardOption = { slug: string; name: string };

const ROW = "flex items-center gap-1.5";
const INPUT = "min-w-0 flex-1 rounded border border-white/15 bg-black/30 px-1.5 py-1 text-[11px] text-white placeholder:text-white/30";
const BTN = "shrink-0 rounded border border-white/20 bg-white/10 px-2 py-1 text-[10px] text-white hover:bg-white/20 disabled:opacity-40";

export function UniverseSettingsPanel({
  config,
  onChange,
  availableClips,
  onSave,
  saving,
  savedAt,
  failedObjectIds,
}: {
  config: UniverseConfig;
  onChange: (patch: Partial<UniverseConfig>) => void;
  availableClips: string[];
  onSave: () => void;
  saving: boolean;
  savedAt: number | null;
  // EPIC-119 버그 수정(사용자 신고): .glb 로드가 실패해도 조용히 아무것도
  // 안 보여서 원인을 알 수 없었다 — 실패한 오브젝트 id 목록을 받아 해당
  // 행에 "⚠ 로드 실패"를 표시한다.
  failedObjectIds: Set<string>;
}) {
  const [open, setOpen] = useState(false);
  const [boards, setBoards] = useState<BoardOption[]>([]);
  const [uploadingField, setUploadingField] = useState<string | null>(null);

  useEffect(() => {
    if (!open || boards.length > 0) return;
    fetch("/api/boards")
      .then((res) => (res.ok ? res.json() : []))
      .then((data) => {
        if (Array.isArray(data)) {
          setBoards(data.map((b: { slug: string; name: string }) => ({ slug: b.slug, name: b.name })));
        }
      })
      .catch(() => {});
  }, [open, boards.length]);

  async function handleUpload(field: string, file: File | null, bucket: "attachments" | "gallery", apply: (url: string) => void) {
    if (!file) return;
    setUploadingField(field);
    const { url, error } = await uploadFile(file, bucket, "about-silo-universe");
    setUploadingField(null);
    if (!error && url) apply(url);
  }

  function updateYoutubeUrl(index: number, value: string) {
    const next = [...config.youtubeUrls];
    next[index] = value;
    onChange({ youtubeUrls: next });
  }
  function removeYoutubeUrl(index: number) {
    onChange({ youtubeUrls: config.youtubeUrls.filter((_, i) => i !== index) });
  }
  function addYoutubeUrl() {
    onChange({ youtubeUrls: [...config.youtubeUrls, ""] });
  }

  function addObject(url: string) {
    const obj: UniverseObject = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      url,
      scale: 0.3,
      label: `오브젝트 ${config.objects.length + 1}`,
    };
    onChange({ objects: [...config.objects, obj] });
  }
  function updateObject(id: string, patch: Partial<UniverseObject>) {
    onChange({ objects: config.objects.map((o) => (o.id === id ? { ...o, ...patch } : o)) });
  }
  function removeObject(id: string) {
    onChange({ objects: config.objects.filter((o) => o.id !== id) });
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="pointer-events-auto fixed bottom-6 left-6 z-40 rounded-full border border-white/20 bg-black/50 px-4 py-2 text-xs text-white backdrop-blur-sm hover:bg-black/70"
      >
        🛠 Universe Settings
      </button>
    );
  }

  return (
    <div className="pointer-events-auto fixed bottom-6 left-6 z-40 max-h-[80vh] w-[320px] overflow-y-auto rounded-xl border border-white/15 bg-black/70 p-3 text-white shadow-2xl backdrop-blur-md">
      <div className="mb-2 flex items-center justify-between">
        <p className="text-xs font-semibold">🛠 Universe Settings</p>
        <button type="button" onClick={() => setOpen(false)} className="text-white/50 hover:text-white">
          ✕
        </button>
      </div>

      <div className="space-y-3">
        {/* 유튜브 프리셋 배열 편집(Item 8). */}
        <section>
          <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-white/50">배경 — 유튜브 프리셋</p>
          <div className="space-y-1">
            {config.youtubeUrls.map((url, i) => (
              <div key={i} className={ROW}>
                <input
                  className={INPUT}
                  value={url}
                  placeholder="https://www.youtube.com/watch?v=..."
                  onChange={(e) => updateYoutubeUrl(i, e.target.value)}
                />
                <button type="button" className={BTN} onClick={() => removeYoutubeUrl(i)}>
                  삭제
                </button>
              </div>
            ))}
          </div>
          <button type="button" className={`${BTN} mt-1 w-full`} onClick={addYoutubeUrl}>
            + URL 추가
          </button>
        </section>

        {/* 행성 텍스처 업로드(Item 8). */}
        <section>
          <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-white/50">행성 — 지형 텍스처</p>
          <div className={ROW}>
            <input
              className={INPUT}
              value={config.planetTextureUrl}
              placeholder="이미지 업로드 또는 URL"
              onChange={(e) => onChange({ planetTextureUrl: e.target.value })}
            />
            {config.planetTextureUrl && (
              <button type="button" className={BTN} onClick={() => onChange({ planetTextureUrl: "" })}>
                초기화
              </button>
            )}
          </div>
          <label className={`${BTN} mt-1 block w-full cursor-pointer text-center`}>
            {uploadingField === "planetTexture" ? "업로드 중..." : "파일 선택(화산/바다/대륙 등)"}
            <input
              type="file"
              accept="image/*"
              className="hidden"
              disabled={uploadingField === "planetTexture"}
              onChange={(e) => handleUpload("planetTexture", e.target.files?.[0] ?? null, "gallery", (url) => onChange({ planetTextureUrl: url }))}
            />
          </label>
        </section>

        {/* 궤도 데이터 소스(Item 2). */}
        <section>
          <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-white/50">궤도 — 썸네일 소스 게시판</p>
          <select
            className={INPUT}
            value={config.boardSlug}
            onChange={(e) => onChange({ boardSlug: e.target.value })}
          >
            <option value="">전체(추천/인기/최신 통합)</option>
            {boards.map((b) => (
              <option key={b.slug} value={b.slug}>
                {b.name}
              </option>
            ))}
          </select>
        </section>

        {/* 캐릭터 GLB 업로드 + 애니메이션 액션(Item 1/4). */}
        <section>
          <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-white/50">캐릭터 — 3D 모델(.glb)</p>
          <div className={ROW}>
            <input
              className={INPUT}
              value={config.characterModelUrl}
              placeholder="업로드하면 절차적 실루엣을 대체"
              onChange={(e) => onChange({ characterModelUrl: e.target.value })}
            />
            {config.characterModelUrl && (
              <button type="button" className={BTN} onClick={() => onChange({ characterModelUrl: "", characterAnimationClip: "" })}>
                초기화
              </button>
            )}
          </div>
          <label className={`${BTN} mt-1 block w-full cursor-pointer text-center`}>
            {uploadingField === "characterModel" ? "업로드 중..." : "어린 왕자 등 .glb 파일 선택"}
            <input
              type="file"
              accept=".glb,.gltf"
              className="hidden"
              disabled={uploadingField === "characterModel"}
              onChange={(e) => handleUpload("characterModel", e.target.files?.[0] ?? null, "attachments", (url) => onChange({ characterModelUrl: url }))}
            />
          </label>
          {config.characterModelUrl && (
            <div className="mt-1.5">
              <p className="mb-1 text-[10px] text-white/50">
                액션{availableClips.length === 0 ? " (모델에 클립이 없거나 아직 로딩 중)" : ` (${availableClips.length}개)`}
              </p>
              <div className="flex flex-wrap gap-1">
                {availableClips.map((clip) => (
                  <button
                    key={clip}
                    type="button"
                    onClick={() => onChange({ characterAnimationClip: clip })}
                    className={`rounded border px-2 py-0.5 text-[10px] ${
                      config.characterAnimationClip === clip
                        ? "border-amber-300 bg-amber-300/20 text-amber-100"
                        : "border-white/20 bg-white/5 text-white/70 hover:bg-white/15"
                    }`}
                  >
                    {clip}
                  </button>
                ))}
              </div>
            </div>
          )}
        </section>

        {/* 장식 오브젝트 업로더(Item 3/4) — 나무/꽃 등, SILO 행성 표면에 자동 배치. */}
        <section>
          <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-white/50">
            오브젝트({config.objects.length}개) — 나무/꽃 등
          </p>
          <div className="space-y-1">
            {config.objects.map((obj) => (
              <div key={obj.id}>
                <div className={ROW}>
                  <input
                    className={INPUT}
                    value={obj.label}
                    onChange={(e) => updateObject(obj.id, { label: e.target.value })}
                  />
                  <input
                    type="number"
                    min={0.05}
                    max={2}
                    step={0.05}
                    className={`${INPUT} w-14 flex-none`}
                    value={obj.scale}
                    onChange={(e) => updateObject(obj.id, { scale: Number(e.target.value) || 0.3 })}
                  />
                  <button type="button" className={BTN} onClick={() => removeObject(obj.id)}>
                    삭제
                  </button>
                </div>
                {failedObjectIds.has(obj.id) && (
                  <p className="mt-0.5 text-[10px] text-red-300">
                    ⚠ 로드 실패 — URL이 올바른 .glb 공개 링크인지 확인하세요.
                  </p>
                )}
              </div>
            ))}
          </div>
          <label className={`${BTN} mt-1 block w-full cursor-pointer text-center`}>
            {uploadingField === "object" ? "업로드 중..." : "+ .glb 오브젝트 추가"}
            <input
              type="file"
              accept=".glb,.gltf"
              className="hidden"
              disabled={uploadingField === "object"}
              onChange={(e) => handleUpload("object", e.target.files?.[0] ?? null, "attachments", addObject)}
            />
          </label>
        </section>

        {/* 저장(Item 7). */}
        <section className="border-t border-white/10 pt-2">
          <label className="mb-1.5 flex items-center gap-2 text-[10px] text-white/70">
            <input
              type="checkbox"
              checked={config.autoSaveEnabled}
              onChange={(e) => onChange({ autoSaveEnabled: e.target.checked })}
            />
            5분마다 자동 저장
          </label>
          <button type="button" onClick={onSave} disabled={saving} className={`${BTN} w-full py-1.5`}>
            {saving ? "저장 중..." : "지금 저장"}
          </button>
          {savedAt && (
            <p className="mt-1 text-center text-[10px] text-white/40">
              마지막 저장: {new Date(savedAt).toLocaleTimeString("ko-KR")}
            </p>
          )}
        </section>
      </div>
    </div>
  );
}
