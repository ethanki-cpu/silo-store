"use client";

// EPIC-119/EPIC-121: [3D World Builder] — 관리자가 3D 모델(.glb)/텍스처/
// 유튜브 프리셋/궤도 데이터 소스를 직접 올리고 고를 수 있는 커스텀 설정
// 패널. EPIC-121(사용자 지시 — "Universe Setting에 merge해줘")부터는
// 예전에 별도 Leva 패널(우측 상단)이 담당하던 배경 모드/행성 색/캐릭터
// 폴백 모델/내핵 오브젝트 종류/연결선 색까지 전부 이 패널 하나로
// 합쳤다 — Leva 의존성 자체를 걷어냈다(AboutSiloUniverse.tsx 참고).
import { useEffect, useState } from "react";
import { uploadFile } from "@/lib/storage";
import type { UniverseConfig } from "@/lib/aboutSiloUniverseConfig";

type BoardOption = { slug: string; name: string };

const ROW = "flex items-center gap-1.5";
const INPUT = "min-w-0 flex-1 rounded border border-white/15 bg-black/30 px-1.5 py-1 text-[11px] text-white placeholder:text-white/30";
const SELECT = `${INPUT}`;
const BTN = "shrink-0 rounded border border-white/20 bg-white/10 px-2 py-1 text-[10px] text-white hover:bg-white/20 disabled:opacity-40";
const SECTION_TITLE = "mb-1 text-[10px] font-semibold uppercase tracking-wide text-white/50";
const FIELD_LABEL = "block text-[10px] text-white/60";

export function UniverseSettingsPanel({
  config,
  onChange,
  availableClips,
  onSave,
  saving,
  savedAt,
  failedObjectIds,
  onSelectObjectId,
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
  // EPIC-121: 목록의 오브젝트를 클릭하면 3D 뷰에서도 선택되어(우측
  // 인스펙터 패널이 뜸) 서로 연결된 느낌을 준다.
  onSelectObjectId: (id: string) => void;
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
    const obj = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      url,
      scale: 0.3,
      label: `오브젝트 ${config.objects.length + 1}`,
      position: null,
    };
    onChange({ objects: [...config.objects, obj] });
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
    <div className="pointer-events-auto fixed bottom-6 left-6 z-40 max-h-[85vh] w-[320px] overflow-y-auto rounded-xl border border-white/15 bg-black/70 p-3 text-white shadow-2xl backdrop-blur-md">
      <div className="mb-2 flex items-center justify-between">
        <p className="text-xs font-semibold">🛠 Universe Settings</p>
        <button type="button" onClick={() => setOpen(false)} className="text-white/50 hover:text-white">
          ✕
        </button>
      </div>

      <div className="space-y-3">
        {/* EPIC-121: 예전 Leva "배경" 섹션 병합. */}
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

        {/* EPIC-121: 예전 Leva "행성" 섹션 병합 + 이름/텍스처 투명도 신설. */}
        <section>
          <p className={SECTION_TITLE}>행성</p>
          <div className="space-y-1.5">
            <label className={FIELD_LABEL}>
              이름
              <input
                className={`mt-1 ${INPUT}`}
                value={config.planetName}
                placeholder="SILO"
                onChange={(e) => onChange({ planetName: e.target.value })}
              />
            </label>
            <label className={FIELD_LABEL}>
              색상
              <div className="mt-1 flex items-center gap-1.5">
                <input
                  type="color"
                  className="h-7 w-9 shrink-0 rounded border border-white/15 bg-transparent"
                  value={config.planetColor}
                  onChange={(e) => onChange({ planetColor: e.target.value })}
                />
                <input
                  className={INPUT}
                  value={config.planetColor}
                  onChange={(e) => onChange({ planetColor: e.target.value })}
                />
              </div>
            </label>
            <label className={FIELD_LABEL}>
              지형 텍스처
              <div className={`mt-1 ${ROW}`}>
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
            </label>
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
            {config.planetTextureUrl && (
              <label className={FIELD_LABEL}>
                색상 ↔ 텍스처 블렌드
                <input
                  type="range"
                  min={0}
                  max={1}
                  step={0.05}
                  className="mt-1 w-full"
                  value={config.planetTextureOpacity}
                  onChange={(e) => onChange({ planetTextureOpacity: Number(e.target.value) })}
                />
                <span className="text-white/40">
                  {Math.round((1 - config.planetTextureOpacity) * 100)}% 색 / {Math.round(config.planetTextureOpacity * 100)}% 텍스처
                </span>
              </label>
            )}
            {/* HOTFIX-122(사용자 지시): 궤도 마커는 이제 항상 작은 별
                모양이고(hover하면 사진 미리보기) 별도 on/off 토글이 필요
                없어져 이 체크박스는 제거 — 기존 showThumbnails 필드는
                하위 호환을 위해 타입에만 남겨둔다. */}
            <label className={FIELD_LABEL}>
              공전 속도
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
            </label>
          </div>
        </section>

        {/* 궤도 데이터 소스. */}
        <section>
          <p className={SECTION_TITLE}>궤도 — 썸네일 소스 게시판</p>
          <select className={SELECT} value={config.boardSlug} onChange={(e) => onChange({ boardSlug: e.target.value })}>
            <option value="">전체(추천/인기/최신 통합)</option>
            {boards.map((b) => (
              <option key={b.slug} value={b.slug}>
                {b.name}
              </option>
            ))}
          </select>
        </section>

        {/* 캐릭터 GLB 업로드 + 애니메이션 액션 + (예전 Leva) 폴백 모델. */}
        <section>
          <p className={SECTION_TITLE}>캐릭터 — 3D 모델(.glb)</p>
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
          <label className={`${FIELD_LABEL} mt-1.5`}>
            업로드 없을 때 폴백 모델
            <select
              className={`mt-1 ${SELECT}`}
              value={config.characterType}
              onChange={(e) => onChange({ characterType: e.target.value as UniverseConfig["characterType"] })}
            >
              <option value="A">Type A</option>
              <option value="B">Type B</option>
              <option value="C">Type C</option>
            </select>
          </label>
        </section>

        {/* 장식 오브젝트 업로더 — 나무/꽃 등, SILO 행성 표면에 배치. */}
        <section>
          <p className={SECTION_TITLE}>오브젝트({config.objects.length}개) — 나무/꽃 등</p>
          <p className="mb-1 text-[10px] text-white/40">
            3D 화면에서 오브젝트를 클릭하면 선택되고(우측 패널), 파란 화살표를 드래그해 위치를 옮길 수 있어요.
          </p>
          <div className="space-y-1">
            {config.objects.map((obj) => (
              <div key={obj.id}>
                <div className={ROW}>
                  <button
                    type="button"
                    className="flex-1 truncate rounded border border-white/15 bg-black/20 px-1.5 py-1 text-left text-[11px] text-white hover:bg-white/10"
                    onClick={() => onSelectObjectId(obj.id)}
                  >
                    {obj.label}
                  </button>
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

        {/* 예전 Leva "내핵 오브젝트" 섹션 병합. */}
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

        {/* 예전 Leva "연결선" 섹션 병합. */}
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

        {/* 저장. */}
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
