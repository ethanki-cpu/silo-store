"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { useAuth } from "@/lib/AuthProvider";
import { supabase } from "@/lib/supabaseClient";
import { uploadFileToR2 } from "@/lib/r2Upload";
import { TierBenefitList } from "@/components/membership/TierBenefitList";
import type { TierBenefit } from "@/lib/tierAccess";

// HOTFIX-161.9(사용자 지시 — PROJECT_VISION.md "멤버십 수익화 마스터플랜" 캐러셀 UI 스펙):
// 게임의 캐릭터 선택창처럼 등급을 스와이프로 고르고 → 애니메이션(대표가 나중에 전달할 영상,
// 지금은 자리만) 아래 등급 이름 버튼 → 소개와 편지 → '가입' → 미션 창. 카피는 코드에 하나도
// 넣지 않는다 — 소개/편지/애니메이션/미션 질문은 전부 membership_tiers 컬럼이고 관리자가 이
// 화면에서 바로 수정한다(RLS의 membership_tiers_admin_write 정책으로 관리자만 저장됨).
type MissionQuestion = { id: string; text: string; type: "text" | "photo" };

type TierContent = {
  rank: number;
  name: string;
  price: number;
  is_lifetime: boolean;
  image_url: string | null;
  animation_url: string | null;
  intro_text: string | null;
  letter_text: string | null;
  mission_questions: MissionQuestion[] | null;
};

type Answer = { text: string; photoUrl: string | null };

