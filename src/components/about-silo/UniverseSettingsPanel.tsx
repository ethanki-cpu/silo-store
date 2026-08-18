"use client";

// EPIC-119/EPIC-121: [3D World Builder] — 관리자가 3D 모델(.glb)/텍스처/
// 유튜브 프리셋/궤도 데이터 소스를 직접 올리고 고를 수 있는 커스텀 설정
// 패널.
//
// HOTFIX-123(사용자 지시 — "공통적으로 이 universe의 전체 우주 세팅,
// 배경, 디자인, 설정은 거기서 설정할 수 있게 해줘"): 행성별 설정(이름/
// 색/텍스처/캐릭터/오브젝트/궤도 위성 소스+디자인)은 전부 새
// PlanetSettingsPanel(행성 클릭 시 뜨는 전용 창)로 옮기고, 이 패널은
// 행성에 속하지 않는 "전체 우주 공통" 설정만 남긴다 — 배경(유튜브/프리셋),
// 연결선 색, 공전 속도, 기본 카테고리 마커 모양, 저장/자동저장.
import { useState } from "react";
import { uploadFile } from "@/lib/storage";
import type { UniverseConfig, SpaceObject } from "@/lib/aboutSiloUniverseConfig";

const ROW = "flex items-center gap-1.5";
const INPUT = "min-w-0 flex-1 rounded border border-white/15 bg-black/30 px-1.5 py-1 text-[11px] text-white placeholder:text-white/30";
const SELECT = `${INPUT}`;
const BTN = "shrink-0 rounded border border-white/20 bg-white/10 px-2 py-1 text-[10px] text-white hover:bg-white/20 disabled:opacity-40";
const SECTION_TITLE = "mb-1 text-[10px] font-semibold uppercase tracking-wide text-white/50";
const FIELD_LABEL = "block text-[10px] text-white/60";

