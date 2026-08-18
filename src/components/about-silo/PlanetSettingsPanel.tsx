"use client";

// HOTFIX-123(사용자 지시 — "행성을 클릭했을 때, 각 행성의 특정 설정을 할 수
// 있는 창이 뜨게 해주고... 다른 행성도 마찬가지로 오브제를 설정할 수 있게
// 해주고, 행성을 orbit하는 위성 디자인도 업로드할 수 있게 해줘. 그냥 SILO
// 행성 설정과 똑같이 설정 가능하게 해줘. 근데, '사일로 행성'의 설정과는
// 다른 창이 뜨게 해줘"): 행성(SILO/유저)을 3D 뷰에서 클릭하면 뜨는 이
// 행성 전용 설정 패널 — 이름/색/텍스처/캐릭터 .glb/장식 오브젝트 목록/
// 궤도 위성(게시글 마커) 데이터 소스/위성 디자인 업로드를 담당한다.
// 전역(배경/연결선/저장)은 별도 UniverseSettingsPanel이 계속 담당 —
// 행성마다 이 컴포넌트를 독립된 인스턴스로 띄워 서로 다른 창처럼 보이게
// 한다(AboutSiloUniverse.tsx가 어느 행성을 클릭했는지에 따라 title/
// config/onChange만 바꿔 재사용).
import { useEffect, useState } from "react";
import { uploadFile } from "@/lib/storage";
import type { PlanetConfig } from "@/lib/aboutSiloUniverseConfig";
import { useDraggablePanel } from "./useDraggablePanel";

type BoardOption = { slug: string; name: string };

const ROW = "flex items-center gap-1.5";
const INPUT = "min-w-0 flex-1 rounded border border-white/15 bg-black/30 px-1.5 py-1 text-[11px] text-white placeholder:text-white/30";
const SELECT = `${INPUT}`;
const BTN = "shrink-0 rounded border border-white/20 bg-white/10 px-2 py-1 text-[10px] text-white hover:bg-white/20 disabled:opacity-40";
const SECTION_TITLE = "mb-1 text-[10px] font-semibold uppercase tracking-wide text-white/50";
const FIELD_LABEL = "block text-[10px] text-white/60";