const isVideoUrl = (url: string) => /\.(mp4|webm|mov|m4v)(\?|$)/i.test(url);
const newId = () => `q-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;

function TierMedia({ tier, playVideo }: { tier: TierContent; playVideo: boolean }) {
  const src = tier.animation_url || tier.image_url;
  return (
    <div className="mx-auto aspect-[4/5] w-full max-w-sm overflow-hidden rounded-lg border border-gray-200 bg-gray-100">
      {src ? (
        isVideoUrl(src) ? (
          playVideo ? (
            <video src={src} autoPlay muted loop playsInline className="h-full w-full object-contain" />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-sm text-gray-400">{tier.name}</div>
          )
        ) : (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={src} alt={tier.name} className="h-full w-full object-contain" />
        )
      ) : (
        <div className="flex h-full w-full flex-col items-center justify-center gap-1 text-gray-400">
          <span className="text-lg font-semibold text-gray-500">{tier.name}</span>
          <span className="text-xs">캐릭터 애니메이션이 들어갈 자리</span>
        </div>
      )}
    </div>
  );
}

function TierContentEditor({ tier, onSaved, onClose }: { tier: TierContent; onSaved: (t: TierContent) => void; onClose: () => void }) {
  const [animationUrl, setAnimationUrl] = useState(tier.animation_url ?? "");
  const [intro, setIntro] = useState(tier.intro_text ?? "");
  const [letter, setLetter] = useState(tier.letter_text ?? "");
  const [questions, setQuestions] = useState<MissionQuestion[]>(tier.mission_questions ?? []);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function upload(file: File) {
    setUploading(true);
    setError(null);
    const { url, error: uploadError } = await uploadFileToR2(file);
    setUploading(false);
    if (uploadError || !url) {
      setError(uploadError ?? "업로드에 실패했어요.");
      return;
    }
    setAnimationUrl(url);
  }

  async function save() {
    setSaving(true);
    setError(null);
    const payload = {
      animation_url: animationUrl.trim() || null,
      intro_text: intro.trim() || null,
      letter_text: letter.trim() || null,
      mission_questions: questions.filter((q) => q.text.trim()).map((q) => ({ ...q, text: q.text.trim() })),
    };
    const { error: updateError } = await supabase.from("membership_tiers").update(payload).eq("rank", tier.rank);
    setSaving(false);
    if (updateError) {
      setError(updateError.message);
      return;
    }
    onSaved({ ...tier, ...payload });
    onClose();
  }

  return (
    <div className="mt-4 space-y-3 rounded-md border border-blue-200 bg-blue-50/40 p-4 text-sm">
      <p className="font-semibold text-blue-800">{tier.name} 내용 편집(관리자)</p>
      <label className="block">
        <span className="mb-1 block text-gray-600">애니메이션/영상 URL (mp4·webm 또는 이미지 — 비우면 대표 사진, 그것도 없으면 빈 자리)</span>
        <input value={animationUrl} onChange={(e) => setAnimationUrl(e.target.value)} className="w-full rounded border border-gray-300 px-2 py-1" />
        <input
          type="file"
          accept="video/*,image/*"
          disabled={uploading}
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) upload(f);
            e.target.value = "";
          }}
          className="mt-1 w-full text-xs"
        />
        {uploading && <span className="text-xs text-gray-500">업로드 중...</span>}
      </label>
      <label className="block">
        <span className="mb-1 block text-gray-600">소개</span>
        <textarea value={intro} onChange={(e) => setIntro(e.target.value)} rows={5} className="w-full rounded border border-gray-300 px-2 py-1" />
      </label>
      <label className="block">
        <span className="mb-1 block text-gray-600">편지 (줄바꿈 그대로 표시돼요)</span>
        <textarea value={letter} onChange={(e) => setLetter(e.target.value)} rows={12} className="w-full rounded border border-gray-300 px-2 py-1" />
      </label>
      <div>
        <span className="mb-1 block text-gray-600">가입 미션 질문 (없으면 &lsquo;가입&rsquo;이 바로 다음 단계로 넘어가요)</span>
        <ul className="space-y-2">
          {questions.map((q, i) => (
            <li key={q.id} className="flex flex-wrap items-center gap-2">
              <input
                value={q.text}
                onChange={(e) => setQuestions((prev) => prev.map((p, j) => (j === i ? { ...p, text: e.target.value } : p)))}
                placeholder="질문"
                className="min-w-[12rem] flex-1 rounded border border-gray-300 px-2 py-1"
              />
              <select
                value={q.type}
                onChange={(e) => setQuestions((prev) => prev.map((p, j) => (j === i ? { ...p, type: e.target.value as "text" | "photo" } : p)))}
                className="rounded border border-gray-300 px-1 py-1"
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
        <button
          type="button"
          onClick={() => setQuestions((prev) => [...prev, { id: newId(), text: "", type: "text" }])}
          className="mt-2 rounded border border-gray-300 px-2 py-1 text-xs hover:bg-white"
        >
          + 질문 추가
        </button>
      </div>
      {error && <p className="text-xs text-red-600">{error}</p>}
      <div className="flex gap-2">
        <button type="button" onClick={save} disabled={saving || uploading} className="rounded bg-gray-900 px-3 py-1.5 text-white disabled:opacity-50">
          {saving ? "저장 중..." : "저장"}
        </button>
        <button type="button" onClick={onClose} className="rounded border border-gray-300 px-3 py-1.5">
          취소
        </button>
      </div>
    </div>
  );
}

function MissionModal({ tier, onClose, onDone }: { tier: TierContent; onClose: () => void; onDone: () => void }) {
  const { session, member } = useAuth();
  const questions = tier.mission_questions ?? [];
  const draftKey = `silo-mission-draft-${tier.rank}`;
  const [answers, setAnswers] = useState<Record<string, Answer>>({});
  const [uploadingId, setUploadingId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      let base: Record<string, Answer> = {};
      try {
        const raw = localStorage.getItem(draftKey);
        if (raw) base = JSON.parse(raw) as Record<string, Answer>;
      } catch {
        /* 임시저장 없이도 정상 동작 */
      }
      if (member?.id) {
        const { data } = await supabase
          .from("membership_mission_answers")
          .select("question_id, answer_text, answer_photo_url")
          .eq("member_id", member.id)
          .eq("tier_rank", tier.rank);
        for (const row of (data ?? []) as { question_id: string; answer_text: string | null; answer_photo_url: string | null }[]) {
          base[row.question_id] = { text: row.answer_text ?? "", photoUrl: row.answer_photo_url };
        }
      }
      if (!cancelled) setAnswers(base);
    })();
    return () => {
      cancelled = true;
    };
  }, [draftKey, member?.id, tier.rank]);

  function setAnswer(id: string, patch: Partial<Answer>) {
    setAnswers((prev) => {
      const next = { ...prev, [id]: { ...(prev[id] ?? { text: "", photoUrl: null }), ...patch } };
      try {
        localStorage.setItem(draftKey, JSON.stringify(next));
      } catch {
        /* 무시 */
      }
      return next;
    });
  }

  async function uploadPhoto(id: string, file: File) {
    setUploadingId(id);
    const { url, error: uploadError } = await uploadFileToR2(file);
    setUploadingId(null);
    if (uploadError || !url) {
      setError(uploadError ?? "사진 업로드에 실패했어요.");
      return;
    }
    setAnswer(id, { photoUrl: url });
  }

  async function submit() {
    if (!member?.id) return;
    const rows = questions.map((q) => ({
      member_id: member.id,
      tier_rank: tier.rank,
      question_id: q.id,
      question_text: q.text,
      answer_text: answers[q.id]?.text?.trim() || null,
      answer_photo_url: answers[q.id]?.photoUrl ?? null,
      updated_at: new Date().toISOString(),
    }));
    setSubmitting(true);
    setError(null);
    const { error: upsertError } = await supabase.from("membership_mission_answers").upsert(rows, { onConflict: "member_id,tier_rank,question_id" });
    setSubmitting(false);
    if (upsertError) {
      setError(upsertError.message);
      return;
    }
    try {
      localStorage.removeItem(draftKey);
    } catch {
      /* 무시 */
    }
    setDone(true);
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4" role="dialog" aria-modal="true" aria-label={`${tier.name} 미션`}>
      <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-lg bg-white p-5 shadow-xl">
        <div className="flex items-start justify-between">
          <h3 className="text-lg font-semibold">{tier.name} 미션</h3>
          <button type="button" onClick={onClose} aria-label="닫기" className="text-gray-400 hover:text-gray-700">
            ✕
          </button>
        </div>

        {done ? (
          <div className="mt-4 space-y-3 text-sm">
            <p className="text-green-700">미션 답변이 저장됐어요. 마이페이지 &gt; 멤버십 미션에서 언제든 다시 볼 수 있어요.</p>
            <button
              type="button"
              onClick={() => {
                onDone();
                onClose();
              }}
              className="rounded bg-gray-900 px-4 py-2 text-white"
            >
              {tier.price > 0 ? "결제 단계로 이동" : "확인"}
            </button>
          </div>
        ) : (
          <div className="mt-4 space-y-4 text-sm">
            {!session && (
              <p className="rounded border border-amber-200 bg-amber-50 p-2 text-xs text-amber-800">
                답변을 제출하려면 로그인이 필요해요 —{" "}
                <Link href="/signup" className="underline">
                  회원가입
                </Link>{" "}
                또는{" "}
                <Link href="/login" className="underline">
                  로그인
                </Link>
                . 지금 쓴 답변은 이 브라우저에 임시 저장돼요.
              </p>
            )}
            {questions.map((q) => (
              <div key={q.id}>
                <p className="mb-1 font-medium text-gray-800">{q.text}</p>
                {q.type === "photo" && (
                  <div className="mb-2">
                    {answers[q.id]?.photoUrl && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={answers[q.id]!.photoUrl!} alt="첨부 사진" className="mb-1 h-32 rounded border border-gray-200 object-cover" />
                    )}
                    <input
                      type="file"
                      accept="image/*"
                      disabled={!session || uploadingId === q.id}
                      onChange={(e) => {
                        const f = e.target.files?.[0];
                        if (f) uploadPhoto(q.id, f);
                        e.target.value = "";
                      }}
                      className="w-full text-xs"
                    />
                    {uploadingId === q.id && <span className="text-xs text-gray-500">업로드 중...</span>}
                  </div>
                )}
                <textarea
                  value={answers[q.id]?.text ?? ""}
                  onChange={(e) => setAnswer(q.id, { text: e.target.value })}
                  rows={3}
                  className="w-full rounded border border-gray-300 px-2 py-1"
                />
              </div>
            ))}
            {error && <p className="text-xs text-red-600">{error}</p>}
            <div className="flex gap-2">
              <button type="button" onClick={submit} disabled={!session || !member?.id || submitting} className="rounded bg-gray-900 px-4 py-2 text-white disabled:opacity-50">
                {submitting ? "저장 중..." : "제출하고 계속"}
              </button>
              <button type="button" onClick={onClose} className="rounded border border-gray-300 px-4 py-2">
                닫기
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export function MembershipCarousel() {
  const { member } = useAuth();
  const isAdmin = !!member?.is_admin;
  const [tiers, setTiers] = useState<TierContent[] | null>(null);
  const [active, setActive] = useState(0);
  const [panelOpen, setPanelOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const [missionOpen, setMissionOpen] = useState(false);
  const touchStartX = useRef<number | null>(null);
  const [benefitsByRank, setBenefitsByRank] = useState<Record<number, TierBenefit[]>>({});

  useEffect(() => {
    fetch("/api/membership/plans")
      .then((r) => (r.ok ? r.json() : { plans: [] }))
      .then((j: { plans?: { rank: number; access: { benefits?: TierBenefit[] } }[] }) => {
        setBenefitsByRank(Object.fromEntries((j.plans ?? []).map((p) => [p.rank, p.access.benefits ?? []])));
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    let cancelled = false;
    supabase
      .from("membership_tiers")
      .select("rank, name, price, is_lifetime, image_url, animation_url, intro_text, letter_text, mission_questions")
      .order("rank", { ascending: true })
      .then(({ data }) => {
        if (!cancelled) setTiers((data ?? []) as TierContent[]);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const go = useCallback(
    (delta: number) => {
      if (!tiers || tiers.length === 0) return;
      setActive((cur) => Math.min(tiers.length - 1, Math.max(0, cur + delta)));
      setPanelOpen(false);
      setEditing(false);
    },
    [tiers],
  );

  if (!tiers) return <p className="py-10 text-center text-sm text-gray-400">멤버십을 불러오는 중...</p>;
  if (tiers.length === 0) return null;

  const tier = tiers[active];
  const questions = tier.mission_questions ?? [];
  const honorary = tier.rank >= 99 || tier.is_lifetime;

  function proceedToPayment() {
    if (tier.price > 0) document.getElementById("membership-plans")?.scrollIntoView({ behavior: "smooth" });
  }

  function handleJoin() {
    if (questions.length === 0) {
      proceedToPayment();
      if (tier.price === 0 && !member) window.location.assign("/signup");
      return;
    }
    setMissionOpen(true);
  }

  return (
    <section
      className="mb-10"
      aria-roledescription="carousel"
      aria-label="멤버십 등급 선택"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "ArrowLeft") go(-1);
        if (e.key === "ArrowRight") go(1);
      }}
    >
      <div
        className="relative overflow-hidden"
        onTouchStart={(e) => {
          touchStartX.current = e.touches[0].clientX;
        }}
        onTouchEnd={(e) => {
          if (touchStartX.current == null) return;
          const dx = e.changedTouches[0].clientX - touchStartX.current;
          touchStartX.current = null;
          if (Math.abs(dx) > 50) go(dx < 0 ? 1 : -1);
        }}
      >
        <div className="flex transition-transform duration-500 ease-out" style={{ transform: `translateX(-${active * 100}%)` }}>
          {tiers.map((t, i) => (
            <div key={t.rank} className="min-w-full px-10" aria-hidden={i !== active}>
              {Math.abs(i - active) <= 1 ? <TierMedia tier={t} playVideo={i === active} /> : <div className="aspect-[4/5]" />}
            </div>
          ))}
        </div>
        <button
          type="button"
          onClick={() => go(-1)}
          disabled={active === 0}
          aria-label="이전 등급"
          className="absolute left-0 top-1/2 -translate-y-1/2 rounded-full bg-white/80 px-2 py-3 text-xl shadow disabled:opacity-30"
        >
          ‹
        </button>
        <button
          type="button"
          onClick={() => go(1)}
          disabled={active === tiers.length - 1}
          aria-label="다음 등급"
          className="absolute right-0 top-1/2 -translate-y-1/2 rounded-full bg-white/80 px-2 py-3 text-xl shadow disabled:opacity-30"
        >
          ›
        </button>
      </div>

      <div className="mt-4 flex justify-center">
        <button
          type="button"
          onClick={() => setPanelOpen((o) => !o)}
          aria-expanded={panelOpen}
          className={`rounded-full border px-6 py-2 text-base font-semibold ${
            panelOpen ? "border-gray-900 bg-gray-900 text-white" : "border-gray-400 bg-white text-gray-900 hover:bg-gray-50"
          }`}
        >
          {tier.name}
        </button>
      </div>

      <div className="mt-3 flex justify-center gap-1.5" role="tablist" aria-label="등급 목록">
        {tiers.map((t, i) => (
          <button
            key={t.rank}
            type="button"
            role="tab"
            aria-selected={i === active}
            aria-label={t.name}
            onClick={() => {
              setActive(i);
              setPanelOpen(false);
              setEditing(false);
            }}
            className={`h-2 rounded-full transition-all ${i === active ? "w-6 bg-gray-900" : "w-2 bg-gray-300"}`}
          />
        ))}
      </div>

      {panelOpen && (
        <div
          className="mx-auto mt-5 max-w-2xl rounded-lg border border-gray-200 bg-white p-5"
          style={{ animation: "silo-panel-up 0.4s ease-out" }}
        >
          <style>{"@keyframes silo-panel-up{from{opacity:0;transform:translateY(24px)}to{opacity:1;transform:translateY(0)}}"}</style>
          {isAdmin && !editing && (
            <div className="mb-3 flex justify-end">
              <button type="button" onClick={() => setEditing(true)} className="rounded border border-blue-300 px-2 py-1 text-xs text-blue-700 hover:bg-blue-50">
                내용 편집(관리자)
              </button>
            </div>
          )}
          {editing ? (
            <TierContentEditor
              tier={tier}
              onClose={() => setEditing(false)}
              onSaved={(updated) => setTiers((prev) => prev?.map((t) => (t.rank === updated.rank ? updated : t)) ?? prev)}
            />
          ) : (
            <>
              {tier.intro_text ? (
                <p className="whitespace-pre-line text-sm leading-7 text-gray-700">{tier.intro_text}</p>
              ) : (
                <p className="text-sm text-gray-400">아직 소개가 준비되지 않았어요.</p>
              )}
              {tier.letter_text && (
                <div className="mt-5 whitespace-pre-line rounded-md border border-amber-100 bg-amber-50/50 p-5 text-sm leading-8 text-gray-800">{tier.letter_text}</div>
              )}
              <TierBenefitList benefits={benefitsByRank[tier.rank] ?? []} heading="이 멤버십으로 새로 열리는 세계" />
              <div className="mt-5 flex flex-col items-center gap-2">
                {honorary ? (
                  <p className="text-xs text-gray-500">공연·전시에 참여한 예술가에게 자동으로 부여되는 명예 등급이에요.</p>
                ) : (
                  <button type="button" onClick={handleJoin} className="rounded-md bg-gray-900 px-8 py-2.5 text-sm font-semibold text-white hover:bg-gray-700">
                    가입
                  </button>
                )}
              </div>
            </>
          )}
        </div>
      )}

      {missionOpen && <MissionModal tier={tier} onClose={() => setMissionOpen(false)} onDone={proceedToPayment} />}
    </section>
  );
}
