"use client";

import { useRef, useState } from "react";
import { createPortal } from "react-dom";
import { uploadFileToR2 } from "@/lib/r2Upload";
import { CUSTOM_EFFECT_DEFAULTS, EFFECT_DEFAULTS } from "@/components/membership/DepthEffects";
import { DEPTH_EFFECT_LABELS, EFFECT_MOTION_LABELS, type CustomEffect, type DepthEffect, type DepthScene, type DepthSprite, type EffectConfig, type EffectMotion } from "@/lib/membershipContentDefaults";

// EPIC-163.5(사용자 지시 — 심연으로의 스크롤: 이미지가 화면 전체를 덮고, 깊이마다 색·효과, 이미지를 드래그 앤 드롭으로 배치):
// 깊이별 편집기. 아래 미리보기 무대에서 ① 빈 곳을 드래그하면 배경 이미지의 초점(어느 부분이 보일지)이 움직이고,
// ② 등장인물/장면 이미지는 잡아서 원하는 위치로 옮긴다. 무대 좌표는 %라서 실제 화면(크기가 달라도)에 같은 비율로 적용된다.
const uid = () => `sp-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v));
const parsePos = (pos: string | undefined): [number, number] => {
  const m = (pos ?? "50% 50%").match(/(-?[\d.]+)%\s+(-?[\d.]+)%/);
  return m ? [Number(m[1]), Number(m[2])] : [50, 50];
};
const input = "w-full rounded border border-gray-300 px-2 py-1 text-sm";
const EFFECTS = Object.keys(DEPTH_EFFECT_LABELS) as DepthEffect[];

type Drag =
  | { kind: "bg"; startX: number; startY: number; px: number; py: number }
  | { kind: "sprite"; id: string; startX: number; startY: number; x: number; y: number };

async function uploadFiles(files: FileList | File[]): Promise<{ urls: string[]; error: string | null }> {
  const urls: string[] = [];
  let error: string | null = null;
  for (const f of Array.from(files)) {
    const { url, error: e } = await uploadFileToR2(f);
    if (url) urls.push(url);
    else error = e ?? "업로드에 실패했어요.";
  }
  return { urls, error };
}

// 효과 한 겹의 세부 설정(개수·크기·속도·모션·반짝임·glow·불투명도) — 비운 값은 기본값을 쓴다.
function EffectControls({ cfg, onChange, defaults }: { cfg: EffectConfig; onChange: (next: EffectConfig) => void; defaults: { count: number; motion: EffectMotion; twinkle: number; glow: number; opacity: number } }) {
  const set = (p: Partial<EffectConfig>) => onChange({ ...cfg, ...p });
  const row = (label: string, key: "count" | "size" | "speed" | "twinkle" | "glow" | "opacity", min: number, max: number, def: number) => (
    <label className="block text-xs text-gray-600">
      {label} <b className="text-gray-900">{cfg[key] ?? def}</b>
      <input type="range" min={min} max={max} value={cfg[key] ?? def} onChange={(e) => set({ [key]: Number(e.target.value) })} className="w-full" />
    </label>
  );
  return (
    <div className="mt-2 grid gap-x-4 gap-y-2 rounded-md bg-gray-50 p-3 sm:grid-cols-2">
      {row("개수", "count", 1, 80, defaults.count)}
      {row("크기(%)", "size", 30, 300, 100)}
      {row("속도(%) — 클수록 빠름", "speed", 20, 300, 100)}
      {row("반짝임 세기", "twinkle", 0, 100, defaults.twinkle)}
      {row("빛번짐(glow) 반경(px)", "glow", 0, 30, defaults.glow)}
      {row("불투명도(%)", "opacity", 10, 100, defaults.opacity)}
      <label className="block text-xs text-gray-600 sm:col-span-2">
        모션
        <select value={cfg.motion ?? "default"} onChange={(e) => set({ motion: e.target.value as EffectMotion })} className="mt-1 w-full rounded border border-gray-300 px-2 py-1 text-sm">
          {(Object.keys(EFFECT_MOTION_LABELS) as EffectMotion[]).map((m) => (
            <option key={m} value={m}>
              {m === "default" ? `기본(${EFFECT_MOTION_LABELS[defaults.motion]})` : EFFECT_MOTION_LABELS[m]}
            </option>
          ))}
        </select>
      </label>
      <button type="button" onClick={() => onChange({})} className="text-left text-[11px] text-gray-500 underline sm:col-span-2">
        기본값으로 되돌리기
      </button>
    </div>
  );
}

export function MembershipDepthsEditor({ depths, onChange, onSave, onClose }: { depths: DepthScene[]; onChange: (next: DepthScene[]) => void; onSave: (next: DepthScene[]) => Promise<string | null>; onClose: () => void }) {
  const [idx, setIdx] = useState(0);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [savedJson, setSavedJson] = useState(() => JSON.stringify(depths));
  const dirty = JSON.stringify(depths) !== savedJson;
  // HOTFIX-163.9: 편집한 제목·문구·이미지가 "인스펙터 저장"을 안 눌러 사라지던 문제 — 여기서 직접 DB에 저장한다.
  async function save(): Promise<boolean> {
    setSaving(true);
    setErr(null);
    const message = await onSave(depths);
    setSaving(false);
    if (message) {
      setErr(`저장하지 못했어요: ${message}`);
      return false;
    }
    setSavedJson(JSON.stringify(depths));
    return true;
  }
  const stageRef = useRef<HTMLDivElement>(null);
  const drag = useRef<Drag | null>(null);
  const cur = depths[Math.min(idx, depths.length - 1)];
  const at = Math.min(idx, depths.length - 1);

  function patch(p: Partial<DepthScene>) {
    onChange(depths.map((d, i) => (i === at ? { ...d, ...p } : d)));
  }
  function patchSprite(id: string, p: Partial<DepthSprite>) {
    patch({ sprites: (cur.sprites ?? []).map((s) => (s.id === id ? { ...s, ...p } : s)) });
  }
  async function pick(files: FileList | null, handler: (urls: string[]) => void) {
    if (!files || files.length === 0) return;
    setBusy(true);
    setErr(null);
    const { urls, error } = await uploadFiles(files);
    setBusy(false);
    if (error) setErr(error);
    if (urls.length > 0) handler(urls);
  }

  function onPointerDown(e: React.PointerEvent, spriteId?: string) {
    const stage = stageRef.current;
    if (!stage) return;
    stage.setPointerCapture(e.pointerId);
    if (spriteId) {
      e.stopPropagation();
      const sp = (cur.sprites ?? []).find((s) => s.id === spriteId);
      if (sp) drag.current = { kind: "sprite", id: spriteId, startX: e.clientX, startY: e.clientY, x: sp.x, y: sp.y };
    } else {
      const [px, py] = parsePos(cur.imagePos);
      drag.current = { kind: "bg", startX: e.clientX, startY: e.clientY, px, py };
    }
  }
  function onPointerMove(e: React.PointerEvent) {
    const d = drag.current;
    const stage = stageRef.current;
    if (!d || !stage) return;
    const r = stage.getBoundingClientRect();
    const dx = ((e.clientX - d.startX) / r.width) * 100;
    const dy = ((e.clientY - d.startY) / r.height) * 100;
    if (d.kind === "bg") patch({ imagePos: `${Math.round(clamp(d.px - dx, 0, 100))}% ${Math.round(clamp(d.py - dy, 0, 100))}%` });
    else patchSprite(d.id, { x: Math.round(clamp(d.x + dx, -10, 110)), y: Math.round(clamp(d.y + dy, -10, 110)) });
  }
  function onPointerUp() {
    drag.current = null;
  }

  if (!cur) return null;
  const [px, py] = parsePos(cur.imagePos);
  const zoom = clamp(cur.imageZoom ?? 100, 100, 250) / 100;
  const fit = cur.imageFit ?? "contain";
  const c1 = cur.color1 || "#888888";
  const c2 = cur.color2 || "#cccccc";
  const accent = cur.accent || "#ffffff";
  const effects = cur.effects ?? [];

  return createPortal(
    <div className="fixed inset-0 z-[80] flex items-start justify-center overflow-y-auto bg-black/60 p-3 sm:p-6" role="dialog" aria-modal="true" aria-label="심연으로의 스크롤 편집">
      <div className="w-full max-w-4xl rounded-lg bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-gray-200 px-5 py-3">
          <h3 className="text-base font-semibold">심연으로의 스크롤 — 깊이별 편집</h3>
          <div className="flex items-center gap-2">
            <span className={`text-xs ${dirty ? "text-amber-600" : "text-green-600"}`}>{dirty ? "● 저장 안 된 변경이 있어요" : "✓ 저장됨"}</span>
            <button type="button" onClick={save} disabled={saving || !dirty} className="rounded border border-gray-900 px-4 py-1.5 text-sm font-semibold text-gray-900 disabled:opacity-40">
              {saving ? "저장 중..." : "저장"}
            </button>
            <button
              type="button"
              onClick={async () => {
                if (!dirty || (await save())) onClose();
              }}
              disabled={saving}
              className="rounded bg-gray-900 px-4 py-1.5 text-sm font-semibold text-white disabled:opacity-50"
            >
              저장하고 닫기
            </button>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-1 border-b border-gray-200 px-3 pt-2">
          {depths.map((d, i) => (
            <button key={i} type="button" onClick={() => setIdx(i)} className={`rounded-t px-3 py-2 text-sm ${i === at ? "bg-gray-900 font-semibold text-white" : "text-gray-600 hover:bg-gray-100"}`}>
              Depth {i + 1}
            </button>
          ))}
          <button type="button" onClick={() => { onChange([...depths, { title: `Depth ${depths.length + 1}`, text: "", effects: ["stars"], color1: "#333333", color2: "#777777", accent: "#ffffff" }]); setIdx(depths.length); }} className="ml-1 rounded border border-dashed border-gray-300 px-2 py-1 text-xs text-gray-500 hover:bg-gray-50">
            + 깊이 추가
          </button>
        </div>

        <div className="space-y-6 p-5">
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block">
              <span className="mb-1 block text-xs font-medium text-gray-600">제목</span>
              <input value={cur.title} onChange={(e) => patch({ title: e.target.value })} className={input} />
            </label>
            <div className="flex items-end justify-end">
              {depths.length > 1 && (
                <button type="button" onClick={() => { onChange(depths.filter((_, i) => i !== at)); setIdx(0); }} className="text-xs text-red-600">
                  이 깊이 삭제
                </button>
              )}
            </div>
            <label className="block sm:col-span-2">
              <span className="mb-1 block text-xs font-medium text-gray-600">아치문 안에 나올 문구</span>
              <textarea value={cur.text} onChange={(e) => patch({ text: e.target.value })} rows={3} className={input} />
            </label>
          </div>

          <div>
            <p className="mb-2 text-sm font-semibold text-gray-800">이미지 배치 (드래그 앤 드롭)</p>
            <p className="mb-2 text-xs text-gray-500">빈 곳을 드래그하면 배경 이미지의 보이는 부분(초점)이 움직이고, 등장인물 이미지는 잡아서 원하는 자리로 옮기세요. 점선 아치가 문구가 놓일 자리예요.</p>
            <div
              ref={stageRef}
              className="relative aspect-video w-full cursor-grab touch-none select-none overflow-hidden rounded-lg border border-gray-300 active:cursor-grabbing"
              style={{ background: `linear-gradient(160deg, ${c1}, ${c2})` }}
              onPointerDown={(e) => onPointerDown(e)}
              onPointerMove={onPointerMove}
              onPointerUp={onPointerUp}
              onPointerCancel={onPointerUp}
            >
              {cur.imageUrl && (
                <>
                  {fit === "contain" && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={cur.imageUrl} alt="" draggable={false} className="pointer-events-none absolute inset-0 h-full w-full scale-110 object-cover opacity-90 blur-2xl" />
                  )}
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={cur.imageUrl} alt="" draggable={false} className={`pointer-events-none absolute inset-0 h-full w-full ${fit === "cover" ? "object-cover" : "object-contain"}`} style={{ objectPosition: `${px}% ${py}%`, transform: `scale(${zoom})`, transformOrigin: `${px}% ${py}%` }} />
                </>
              )}
              <div className="pointer-events-none absolute inset-0" style={{ background: `linear-gradient(180deg, ${c1}30 0%, transparent 40%, ${c2}40 100%)` }} />
              <div className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 border-2 border-dashed" style={{ height: `${cur.doorHeightPct ?? 58}%`, aspectRatio: `${(cur.doorWidthPct ?? 52) / 100}`, maxWidth: "92%", borderRadius: "50% 50% 16px 16px / 26% 26% 16px 16px", borderColor: `${accent}cc` }} />
              {(cur.sprites ?? []).map((sp) => (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  key={sp.id}
                  src={sp.url}
                  alt=""
                  draggable={false}
                  onPointerDown={(e) => onPointerDown(e, sp.id)}
                  className="absolute cursor-move object-contain drop-shadow-lg ring-1 ring-white/0 hover:ring-white/70"
                  style={{ left: `${sp.x}%`, top: `${sp.y}%`, width: `${sp.w}%`, transform: "translate(-50%, -50%)" }}
                />
              ))}
              {!cur.imageUrl && <p className="pointer-events-none absolute inset-x-0 top-2 text-center text-xs text-white/80">배경 이미지를 올리면 여기에 화면 전체를 덮어요</p>}
            </div>
            {err && <p className="mt-1 text-sm font-medium text-red-600">{err}</p>}
            {busy && <p className="mt-1 text-xs text-gray-500">업로드 중...</p>}
          </div>

          <div className="grid gap-5 sm:grid-cols-2">
            <div className="space-y-2 rounded-md border border-gray-200 p-3">
              <p className="text-sm font-semibold text-gray-800">배경 이미지 (화면 전체를 덮음)</p>
              <div className="flex flex-wrap items-center gap-2">
                <label className="cursor-pointer rounded border border-gray-300 bg-white px-3 py-1.5 text-xs hover:bg-gray-50">
                  {cur.imageUrl ? "다른 이미지로 바꾸기" : "이미지 올리기"}
                  <input type="file" accept="image/*" className="hidden" onChange={(e) => { pick(e.target.files, (u) => patch({ imageUrl: u[0], imagePos: "50% 50%" })); e.target.value = ""; }} />
                </label>
                {cur.imageUrl && (
                  <button type="button" onClick={() => patch({ imageUrl: "" })} className="text-xs text-red-600">
                    지우기
                  </button>
                )}
              </div>
              {cur.imageUrl && (
                <label className="block">
                  <span className="mb-1 block text-xs text-gray-600">보이는 방식</span>
                  <select value={fit} onChange={(e) => patch({ imageFit: e.target.value as "contain" | "cover" })} className={input}>
                    <option value="contain">이미지 전체가 잘리지 않게(기본)</option>
                    <option value="cover">화면을 꽉 채우기(위아래/좌우 잘림)</option>
                  </select>
                </label>
              )}
              {cur.imageUrl && (
                <label className="block">
                  <span className="mb-1 block text-xs text-gray-600">확대 {Math.round(zoom * 100)}%</span>
                  <input type="range" min={100} max={250} value={Math.round(zoom * 100)} onChange={(e) => patch({ imageZoom: Number(e.target.value) })} className="w-full" />
                </label>
              )}
            </div>

            <div className="space-y-2 rounded-md border border-gray-200 p-3">
              <p className="text-sm font-semibold text-gray-800">깊이의 색</p>
              <div className="grid grid-cols-3 gap-2 text-xs">
                {([["color1", "주요 색 1"], ["color2", "주요 색 2"], ["accent", "강조·효과 색"]] as const).map(([k, label]) => (
                  <label key={k} className="block">
                    <span className="mb-1 block text-gray-600">{label}</span>
                    <input type="color" value={/^#[0-9a-fA-F]{6}$/.test(cur[k] ?? "") ? (cur[k] as string) : "#888888"} onChange={(e) => patch({ [k]: e.target.value } as Partial<DepthScene>)} className="h-9 w-full cursor-pointer rounded border border-gray-300" />
                  </label>
                ))}
              </div>
              <p className="text-xs text-gray-500">배경 그라데이션과 이미지 위 색 덮개, 효과의 색으로 쓰여요.</p>
            </div>
          </div>

          <div className="rounded-md border border-gray-200 p-3">
            <p className="mb-2 text-sm font-semibold text-gray-800">아치문 크기·유리 효과</p>
            <div className="grid gap-3 sm:grid-cols-2">
              {([
                ["doorHeightPct", "문 높이(화면 높이의 %)", 30, 98, 58],
                ["doorWidthPct", "문 폭(문 높이 대비 %)", 30, 140, 52],
                ["doorBlurPx", "문 안쪽 블러(px)", 0, 40, 12],
                ["doorDarkPct", "문 안쪽 어둡기(%)", 0, 90, 42],
              ] as const).map(([key, label, min, max, def]) => (
                <label key={key} className="block text-xs text-gray-600">
                  {label} <b className="text-gray-900">{cur[key] ?? def}</b>
                  <input type="range" min={min} max={max} value={cur[key] ?? def} onChange={(e) => patch({ [key]: Number(e.target.value) } as Partial<DepthScene>)} className="w-full" />
                </label>
              ))}
            </div>
            <p className="mt-1 text-[11px] text-gray-400">위 무대의 점선 아치는 대략의 자리예요. 실제 크기는 저장 후 페이지에서 확인하세요. 문구는 Enter로 줄을 바꾸면 그대로 줄바꿈돼요.</p>
          </div>

          <div className="rounded-md border border-gray-200 p-3">
            <p className="mb-2 text-sm font-semibold text-gray-800">등장인물·장면 이미지 (여러 장, 위 무대에서 드래그로 배치)</p>
            <label className="inline-block cursor-pointer rounded border border-gray-300 bg-white px-3 py-1.5 text-xs hover:bg-gray-50">
              이미지 추가(여러 장 선택 가능)
              <input
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                onChange={(e) => {
                  pick(e.target.files, (urls) => patch({ sprites: [...(cur.sprites ?? []), ...urls.map((url, i) => ({ id: uid(), url, x: 25 + ((cur.sprites?.length ?? 0) + i) * 12, y: 55, w: 24 }))] }));
                  e.target.value = "";
                }}
              />
            </label>
            <ul className="mt-3 space-y-2">
              {(cur.sprites ?? []).map((sp) => (
                <li key={sp.id} className="flex items-center gap-3">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={sp.url} alt="" className="h-12 w-12 rounded border border-gray-200 bg-gray-50 object-contain" />
                  <label className="flex flex-1 items-center gap-2 text-xs text-gray-600">
                    크기 {sp.w}%
                    <input type="range" min={5} max={80} value={sp.w} onChange={(e) => patchSprite(sp.id, { w: Number(e.target.value) })} className="flex-1" />
                  </label>
                  <button type="button" onClick={() => patch({ sprites: (cur.sprites ?? []).filter((s) => s.id !== sp.id) })} className="text-xs text-red-600">
                    삭제
                  </button>
                </li>
              ))}
            </ul>
          </div>

          <div className="rounded-md border border-gray-200 p-3">
            <p className="mb-1 text-sm font-semibold text-gray-800">화면 전체에 깔리는 효과</p>
            <p className="mb-2 text-xs text-gray-500">켜 둔 효과마다 개수·크기·속도·모션·반짝임·glow를 따로 조절할 수 있어요.</p>
            <div className="space-y-2">
              {EFFECTS.map((ef) => {
                const on = effects.includes(ef);
                return (
                  <div key={ef} className="rounded border border-gray-100 p-2">
                    <label className="flex items-center gap-1.5 text-sm text-gray-800">
                      <input type="checkbox" checked={on} onChange={(e) => patch({ effects: e.target.checked ? [...effects, ef] : effects.filter((x) => x !== ef) })} />
                      {DEPTH_EFFECT_LABELS[ef]}
                    </label>
                    {on && (
                      <>
                        {ef === "feathers" && (
                          <div className="mt-2">
                            <p className="mb-1 text-xs text-gray-600">휘날리는 이미지(깃털 5개 정도) — 비우면 기본 깃털이 날려요.</p>
                            <label className="inline-block cursor-pointer rounded border border-gray-300 bg-white px-3 py-1.5 text-xs hover:bg-gray-50">
                              깃털 이미지 추가
                              <input type="file" accept="image/*" multiple className="hidden" onChange={(e) => { pick(e.target.files, (urls) => patch({ effectImages: [...(cur.effectImages ?? []), ...urls] })); e.target.value = ""; }} />
                            </label>
                            <div className="mt-2 flex flex-wrap gap-2">
                              {(cur.effectImages ?? []).map((u, i) => (
                                <div key={`${u}-${i}`} className="relative">
                                  {/* eslint-disable-next-line @next/next/no-img-element */}
                                  <img src={u} alt="" className="h-14 w-14 rounded border border-gray-200 bg-gray-50 object-contain" />
                                  <button type="button" onClick={() => patch({ effectImages: (cur.effectImages ?? []).filter((_, j) => j !== i) })} className="absolute -right-1 -top-1 rounded-full bg-red-500 px-1 text-[10px] text-white">
                                    ✕
                                  </button>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                        <EffectControls cfg={cur.effectConfig?.[ef] ?? {}} defaults={EFFECT_DEFAULTS[ef]} onChange={(next) => patch({ effectConfig: { ...(cur.effectConfig ?? {}), [ef]: next } })} />
                      </>
                    )}
                  </div>
                );
              })}
            </div>

            <div className="mt-4 border-t border-gray-100 pt-3">
              <p className="mb-1 text-sm font-semibold text-gray-800">내 이미지로 만든 효과</p>
              <p className="mb-2 text-xs text-gray-500">올린 이미지(여러 장)를 화면 전체에 흩뿌려요. 반딧불·눈송이·나비·리본 등 무엇이든 — 투명 배경 PNG가 가장 잘 어울려요.</p>
              <button
                type="button"
                onClick={() => patch({ customEffects: [...(cur.customEffects ?? []), { id: uid(), name: `내 효과 ${(cur.customEffects?.length ?? 0) + 1}`, images: [] }] })}
                className="rounded border border-gray-300 bg-white px-3 py-1.5 text-xs hover:bg-gray-50"
              >
                + 효과 추가
              </button>
              <div className="mt-3 space-y-3">
                {(cur.customEffects ?? []).map((ce: CustomEffect) => {
                  const setCe = (p: Partial<CustomEffect>) => patch({ customEffects: (cur.customEffects ?? []).map((x) => (x.id === ce.id ? { ...x, ...p } : x)) });
                  return (
                    <div key={ce.id} className="rounded border border-gray-200 p-3">
                      <div className="flex items-center gap-2">
                        <input value={ce.name ?? ""} onChange={(e) => setCe({ name: e.target.value })} placeholder="효과 이름" className={input} />
                        <button type="button" onClick={() => patch({ customEffects: (cur.customEffects ?? []).filter((x) => x.id !== ce.id) })} className="shrink-0 text-xs text-red-600">
                          삭제
                        </button>
                      </div>
                      <label className="mt-2 inline-block cursor-pointer rounded border border-gray-300 bg-white px-3 py-1.5 text-xs hover:bg-gray-50">
                        이미지 올리기(여러 장 선택 가능)
                        <input type="file" accept="image/*" multiple className="hidden" onChange={(e) => { pick(e.target.files, (urls) => setCe({ images: [...ce.images, ...urls] })); e.target.value = ""; }} />
                      </label>
                      <div className="mt-2 flex flex-wrap gap-2">
                        {ce.images.map((u, i) => (
                          <div key={`${u}-${i}`} className="relative">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={u} alt="" className="h-14 w-14 rounded border border-gray-200 bg-gray-50 object-contain" />
                            <button type="button" onClick={() => setCe({ images: ce.images.filter((_, j) => j !== i) })} className="absolute -right-1 -top-1 rounded-full bg-red-500 px-1 text-[10px] text-white">
                              ✕
                            </button>
                          </div>
                        ))}
                      </div>
                      <EffectControls cfg={ce} defaults={CUSTOM_EFFECT_DEFAULTS} onChange={(next) => setCe({ ...next })} />
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}