export function PlanetSettingsPanel({
  title,
  accentClass,
  config,
  onChange,
  availableClips,
  onSave,
  saving,
  savedAt,
  failedObjectIds,
  onSelectObjectId,
  onClose,
}: {
  title: string;
  /** 패널 헤더 강조색(다른 창임을 시각적으로 구분) — Tailwind 텍스트 색 클래스. */
  accentClass: string;
  config: PlanetConfig;
  onChange: (patch: Partial<PlanetConfig>) => void;
  availableClips: string[];
  onSave: () => void;
  saving: boolean;
  savedAt: number | null;
  failedObjectIds: Set<string>;
  onSelectObjectId: (id: string) => void;
  onClose: () => void;
}) {
  const [boards, setBoards] = useState<BoardOption[]>([]);
  const [uploadingField, setUploadingField] = useState<string | null>(null);
  const { offset, dragHandleProps } = useDraggablePanel();

  useEffect(() => {
    if (boards.length > 0) return;
    fetch("/api/boards")
      .then((res) => (res.ok ? res.json() : []))
      .then((data) => {
        if (Array.isArray(data)) {
          setBoards(data.map((b: { slug: string; name: string }) => ({ slug: b.slug, name: b.name })));
        }
      })
      .catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleUpload(field: string, file: File | null, bucket: "attachments" | "gallery", apply: (url: string) => void) {
    if (!file) return;
    setUploadingField(field);
    const { url, error } = await uploadFile(file, bucket, "about-silo-universe");
    setUploadingField(null);
    if (!error && url) apply(url);
  }

  function addObject(url: string) {
    const obj = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      url,
      scale: 0.6,
      label: `오브젝트 ${config.objects.length + 1}`,
      position: null,
      thumbnailUrl: "",
      summary: "",
      link: "",
      boardSlug: "",
      focusDistanceMultiplier: null,
    };
    onChange({ objects: [...config.objects, obj] });
  }
  function removeObject(id: string) {
    onChange({ objects: config.objects.filter((o) => o.id !== id) });
  }

  return (
    <div
      className="pointer-events-auto fixed bottom-6 left-[352px] z-40 max-h-[85vh] w-[320px] overflow-y-auto rounded-xl border border-white/15 bg-black/70 p-3 text-white shadow-2xl backdrop-blur-md"
      style={{ transform: `translate(${offset.x}px, ${offset.y}px)` }}
    >
      <div className="mb-2 flex items-center justify-between" {...dragHandleProps}>
        <p className={`text-xs font-semibold ${accentClass}`}>🪐 {title}</p>
        <button type="button" onClick={onClose} className="text-white/50 hover:text-white">
          ✕
        </button>
      </div>

      <div className="space-y-3">
        <section>
          <p className={SECTION_TITLE}>행성</p>
          <div className="space-y-1.5">
            <label className={FIELD_LABEL}>
              이름
              <input
                className={`mt-1 ${INPUT}`}
                value={config.name}
                onChange={(e) => onChange({ name: e.target.value })}
              />
            </label>
            <label className={FIELD_LABEL}>
              색상
              <div className="mt-1 flex items-center gap-1.5">
                <input
                  type="color"
                  className="h-7 w-9 shrink-0 rounded border border-white/15 bg-transparent"
                  value={config.color}
                  onChange={(e) => onChange({ color: e.target.value })}
                />
                <input className={INPUT} value={config.color} onChange={(e) => onChange({ color: e.target.value })} />
              </div>
            </label>
            <label className={FIELD_LABEL}>
              지형 텍스처
              <div className={`mt-1 ${ROW}`}>
                <input
                  className={INPUT}
                  value={config.textureUrl}
                  placeholder="이미지 업로드 또는 URL"
                  onChange={(e) => onChange({ textureUrl: e.target.value })}
                />
                {config.textureUrl && (
                  <button type="button" className={BTN} onClick={() => onChange({ textureUrl: "" })}>
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
                onChange={(e) => handleUpload("planetTexture", e.target.files?.[0] ?? null, "gallery", (url) => onChange({ textureUrl: url }))}
              />
            </label>
            {config.textureUrl && (
              <label className={FIELD_LABEL}>
                색상 ↔ 텍스처 블렌드
                <input
                  type="range"
                  min={0}
                  max={1}
                  step={0.05}
                  className="mt-1 w-full"
                  value={config.textureOpacity}
                  onChange={(e) => onChange({ textureOpacity: Number(e.target.value) })}
                />
                <span className="text-white/40">
                  {Math.round((1 - config.textureOpacity) * 100)}% 색 / {Math.round(config.textureOpacity * 100)}% 텍스처
                </span>
              </label>
            )}
          </div>
        </section>

        <section>
          <p className={SECTION_TITLE}>궤도 위성 — 썸네일 소스 게시판</p>
          <select className={SELECT} value={config.boardSlug} onChange={(e) => onChange({ boardSlug: e.target.value })}>
            <option value="">전체(추천/인기/최신 통합)</option>
            {boards.map((b) => (
              <option key={b.slug} value={b.slug}>
                {b.name}
              </option>
            ))}
          </select>
          <label className={`${FIELD_LABEL} mt-1.5`}>
            위성 디자인(선택 — 비우면 기본 별 모양)
            <div className={`mt-1 ${ROW}`}>
              <input
                className={INPUT}
                value={config.satelliteDesignUrl}
                placeholder="이미지 업로드 또는 URL"
                onChange={(e) => onChange({ satelliteDesignUrl: e.target.value })}
              />
              {config.satelliteDesignUrl && (
                <button type="button" className={BTN} onClick={() => onChange({ satelliteDesignUrl: "" })}>
                  초기화
                </button>
              )}
            </div>
          </label>
          <label className={`${BTN} mt-1 block w-full cursor-pointer text-center`}>
            {uploadingField === "satelliteDesign" ? "업로드 중..." : "위성 디자인 파일 선택"}
            <input
              type="file"
              accept="image/*"
              className="hidden"
              disabled={uploadingField === "satelliteDesign"}
              onChange={(e) => handleUpload("satelliteDesign", e.target.files?.[0] ?? null, "gallery", (url) => onChange({ satelliteDesignUrl: url }))}
            />
          </label>
        </section>

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
              onChange={(e) => onChange({ characterType: e.target.value as PlanetConfig["characterType"] })}
            >
              <option value="A">Type A</option>
              <option value="B">Type B</option>
              <option value="C">Type C</option>
            </select>
          </label>
        </section>

        <section>
          <p className={SECTION_TITLE}>오브젝트({config.objects.length}개)</p>
          <p className="mb-1 text-[10px] text-white/40">
            3D 화면에서 오브젝트를 클릭하면 선택되고(우측 패널), 파란 화살표를 드래그해 위치를 옮길 수 있어요. 표면에 자동으로 붙습니다.
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

        <section className="border-t border-white/10 pt-2">
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
