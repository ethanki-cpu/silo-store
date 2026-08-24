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
// 연결선 색, 공전 속도, 우주 공간 오브젝트, 저장/자동저장. (하드코딩된
// "기본 카테고리 마커 모양" 섹션은 HOTFIX로 카테고리 마커 자체가 완전히
// 삭제되며 함께 제거됨 — AboutSiloUniverse.tsx 참고.)
import { useState } from "react";
import { uploadRawFileToR2 } from "@/lib/r2Upload";
import type { UniverseConfig, SpaceObject } from "@/lib/aboutSiloUniverseConfig";
import { useDraggablePanel } from "./useDraggablePanel";

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
  const [uploadingShootingStarField, setUploadingShootingStarField] = useState<"model" | "sprite" | null>(null);
  // EPIC-144(사용자 지시 — "어떤 설정창이든 그 설정창 외부를 누르면
  // 설정창이 해제될수 있게 해줘"): open이 false인 동안(패널이 접혀 열기
  // 버튼만 보이는 상태)은 리스너를 아예 안 달아야, 열기 버튼을 누르는
  // 바로 그 클릭 이후 다음 바깥 클릭에 곧바로 닫히는 걸 막을 수 있다.
  const { offset, dragHandleProps, panelRef } = useDraggablePanel({ onClickOutside: () => setOpen(false), enabled: open });

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
      boardSlug: "",
      focusDistanceMultiplier: null,
      yaw: 0,
      count: kind === "sprite" ? 8 : 1,
      scatterSeed: 0,
      placement: "between",
    };
    onChange({ spaceObjects: [...config.spaceObjects, obj] });
  }
  function removeSpaceObject(id: string) {
    onChange({ spaceObjects: config.spaceObjects.filter((o) => o.id !== id) });
  }
  function updateSpaceObjectCount(id: string, count: number) {
    onChange({
      spaceObjects: config.spaceObjects.map((o) => (o.id === id ? { ...o, count: Math.max(1, Math.min(200, count)) } : o)),
    });
  }
  function reshuffleSpaceObject(id: string) {
    onChange({
      spaceObjects: config.spaceObjects.map((o) => (o.id === id ? { ...o, scatterSeed: o.scatterSeed + 1 } : o)),
    });
  }
  // EPIC-144(사용자 지시 — "먼곳에 은하수, 블랙홀, nebula... 우주의
  // 먼곳에 보일수 있게"): "먼 우주 배경"으로 바꾸면 훨씬 먼 반지름에
  // 배치된다(spaceObjectDefaultPosition 참고) — 위치를 바꾸는 값이라
  // 바뀌자마자 다시 배치(scatterSeed 갱신)해야 즉시 반영된다.
  function updateSpaceObjectPlacement(id: string, placement: SpaceObject["placement"]) {
    onChange({
      spaceObjects: config.spaceObjects.map((o) => (o.id === id ? { ...o, placement, scatterSeed: o.scatterSeed + 1 } : o)),
    });
  }
  // HOTFIX-144.7(사용자 신고 — "universe setting 에서 아직도 업로드가
  // 용량 제한이 있어, 특히 '먼우주 배경' 으로 glb 파일을 올리려 했더니
  // 실패했어"): HOTFIX-144.5가 PlanetSettingsPanel/ObjectInspectorPanel
  // 두 곳만 Supabase Storage(50MB 상한)에서 R2(100MB 상한)로 옮기고 이
  // 파일(우주 공간 오브젝트/별똥별 업로드)을 빠뜨렸다 — 여기도 동일하게
  // 옮긴다.
  async function handleSpaceUpload(kind: SpaceObject["kind"], file: File | null) {
    if (!file) return;
    setUploadingSpaceField(kind);
    const { fileUrl, error } = await uploadRawFileToR2(file);
    setUploadingSpaceField(null);
    if (error || !fileUrl) {
      alert(`업로드에 실패했어요.\n\n${error ?? "알 수 없는 오류"}`);
      return;
    }
    addSpaceObject(kind, fileUrl);
  }
  async function handleShootingStarUpload(kind: "model" | "sprite", file: File | null) {
    if (!file) return;
    setUploadingShootingStarField(kind);
    const { fileUrl, error } = await uploadRawFileToR2(file);
    setUploadingShootingStarField(null);
    if (error || !fileUrl) {
      alert(`업로드에 실패했어요.\n\n${error ?? "알 수 없는 오류"}`);
      return;
    }
    onChange({ shootingStars: { ...config.shootingStars, objectUrl: fileUrl, objectKind: kind } });
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
    <div
      ref={panelRef}
      className="pointer-events-auto fixed bottom-6 left-6 z-40 max-h-[85vh] w-[320px] overflow-y-auto rounded-xl border border-white/15 bg-black/70 p-3 text-white shadow-2xl backdrop-blur-md"
      style={{ transform: `translate(${offset.x}px, ${offset.y}px)` }}
    >
      <div className="mb-2 flex items-center justify-between" {...dragHandleProps}>
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

        {/* EPIC-144(사용자 지시 — "줌인 줌아웃이 너무 조금씩 되니까
            답답해 그거도 설정할수 있게"): CameraControls의 dollySpeed —
            예전엔 0.55로 하드코딩. 클수록 휠 한 번에 더 크게 줌된다. */}
        <section>
          <p className={SECTION_TITLE}>줌 감도(휠 한 번에 얼마나 크게 줌 되는지)</p>
          <input
            type="range"
            min={0.2}
            max={3}
            step={0.05}
            className="mt-1 w-full"
            value={config.zoomSpeed}
            onChange={(e) => onChange({ zoomSpeed: Number(e.target.value) })}
          />
          <span className="text-white/40">{config.zoomSpeed.toFixed(2)}배</span>
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

        {/* HOTFIX-140.4(사용자 지시 — "오브제를 클릭했을때, 하늘색
            구체가 안보이게 해줘... 표면에 얇은 하이라이트가 되게만
            해줘"): 감싸는 구체는 없어지고 표면을 따라가는 얇은 외곽선이
            됐다 — 이 슬라이더는 이제 그 외곽선의 불투명도를 조절한다. */}
        <section>
          <p className={SECTION_TITLE}>선택 시 표면 하이라이트 불투명도</p>
          <input
            type="range"
            min={0}
            max={1}
            step={0.05}
            className="mt-1 w-full"
            value={config.selectionGlowOpacity}
            onChange={(e) => onChange({ selectionGlowOpacity: Number(e.target.value) })}
          />
          <span className="text-white/40">{config.selectionGlowOpacity.toFixed(2)}</span>
        </section>

        {/* HOTFIX-140.4(사용자 지시 — "'우주'인데 별똥별 효과... 옵션도
            추가해줘 랜덤으로 보이게 그리고 내가 설정할수 있게"): 별똥별
            자체는 이미 있었지만 개수 4개 고정 + on/off·색상·속도 조절이
            전혀 없었다. */}
        <section>
          <p className={SECTION_TITLE}>별똥별</p>
          <label className="mb-1.5 flex items-center gap-2 text-[10px] text-white/70">
            <input
              type="checkbox"
              checked={config.shootingStars.enabled}
              onChange={(e) => onChange({ shootingStars: { ...config.shootingStars, enabled: e.target.checked } })}
            />
            켜기(무작위 간격으로 계속 떨어져요)
          </label>
          {config.shootingStars.enabled && (
            <div className="space-y-1.5">
              <label className={FIELD_LABEL}>
                개수
                <input
                  type="number"
                  min={0}
                  max={20}
                  value={config.shootingStars.count}
                  onChange={(e) =>
                    onChange({ shootingStars: { ...config.shootingStars, count: Math.max(0, Math.min(20, Number(e.target.value) || 0)) } })
                  }
                  className={`mt-1 ${INPUT}`}
                />
              </label>
              <label className={FIELD_LABEL}>
                속도
                <input
                  type="range"
                  min={0.3}
                  max={3}
                  step={0.1}
                  className="mt-1 w-full"
                  value={config.shootingStars.speedMultiplier}
                  onChange={(e) => onChange({ shootingStars: { ...config.shootingStars, speedMultiplier: Number(e.target.value) } })}
                />
                <span className="text-white/40">{config.shootingStars.speedMultiplier.toFixed(1)}배</span>
              </label>
              <div className="flex items-center gap-1.5">
                <input
                  type="color"
                  className="h-7 w-9 shrink-0 rounded border border-white/15 bg-transparent"
                  value={config.shootingStars.color}
                  onChange={(e) => onChange({ shootingStars: { ...config.shootingStars, color: e.target.value } })}
                />
                <input
                  className={INPUT}
                  value={config.shootingStars.color}
                  onChange={(e) => onChange({ shootingStars: { ...config.shootingStars, color: e.target.value } })}
                />
              </div>
              {/* EPIC-144(사용자 지시 — "진짜같은 별똥별 효과(내가
                  설정한 오브제가 orbit 하고 tail 이 있음 반짝이는
                  tail)"): 궤적은 이제 항상 곡선(호)이고 반짝이는 꼬리가
                  자동으로 따라붙는다 — 여기서는 꼬리 길이와, 기본 막대
                  대신 쓸 모델/이미지를 설정한다. */}
              <label className={FIELD_LABEL}>
                꼬리 길이(반짝이는 잔상 점 개수)
                <input
                  type="range"
                  min={0}
                  max={30}
                  step={1}
                  className="mt-1 w-full"
                  value={config.shootingStars.tailLength}
                  onChange={(e) => onChange({ shootingStars: { ...config.shootingStars, tailLength: Number(e.target.value) } })}
                />
                <span className="text-white/40">{config.shootingStars.tailLength}개</span>
              </label>
              <label className={FIELD_LABEL}>
                별똥별 머리 모양(비우면 기본 막대)
                <div className={`mt-1 ${ROW}`}>
                  <input
                    className={INPUT}
                    value={config.shootingStars.objectUrl}
                    placeholder="이미지/모델 업로드 또는 URL"
                    onChange={(e) => onChange({ shootingStars: { ...config.shootingStars, objectUrl: e.target.value } })}
                  />
                  {config.shootingStars.objectUrl && (
                    <button
                      type="button"
                      className={BTN}
                      onClick={() => onChange({ shootingStars: { ...config.shootingStars, objectUrl: "" } })}
                    >
                      초기화
                    </button>
                  )}
                </div>
              </label>
              {config.shootingStars.objectUrl && (
                <label className={FIELD_LABEL}>
                  머리 종류
                  <select
                    className={`mt-1 ${SELECT}`}
                    value={config.shootingStars.objectKind}
                    onChange={(e) =>
                      onChange({ shootingStars: { ...config.shootingStars, objectKind: e.target.value as "model" | "sprite" } })
                    }
                  >
                    <option value="model">3D 모델(.glb)</option>
                    <option value="sprite">이미지(카메라를 향하는 빌보드)</option>
                  </select>
                </label>
              )}
              <div className="grid grid-cols-2 gap-1.5">
                <label className={`${BTN} block cursor-pointer text-center`}>
                  {uploadingShootingStarField === "model" ? "업로드 중..." : "🪐 모델(.glb) 업로드"}
                  <input
                    type="file"
                    accept=".glb,.gltf"
                    className="hidden"
                    disabled={uploadingShootingStarField !== null}
                    onChange={(e) => handleShootingStarUpload("model", e.target.files?.[0] ?? null)}
                  />
                </label>
                <label className={`${BTN} block cursor-pointer text-center`}>
                  {uploadingShootingStarField === "sprite" ? "업로드 중..." : "✨ 이미지 업로드"}
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    disabled={uploadingShootingStarField !== null}
                    onChange={(e) => handleShootingStarUpload("sprite", e.target.files?.[0] ?? null)}
                  />
                </label>
              </div>
            </div>
          )}
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
                {/* C4(사용자 지시 — "무작위로 우주 공간에 몇개 랜덤 공간에
                    떠다니는지 설정할수 있게"): 개수를 늘리면 같은
                    이미지가 그만큼 서로 다른 무작위 위치에 흩뿌려진다
                    (2개 이상이면 드래그로 옮긴 위치는 더 이상 안 쓰임). */}
                <div className={`${ROW} mt-1`}>
                  <label className="flex flex-1 items-center gap-1 text-[10px] text-white/50">
                    개수(무작위 배치)
                    <input
                      type="number"
                      min={1}
                      max={200}
                      value={obj.count}
                      onChange={(e) => updateSpaceObjectCount(obj.id, Number(e.target.value) || 1)}
                      className="w-14 rounded border border-white/15 bg-black/30 px-1 py-0.5 text-[11px] text-white"
                    />
                  </label>
                  <button type="button" className={BTN} onClick={() => reshuffleSpaceObject(obj.id)} title="같은 개수로 위치를 다시 무작위로 뽑는다">
                    🎲 다시 배치
                  </button>
                </div>
                {/* EPIC-144(사용자 지시 — "먼곳에 은하수, 블랙홀,
                    nebula... 우주의 먼곳에 보일수 있게"): 기본("행성
                    사이")은 두 행성 사이에 가깝게 흩뿌려지고, "먼 우주
                    배경"은 훨씬 먼 반지름(40~85)에 배치돼 은하수/블랙홀/
                    네뷸러 같은 깊은 배경으로 쓸 수 있다 — 크기(스케일)도
                    ObjectInspectorPanel에서 함께 키워야 멀리서도 잘
                    보인다. */}
                <label className={`${ROW} mt-1 text-[10px] text-white/50`}>
                  배치
                  <select
                    className={`${SELECT} py-0.5`}
                    value={obj.placement}
                    onChange={(e) => updateSpaceObjectPlacement(obj.id, e.target.value as SpaceObject["placement"])}
                  >
                    <option value="between">행성 사이(기본)</option>
                    <option value="distant">먼 우주 배경(은하수/블랙홀/네뷸러 등)</option>
                  </select>
                </label>
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
