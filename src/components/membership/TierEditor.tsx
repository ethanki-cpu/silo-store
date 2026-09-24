"use client";

import { useState } from "react";
import { createPortal } from "react-dom";
import type { JSONContent } from "@tiptap/react";
import { BlockEditor } from "@/components/editor/BlockEditor";
import { isEmptyDoc, renderPostHtml } from "@/lib/blockEditorCore";
import { supabase } from "@/lib/supabaseClient";
import { uploadFileToR2 } from "@/lib/r2Upload";
import { LetterView } from "@/components/membership/TierStory";
import {
  ASPECT_OPTIONS,
  DEFAULT_LETTER_STYLE,
  plainToHtml,
  type LetterStyle,
  type MissionQuestion,
  type TierContent,
  type TierMediaSettings,
} from "@/lib/tierContent";

// HOTFIX-162.13: 등급 카드 콘텐츠 편집(관리자) — 이미지/영상 · 소개(Block Editor) · 편지(Block Editor + 편지지 디자인) · 미션 질문.
// 소개/편지에는 이미지·영상 갤러리(캐러셀)·임베드까지 Block Editor가 지원하는 것은 전부 넣을 수 있다.
const newId = () => `q-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
type Tab = "media" | "intro" | "letter" | "mission";
const TABS: { key: Tab; label: string }[] = [
  { key: "media", label: "이미지·영상" },
  { key: "intro", label: "소개" },
  { key: "letter", label: "편지" },
  { key: "mission", label: "가입 미션" },
];

const input = "w-full rounded border border-gray-300 px-2 py-1 text-sm";
const num = (v: string): number | undefined => (v.trim() === "" || Number.isNaN(Number(v)) ? undefined : Number(v));

function UploadField({ label, value, onChange, accept, hint }: { label: string; value: string; onChange: (v: string) => void; accept: string; hint?: string }) {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  async function up(file: File) {
    setBusy(true);
    setErr(null);
    const { url, error } = await uploadFileToR2(file);
    setBusy(false);
    if (error || !url) setErr(error ?? "업로드에 실패했어요.");
    else onChange(url);
  }
  return (
    <div>
      <span className="mb-1 block text-sm font-medium text-gray-700">{label}</span>
      {hint && <span className="mb-1 block text-xs text-gray-500">{hint}</span>}
      <input value={value} onChange={(e) => onChange(e.target.value)} placeholder="URL 붙여넣기 또는 아래에서 파일 업로드" className={input} />
      <div className="mt-1 flex items-center gap-2">
        <input
          type="file"
          accept={accept}
          disabled={busy}
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) up(f);
            e.target.value = "";
          }}
          className="text-xs"
        />
        {value && (
          <button type="button" onClick={() => onChange("")} className="text-xs text-red-600">
            지우기
          </button>
        )}
        {busy && <span className="text-xs text-gray-500">업로드 중...</span>}
      </div>
      {err && <p className="text-xs text-red-600">{err}</p>}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-medium text-gray-600">{label}</span>
      {children}
    </label>
  );
}

export function TierEditor({ tier, onSaved, onClose }: { tier: TierContent; onSaved: (t: TierContent) => void; onClose: () => void }) {
  const [tab, setTab] = useState<Tab>("media");
  const [imageUrl, setImageUrl] = useState(tier.image_url ?? "");
  const [animationUrl, setAnimationUrl] = useState(tier.animation_url ?? "");
  const [media, setMedia] = useState<TierMediaSettings>(tier.media_settings ?? {});
  const [introJson, setIntroJson] = useState<JSONContent | null>((tier.intro_json as JSONContent | null) ?? null);
  const [letterJson, setLetterJson] = useState<JSONContent | null>((tier.letter_json as JSONContent | null) ?? null);
  const [letterStyle, setLetterStyle] = useState<LetterStyle>(tier.letter_style ?? {});
  const [questions, setQuestions] = useState<MissionQuestion[]>(tier.mission_questions ?? []);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const letterPreviewHtml = letterJson && !isEmptyDoc(letterJson) ? renderPostHtml(letterJson) : plainToHtml(tier.letter_text) || "<p>여기에 편지를 쓰면 편지지에 이렇게 보여요.</p>";
  const ls = { ...DEFAULT_LETTER_STYLE, ...letterStyle };
  const setLS = (patch: Partial<LetterStyle>) => setLetterStyle((prev) => ({ ...prev, ...patch }));
  const setMed = (patch: Partial<TierMediaSettings>) => setMedia((prev) => ({ ...prev, ...patch }));

  async function save() {
    setSaving(true);
    setError(null);
    const introEmpty = !introJson || isEmptyDoc(introJson);
    const letterEmpty = !letterJson || isEmptyDoc(letterJson);
    const payload = {
      image_url: imageUrl.trim() || null,
      animation_url: animationUrl.trim() || null,
      media_settings: Object.keys(media).length > 0 ? media : null,
      // 새 에디터로 저장했으면 그 내용이 정본 — 비웠다면 null로 두어 예전 평문 폴백이 아닌 "빈 소개"가 되게 평문도 비운다.
      intro_json: introEmpty ? null : introJson,
      intro_html: introEmpty ? null : renderPostHtml(introJson as JSONContent),
      ...(introEmpty && introJson ? { intro_text: null } : {}),
      letter_json: letterEmpty ? null : letterJson,
      letter_html: letterEmpty ? null : renderPostHtml(letterJson as JSONContent),
      ...(letterEmpty && letterJson ? { letter_text: null } : {}),
      letter_style: Object.keys(letterStyle).length > 0 ? letterStyle : null,
      mission_questions: questions.filter((q) => q.text.trim()).map((q) => ({ ...q, text: q.text.trim() })),
    };
    const { error: updateError } = await supabase.from("membership_tiers").update(payload).eq("rank", tier.rank);
    setSaving(false);
    if (updateError) {
      setError(updateError.message);
      return;
    }
    onSaved({ ...tier, ...payload } as TierContent);
    onClose();
  }

  // 캐러셀 슬라이드가 transform을 쓰므로 fixed 모달이 슬라이드 기준으로 배치되는 것을 막으려고 body로 포탈한다.
  return createPortal(
    <div className="fixed inset-0 z-[70] flex items-start justify-center overflow-y-auto bg-black/60 p-3 sm:p-6" role="dialog" aria-modal="true" aria-label={`${tier.name} 편집`}>
      <div className="w-full max-w-4xl rounded-lg bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-gray-200 px-5 py-3">
          <h3 className="text-base font-semibold">{tier.name} 카드 편집(관리자)</h3>
          <button type="button" onClick={onClose} aria-label="닫기" className="text-gray-400 hover:text-gray-700">
            ✕
          </button>
        </div>
        <div className="flex gap-1 border-b border-gray-200 px-3 pt-2">
          {TABS.map((t) => (
            <button
              key={t.key}
              type="button"
              onClick={() => setTab(t.key)}
              className={`rounded-t px-4 py-2 text-sm ${tab === t.key ? "bg-gray-900 font-semibold text-white" : "text-gray-600 hover:bg-gray-100"}`}
            >
              {t.label}
            </button>
          ))}
        </div>

        <div className="p-5">
          {/* 탭을 바꿔도 에디터가 초기화되지 않도록 언마운트하지 않고 숨긴다. */}
          <div className={tab === "media" ? "space-y-5" : "hidden"}>
            <UploadField label="대표 이미지" value={imageUrl} onChange={setImageUrl} accept="image/*" hint="카드 맨 위에 보이는 이미지예요. 아래 애니메이션/영상이 있으면 그쪽이 우선해요." />
            <UploadField
              label="애니메이션/영상 (webm · mp4 · gif 등)"
              value={animationUrl}
              onChange={setAnimationUrl}
              accept="video/*,image/*"
              hint="움직이는 파일을 올리면 자동 재생·반복·무음으로 재생돼요. 나중에 올려도 돼요."
            />
            <div className="rounded-md border border-gray-200 p-4">
              <p className="mb-3 text-sm font-medium text-gray-700">이 등급의 이미지 표시 (비워두면 위젯 설정 값 사용)</p>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                <Field label="너비(px)">
                  <input type="number" value={media.widthPx ?? ""} onChange={(e) => setMed({ widthPx: num(e.target.value) })} className={input} />
                </Field>
                <Field label="비율">
                  <select value={media.aspect ?? ""} onChange={(e) => setMed({ aspect: e.target.value || undefined })} className={input}>
                    <option value="">(위젯 기본)</option>
                    {ASPECT_OPTIONS.map((a) => (
                      <option key={a} value={a}>
                        {a === "auto" ? "원본 비율" : a}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label="채우기">
                  <select value={media.fit ?? ""} onChange={(e) => setMed({ fit: (e.target.value || undefined) as TierMediaSettings["fit"] })} className={input}>
                    <option value="">(위젯 기본)</option>
                    <option value="contain">전체 보이기(잘림 없음)</option>
                    <option value="cover">꽉 채우기(잘릴 수 있음)</option>
                  </select>
                </Field>
                <Field label="모서리 둥글기(px)">
                  <input type="number" value={media.radiusPx ?? ""} onChange={(e) => setMed({ radiusPx: num(e.target.value) })} className={input} />
                </Field>
              </div>
            </div>
          </div>

          <div className={tab === "intro" ? "" : "hidden"}>
            <p className="mb-2 text-xs text-gray-500">글, 이미지, 영상/이미지 갤러리(캐러셀), 유튜브·인스타 등 임베드를 자유롭게 넣을 수 있어요. 입력창에서 &ldquo;/&rdquo;를 치면 블록 메뉴가 열려요.</p>
            <BlockEditor
              value={(tier.intro_json as JSONContent | null) ?? undefined}
              legacyHtml={tier.intro_json ? undefined : plainToHtml(tier.intro_text)}
              onChange={(json) => setIntroJson(json)}
              placeholder="이 등급의 소개를 써주세요"
            />
          </div>

          <div className={tab === "letter" ? "space-y-5" : "hidden"}>
            <div>
              <p className="mb-2 text-xs text-gray-500">편지도 소개와 같은 에디터예요. 사진·영상·임베드를 편지 안에 넣을 수 있어요.</p>
              <BlockEditor
                value={(tier.letter_json as JSONContent | null) ?? undefined}
                legacyHtml={tier.letter_json ? undefined : plainToHtml(tier.letter_text)}
                onChange={(json) => setLetterJson(json)}
                placeholder="편지를 써주세요"
              />
            </div>
            <div className="rounded-md border border-gray-200 p-4">
              <p className="mb-3 text-sm font-medium text-gray-700">편지지 디자인</p>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                <Field label="종이 종류">
                  <select value={ls.frame} onChange={(e) => setLS({ frame: e.target.value as LetterStyle["frame"] })} className={input}>
                    <option value="paper">편지지(그림자·테두리)</option>
                    <option value="dark">어두운 편지지</option>
                    <option value="plain">배경 없음</option>
                  </select>
                </Field>
                <Field label="종이 색">
                  <input value={letterStyle.paperColor ?? ""} onChange={(e) => setLS({ paperColor: e.target.value || undefined })} placeholder={ls.paperColor} className={input} />
                </Field>
                <Field label="글자 색">
                  <input value={letterStyle.textColor ?? ""} onChange={(e) => setLS({ textColor: e.target.value || undefined })} placeholder={ls.textColor} className={input} />
                </Field>
                <Field label="글꼴">
                  <select value={ls.fontFamily} onChange={(e) => setLS({ fontFamily: e.target.value as LetterStyle["fontFamily"] })} className={input}>
                    <option value="serif">명조(편지 느낌)</option>
                    <option value="sans">고딕</option>
                    <option value="mono">타자기</option>
                    <option value="custom">직접 입력</option>
                  </select>
                </Field>
                {ls.fontFamily === "custom" && (
                  <Field label="글꼴 이름(CSS)">
                    <input value={letterStyle.customFont ?? ""} onChange={(e) => setLS({ customFont: e.target.value })} placeholder='"Nanum Pen Script", cursive' className={input} />
                  </Field>
                )}
                <Field label="글자 크기(px)">
                  <input type="number" value={letterStyle.fontSizePx ?? ""} onChange={(e) => setLS({ fontSizePx: num(e.target.value) })} placeholder={String(ls.fontSizePx)} className={input} />
                </Field>
                <Field label="줄 간격">
                  <input type="number" step="0.1" value={letterStyle.lineHeight ?? ""} onChange={(e) => setLS({ lineHeight: num(e.target.value) })} placeholder={String(ls.lineHeight)} className={input} />
                </Field>
                <Field label="정렬">
                  <select value={ls.align} onChange={(e) => setLS({ align: e.target.value as LetterStyle["align"] })} className={input}>
                    <option value="left">왼쪽</option>
                    <option value="center">가운데</option>
                    <option value="right">오른쪽</option>
                  </select>
                </Field>
                <Field label="안쪽 여백(px)">
                  <input type="number" value={letterStyle.paddingPx ?? ""} onChange={(e) => setLS({ paddingPx: num(e.target.value) })} placeholder={String(ls.paddingPx)} className={input} />
                </Field>
                <Field label="편지지 최대 너비(px)">
                  <input type="number" value={letterStyle.maxWidthPx ?? ""} onChange={(e) => setLS({ maxWidthPx: num(e.target.value) })} placeholder={String(ls.maxWidthPx)} className={input} />
                </Field>
                <Field label="서명(맨 아래 오른쪽)">
                  <input value={letterStyle.signature ?? ""} onChange={(e) => setLS({ signature: e.target.value || undefined })} placeholder="— 사일로 드림" className={input} />
                </Field>
                <label className="flex items-end gap-2 pb-1 text-sm text-gray-700">
                  <input type="checkbox" checked={ls.seal} onChange={(e) => setLS({ seal: e.target.checked })} />
                  붉은 봉인 스탬프
                </label>
              </div>
              <div className="mt-4">
                <UploadField label="편지 배경 이미지" value={letterStyle.bgImageUrl ?? ""} onChange={(v) => setLS({ bgImageUrl: v || undefined })} accept="image/*" hint="편지지 뒤에 깔리는 이미지예요(종이 질감, 꽃무늬 등)." />
                {letterStyle.bgImageUrl && (
                  <div className="mt-2 max-w-xs">
                    <Field label={`글 가독성용 종이색 덮개 진하기 ${ls.bgOverlayPct}%`}>
                      <input type="range" min={0} max={100} value={ls.bgOverlayPct} onChange={(e) => setLS({ bgOverlayPct: Number(e.target.value) })} className="w-full" />
                    </Field>
                  </div>
                )}
              </div>
              <p className="mb-2 mt-5 text-xs font-medium text-gray-500">미리보기</p>
              <div className="rounded-md bg-gray-100 p-4">
                <LetterView key={JSON.stringify(letterStyle)} html={letterPreviewHtml} style={letterStyle} tierName={tier.name} />
              </div>
            </div>
          </div>

          <div className={tab === "mission" ? "" : "hidden"}>
            <p className="mb-2 text-sm text-gray-600">가입 미션 질문 (없으면 &lsquo;가입&rsquo;이 바로 다음 단계로 넘어가요)</p>
            <ul className="space-y-2">
              {questions.map((q, i) => (
                <li key={q.id} className="flex flex-wrap items-center gap-2">
                  <input
                    value={q.text}
                    onChange={(e) => setQuestions((prev) => prev.map((p, j) => (j === i ? { ...p, text: e.target.value } : p)))}
                    placeholder="질문"
                    className="min-w-[12rem] flex-1 rounded border border-gray-300 px-2 py-1 text-sm"
                  />
                  <select
                    value={q.type}
                    onChange={(e) => setQuestions((prev) => prev.map((p, j) => (j === i ? { ...p, type: e.target.value as "text" | "photo" } : p)))}
                    className="rounded border border-gray-300 px-1 py-1 text-sm"
                  >
                    <option value="text">글 답변</option>
                    <option value="photo">사진 + 글</option>
                  </select>
                  <button type="button" onClick={() => setQuestions((prev) => prev.filter((_, j) => j !== i))} className="text-xs text-red-600">
                    삭제
                  </button>
                </li>
              ))}
            </ul>
            <button type="button" onClick={() => setQuestions((prev) => [...prev, { id: newId(), text: "", type: "text" }])} className="mt-2 rounded border border-gray-300 px-2 py-1 text-xs hover:bg-gray-50">
              + 질문 추가
            </button>
          </div>
        </div>

        <div className="flex items-center justify-between gap-3 border-t border-gray-200 px-5 py-3">
          <p className="text-xs text-red-600">{error}</p>
          <div className="flex gap-2">
            <button type="button" onClick={onClose} className="rounded border border-gray-300 px-4 py-2 text-sm">
              취소
            </button>
            <button type="button" onClick={save} disabled={saving} className="rounded bg-gray-900 px-5 py-2 text-sm font-semibold text-white disabled:opacity-50">
              {saving ? "저장 중..." : "저장"}
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}