export function UniverseSettingsPanel({
  config,
  onChange,
  onSave,
  saving,
  savedAt,
  failedSpaceObjectIds,
  onSelectSpaceObjectId,
}: {
  config: UniverseConfig;
  onChange: (patch: Partial<UniverseConfig>) => void;
  onSave: () => void;
  saving: boolean;
  savedAt: number | null;
  // HOTFIX(사용자 지시 — "universe setting에서 오브제를 업로드할 수
  // 있는 게 없네... 별, 은하수, 별똥별, asteroid 등등"): 어느 행성에도
  // 속하지 않는 우주 공간 오브젝트 — 로드 실패 표시 + 3D 뷰 선택 연동.
  failedSpaceObjectIds: Set<string>;
  onSelectSpaceObjectId: (id: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [uploadingSpaceField, setUploadingSpaceField] = useState<"model" | "sprite" | null>(null);

  function addSpaceObject(kind: SpaceObject["kind"], url: string) {
    const obj: SpaceObject = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      url,
      kind,
      scale: 0.3,
      label: `우주 오브젝트 ${config.spaceObjects.length + 1}`,
      position: null,
      thumbnailUrl: "",
      summary: "",
      link: "",
    };
    onChange({ spaceObjects: [...config.spaceObjects, obj] });
  }
  function removeSpaceObject(id: string) {
    onChange({ spaceObjects: config.spaceObjects.filter((o) => o.id !== id) });
  }
  async function handleSpaceUpload(kind: SpaceObject["kind"], file: File | null) {
    if (!file) return;
    setUploadingSpaceField(kind);
    const bucket = kind === "sprite" ? "gallery" : "attachments";
    const { url, error } = await uploadFile(file, bucket, "about-silo-universe-space");
    setUploadingSpaceField(null);
    if (!error && url) addSpaceObject(kind, url);
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

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="pointer-events-auto fixed bottom-6 left-6 z-40 rounded-full border border-white/20 bg-black/50 px-4 py-2 text-xs text-white backdrop-blur-sm hover:bg-black/70"
      >
        🌌 Universe Settings
      </button>
    );
  }

  return (
    <div className="pointer-events-auto fixed bottom-6 left-6 z-40 max-h-[85vh] w-[320px] overflow-y-auto rounded-xl border border-white/15 bg-black/70 p-3 text-white shadow-2xl backdrop-blur-md">
      <div className="mb-2 flex items-center justify-between">
        <p className="text-xs font-semibold">🌌 Universe Settings(전체 공통)</p>
        <button type="button" onClick={() => setOpen(false)} className="text-white/50 hover:text-white">
          ✕
        </button>
      </div>
      <p className="mb-2 text-[10px] text-white/40">
        행성별 이름/색/텍스처/캐릭터/오브젝트는 3D 화면에서 그 행성을 직접 클릭하면 뜨는 전용 창에서 설정하세요.
      </p>

      <div className="space-y-3">
        <section>
          <p className={SECTION_TITLE}>배경</p>
          <div className="space-y-1.5">
            <label className={FIELD_LABEL}>
              모드
              <select
                className={`mt-1 ${SELECT}`}
                value={config.backgroundMode}
                onChange={(e) => onChange({ backgroundMode: e.target.value as UniverseConfig["backgroundMode"] })}
              >
                <option value="youtube">유튜브</option>
                <option value="preset">프리셋</option>
              </select>
            </label>
            {config.backgroundMode === "preset" && (
              <label className={FIELD_LABEL}>
                프리셋
                <select
                  className={`mt-1 ${SELECT}`}
                  value={config.preset}
                  onChange={(e) => onChange({ preset: e.target.value as UniverseConfig["preset"] })}
                >
                  <option value="cream">크림 백지</option>
                  <option value="deepBlue">딥 블루</option>
                  <option value="watercolor">수채화 블루</option>
                </select>
              </label>
            )}
          </div>
          {config.backgroundMode === "youtube" && (
            <div className="mt-2 space-y-1">
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
              <button type="button" className={`${BTN} w-full`} onClick={addYoutubeUrl}>
                + URL 추가
              </button>
            </div>
          )}
        </section>

        <section>
          <p className={SECTION_TITLE}>공전 속도(모든 행성 공통)</p>
          <input
            type="range"
            min={0}
            max={1}
            step={0.05}
            className="mt-1 w-full"
            value={config.orbitSpeed}
            onChange={(e) => onChange({ orbitSpeed: Number(e.target.value) })}
          />
          <span className="text-white/40">{config.orbitSpeed.toFixed(2)}</span>
        </section>

        <section>
          <p className={SECTION_TITLE}>기본 카테고리 마커 모양</p>
          <div className="space-y-1.5">
            <label className={FIELD_LABEL}>
              보물상자 종류(사일로 상점)
              <select
                className={`mt-1 ${SELECT}`}
                value={config.chestVariant}
                onChange={(e) => onChange({ chestVariant: e.target.value as UniverseConfig["chestVariant"] })}
              >
                <option value="classic">클래식 브라운</option>
                <option value="gold">골드 트림</option>
                <option value="dark">다크 오크</option>
              </select>
            </label>
            <label className={FIELD_LABEL}>
              카메라 종류(스튜디오)
              <select
                className={`mt-1 ${SELECT}`}
                value={config.cameraVariant}
                onChange={(e) => onChange({ cameraVariant: e.target.value as UniverseConfig["cameraVariant"] })}
              >
                <option value="vintage">빈티지 브라운</option>
                <option value="black">블랙 필름</option>
                <option value="polaroid">폴라로이드형</option>
              </select>
            </label>
          </div>
        </section>

        <section>
          <p className={SECTION_TITLE}>연결선</p>
          <div className="flex items-center gap-1.5">
            <input
              type="color"
              className="h-7 w-9 shrink-0 rounded border border-white/15 bg-transparent"
              value={config.lineColor}
              onChange={(e) => onChange({ lineColor: e.target.value })}
            />
            <input className={INPUT} value={config.lineColor} onChange={(e) => onChange({ lineColor: e.target.value })} />
          </div>
        </section>

        {/* HOTFIX(사용자 지시 — "universe setting에서 오브제를 업로드할
            수 있는 게 없네, 예를 들어 별, 은하수, 별똥별, asteroid
            등등 우주에 있는 것들 말이야"): 어느 행성에도 속하지 않고
            두 행성 사이 우주 공간에 자유롭게 떠 있는 오브젝트 — 3D 모델
            (소행성 등)이나 이미지(별/은하수/별똥별 등 카메라를 향하는
            빌보드) 중 골라 업로드한다. */}
        <section>
          <p className={SECTION_TITLE}>우주 공간 오브젝트({config.spaceObjects.length}개)</p>
          <p className="mb-1 text-[10px] text-white/40">
            별/은하수/별똥별/소행성 등 — 어느 행성에도 속하지 않고 두 행성 사이 우주에 자유롭게 떠 있어요. 3D 화면에서
            클릭하면 선택되고, 파란 화살표로 드래그해 어디로든 옮길 수 있어요(표면 고정 없음).
          </p>
          <div className="space-y-1">
            {config.spaceObjects.map((obj) => (
              <div key={obj.id}>
                <div className={ROW}>
                  <button
                    type="button"
                    className="flex-1 truncate rounded border border-white/15 bg-black/20 px-1.5 py-1 text-left text-[11px] text-white hover:bg-white/10"
                    onClick={() => onSelectSpaceObjectId(obj.id)}
                  >
                    {obj.kind === "sprite" ? "✨" : "🪨"} {obj.label}
                  </button>
                  <button type="button" className={BTN} onClick={() => removeSpaceObject(obj.id)}>
                    삭제
                  </button>
                </div>
                {failedSpaceObjectIds.has(obj.id) && (
                  <p className="mt-0.5 text-[10px] text-red-300">⚠ 로드 실패 — URL이 올바른 공개 링크인지 확인하세요.</p>
                )}
              </div>
            ))}
          </div>
          <div className="mt-1 grid grid-cols-2 gap-1.5">
            <label className={`${BTN} block cursor-pointer text-center`}>
              {uploadingSpaceField === "model" ? "업로드 중..." : "🪨 소행성(.glb) 추가"}
              <input
                type="file"
                accept=".glb,.gltf"
                className="hidden"
                disabled={uploadingSpaceField !== null}
                onChange={(e) => handleSpaceUpload("model", e.target.files?.[0] ?? null)}
              />
            </label>
            <label className={`${BTN} block cursor-pointer text-center`}>
              {uploadingSpaceField === "sprite" ? "업로드 중..." : "✨ 별/은하수 이미지 추가"}
              <input
                type="file"
                accept="image/*"
                className="hidden"
                disabled={uploadingSpaceField !== null}
                onChange={(e) => handleSpaceUpload("sprite", e.target.files?.[0] ?? null)}
              />
            </label>
          </div>
        </section>

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
