"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { useAuth } from "@/lib/AuthProvider";
import { supabase } from "@/lib/supabaseClient";
import { uploadFileToR2 } from "@/lib/r2Upload";
import { useMembershipBilling } from "@/lib/useMembershipBilling";
import type { BenefitGroup, TierCategoryAccess } from "@/lib/tierCategoryAccess";
import { TierStory } from "@/components/membership/TierStory";
import { TierEditor } from "@/components/membership/TierEditor";
import { TIER_SELECT, aspectCss, isVideoUrl, type TierContent, type TierMediaSettings } from "@/lib/tierContent";

// HOTFIX-161.9(사용자 지시 — PROJECT_VISION.md "멤버십 수익화 마스터플랜" 캐러셀 UI 스펙):
// 게임의 캐릭터 선택창처럼 등급을 스와이프로 고르고 → 이미지/애니메이션 → 소개와 편지 → '가입' → 미션 창.
// 카피는 코드에 하나도 넣지 않는다 — 소개/편지/애니메이션/미션 질문은 전부 membership_tiers 컬럼이고
// 관리자가 이 화면에서 바로 수정한다(RLS의 membership_tiers_admin_write 정책으로 관리자만 저장됨).
type Answer = { text: string; photoUrl: string | null };

type MediaView = { widthPx: number; aspect: string; fit: "contain" | "cover"; radiusPx: number; border: boolean; background: string };

function TierMedia({ tier, playVideo, view }: { tier: TierContent; playVideo: boolean; view: MediaView }) {
  const src = tier.animation_url || tier.image_url;
  const fit = view.fit === "cover" ? "object-cover" : "object-contain";
  return (
    <div
      className={`mx-auto max-w-full overflow-hidden ${view.border ? "border border-gray-200" : ""} ${view.background ? "" : "bg-gray-100"}`}
      style={{ width: view.widthPx, aspectRatio: aspectCss(view.aspect), borderRadius: view.radiusPx, background: view.background || undefined }}
    >
      {src ? (
        isVideoUrl(src) ? (
          playVideo ? (
            <video src={src} autoPlay muted loop playsInline className={`h-full w-full ${fit}`} />
          ) : (
            <div className="flex h-full min-h-24 w-full items-center justify-center text-sm text-gray-400">{tier.name}</div>
          )
        ) : (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={src} alt={tier.name} className={`${view.aspect === "auto" ? "h-auto" : "h-full"} w-full ${fit}`} style={{ maxWidth: "100%" }} />
        )
      ) : (
        <div className="flex h-full min-h-32 w-full flex-col items-center justify-center gap-1 text-gray-400">
          <span className="text-lg font-semibold text-gray-500">{tier.name}</span>
          <span className="text-xs">이미지·영상이 들어갈 자리</span>
        </div>
      )}
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

// HOTFIX-163.1(사용자 지시 — "Carousel 안에 멤버십 카드가 있어야 해") + HOTFIX-162.13(사용자 지시 — "carousel 안의 모든 걸
// 설정할 수 있게"): 슬라이드 한 장이 곧 멤버십 카드다. 카드의 배치·이미지 크기/비율·색·표시 요소는 전부 위젯 설정으로
// 조정하고, 등급별 이미지 표시는 등급 편집(media_settings)에서 개별로 덮어쓴다.
export type MembershipCarouselOptions = {
  heading: string;
  subtitle: string;
  layout: "stack" | "side";
  textAlign: "center" | "left";
  cardMaxWidthPx: number;
  cardBackground: string;
  cardRadiusPx: number;
  cardBorder: boolean;
  accentColor: string;
  nameSizePx: number;
  mediaWidthPx: number;
  mediaAspect: string;
  mediaFit: "contain" | "cover";
  mediaRadiusPx: number;
  mediaBorder: boolean;
  mediaBackground: string;
  showTabs: boolean;
  showPrice: boolean;
  showSummary: boolean;
  showJoin: boolean;
  showArrows: boolean;
  showCategories: boolean;
  showFullList: boolean;
  showNotes: boolean;
  showLetter: boolean;
  excludeCategories: string;
  commonNotes: string;
};

export const MEMBERSHIP_CAROUSEL_DEFAULTS: MembershipCarouselOptions = {
  heading: "멤버십 혜택 한눈에 보기",
  subtitle: "옆으로 넘기며 등급마다 열리는 세계를 비교해 보세요. 높은 등급은 낮은 등급의 혜택을 모두 포함해요.",
  layout: "stack",
  textAlign: "center",
  cardMaxWidthPx: 672,
  cardBackground: "",
  cardRadiusPx: 12,
  cardBorder: true,
  accentColor: "",
  nameSizePx: 26,
  mediaWidthPx: 260,
  mediaAspect: "4:5",
  mediaFit: "contain",
  mediaRadiusPx: 10,
  mediaBorder: true,
  mediaBackground: "",
  showTabs: true,
  showPrice: true,
  showSummary: true,
  showJoin: true,
  showArrows: true,
  showCategories: true,
  showFullList: true,
  showNotes: true,
  showLetter: true,
  excludeCategories: "",
  commonNotes: "사일로 상점 물품 구매 시 포인트 적립",
};

type Plan = {
  rank: number;
  name: string;
  price: number;
  free?: boolean;
  available: boolean;
  access: { activities: string[]; perks: string[] };
  categories: TierCategoryAccess | null;
};

function filterGroups(groups: BenefitGroup[], excluded: string[], onlyNew: boolean): BenefitGroup[] {
  return groups
    .filter((g) => !excluded.includes(g.title) && !excluded.includes(g.root))
    .map((g) => ({ ...g, items: onlyNew ? g.items.filter((i) => i.isNew) : g.items }))
    .filter((g) => g.items.length > 0);
}

function GroupedChips({ groups, highlightNew }: { groups: BenefitGroup[]; highlightNew: boolean }) {
  const roots: { root: string; groups: BenefitGroup[] }[] = [];
  for (const g of groups) {
    const last = roots[roots.length - 1];
    if (last && last.root === g.root) last.groups.push(g);
    else roots.push({ root: g.root, groups: [g] });
  }
  return (
    <div className="space-y-4">
      {roots.map((r) => (
        <div key={r.root}>
          <p className="text-xs font-bold tracking-wide text-gray-900">{r.root}</p>
          <div className="mt-1.5 space-y-2.5 border-l-2 border-gray-100 pl-3">
            {r.groups.map((g) => (
              <div key={`${g.root}/${g.title}`}>
                {g.title !== r.root && (
                  <p className="mb-1 text-[11px] font-semibold text-gray-500">
                    {g.title} <span className="font-normal text-gray-400">{g.items.length}</span>
                  </p>
                )}
                <ul className="flex flex-wrap gap-1.5">
                  {g.items.map((it) => (
                    <li
                      key={it.name}
                      className={`rounded-full px-2.5 py-1 text-xs leading-4 ${
                        highlightNew && it.isNew ? "bg-amber-100 font-medium text-amber-900" : "bg-gray-100 text-gray-600"
                      }`}
                    >
                      {it.name}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function PayConfirmModal({
  tier,
  plan,
  loggedIn,
  busy,
  error,
  onPay,
  onClose,
}: {
  tier: TierContent;
  plan: Plan;
  loggedIn: boolean;
  busy: boolean;
  error: string | null;
  onPay: () => void;
  onClose: () => void;
}) {
  const [agreed, setAgreed] = useState(false);
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4" role="dialog" aria-modal="true" aria-label={`${tier.name} 가입`}>
      <div className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-lg bg-white p-5 shadow-xl">
        <div className="flex items-start justify-between">
          <h3 className="text-lg font-semibold">{tier.name} 가입</h3>
          <button type="button" onClick={onClose} aria-label="닫기" className="text-gray-400 hover:text-gray-700">
            ✕
          </button>
        </div>
        <p className="mt-2 text-sm text-gray-700">월 {plan.price.toLocaleString()}원 (부가세 포함) · 카드로 매월 자동 결제되고, 언제든 해지할 수 있어요.</p>
        <label className="mt-4 flex items-start gap-2 text-xs leading-5 text-gray-600">
          <input type="checkbox" checked={agreed} onChange={(e) => setAgreed(e.target.checked)} className="mt-1" />
          <span>
            멤버십은 매월 자동 결제되며, 결제 후 7일 이내라도 등급 혜택(전용 콘텐츠·할인·무료 이용권 등)을 이용하면 청약철회가 제한되거나 이용분이 공제될 수 있음을
            확인했고, <Link href="/refund-policy" className="underline">환불 및 구독 해지 안내</Link>와 <Link href="/terms" className="underline">이용약관</Link>에 동의합니다.
          </span>
        </label>
        {error && <p className="mt-3 text-xs text-red-600">{error}</p>}
        <div className="mt-4 flex gap-2">
          {loggedIn ? (
            <button type="button" onClick={onPay} disabled={!agreed || busy} className="rounded bg-gray-900 px-4 py-2 text-sm text-white disabled:opacity-50">
              {busy ? "결제 창으로 이동 중..." : "결제 창으로 이동"}
            </button>
          ) : (
            <Link href="/login" className={`rounded bg-gray-900 px-4 py-2 text-sm text-white ${agreed ? "" : "pointer-events-none opacity-50"}`}>
              로그인하고 결제 계속
            </Link>
          )}
          <button type="button" onClick={onClose} className="rounded border border-gray-300 px-4 py-2 text-sm">
            닫기
          </button>
        </div>
      </div>
    </div>
  );
}

type Billing = ReturnType<typeof useMembershipBilling>;

// 가입 버튼 상태 — 예전 결제 화면(MembershipPlansSection)에서 쓰던 규칙 그대로.
function joinState(plan: Plan | undefined, billing: Billing): { label: string; disabled: boolean } {
  if (!plan) return { label: "준비 중", disabled: true };
  if (plan.free) {
    if (!billing.session) return { label: "무료로 시작하기", disabled: false };
    return { label: billing.currentRank === 0 ? "현재 이용 중인 등급이에요" : "기본(무료) 등급이에요", disabled: true };
  }
  const isCurrent = billing.entitled && billing.sub?.tier_rank === plan.rank;
  if (!plan.available || !billing.cardAvailable) return { label: "결제 준비 중", disabled: true };
  if (isCurrent) return { label: "구독 중", disabled: true };
  if (billing.entitled) return { label: "구독 중에는 등급 변경이 준비 중이에요", disabled: true };
  if (billing.session && billing.currentRank >= plan.rank) return { label: "현재 등급 이하", disabled: true };
  return { label: `${plan.name} 가입하기`, disabled: false };
}

function TierCard({
  tier,
  plan,
  nearActive,
  playVideo,
  opts,
  billing,
  isAdmin,
  onJoin,
  onSaved,
}: {
  tier: TierContent;
  plan: Plan | undefined;
  nearActive: boolean;
  playVideo: boolean;
  opts: MembershipCarouselOptions;
  billing: Billing;
  isAdmin: boolean;
  onJoin: () => void;
  onSaved: (t: TierContent) => void;
}) {
  const [panelOpen, setPanelOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const honorary = tier.rank >= 99 || tier.is_lifetime;
  const excluded = opts.excludeCategories.split(",").map((x) => x.trim()).filter(Boolean);
  const commonNotes = opts.commonNotes.split("\n").map((x) => x.trim()).filter(Boolean);
  const join = joinState(plan, billing);
  const accent = opts.accentColor || undefined;

  const ms: TierMediaSettings = tier.media_settings ?? {};
  const mediaView: MediaView = {
    widthPx: ms.widthPx ?? opts.mediaWidthPx,
    aspect: ms.aspect ?? opts.mediaAspect,
    fit: ms.fit ?? opts.mediaFit,
    radiusPx: ms.radiusPx ?? opts.mediaRadiusPx,
    border: opts.mediaBorder,
    background: opts.mediaBackground,
  };

  const cats = plan?.categories ?? null;
  const shownAll = cats && opts.showCategories ? filterGroups(cats.groups, excluded, false) : [];
  const shownNew = cats && opts.showCategories ? filterGroups(cats.groups, excluded, true) : [];
  const totalCount = shownAll.reduce((n, g) => n + g.items.length, 0);
  const newCount = shownNew.reduce((n, g) => n + g.items.length, 0);
  const hasPrevious = totalCount > newCount;
  const notes = plan ? [...commonNotes, ...plan.access.activities, ...plan.access.perks] : [];
  const center = opts.layout === "stack" && opts.textAlign === "center";
  const hasStory = !!(tier.intro_html || tier.letter_html || tier.intro_text || tier.letter_text);

  return (
    <article
      className={`mx-auto overflow-hidden p-5 shadow-sm ${opts.cardBackground ? "" : "bg-white"} ${opts.cardBorder ? "border border-gray-200" : ""}`}
      style={{ maxWidth: opts.cardMaxWidthPx, background: opts.cardBackground || undefined, borderRadius: opts.cardRadiusPx }}
    >
      <div className={opts.layout === "side" ? "flex items-center gap-4" : "flex flex-col items-center gap-4"}>
        <div className={opts.layout === "side" ? "shrink-0" : "w-full"} style={opts.layout === "side" ? { maxWidth: "45%" } : undefined}>
          {nearActive ? (
            <TierMedia tier={tier} playVideo={playVideo} view={mediaView} />
          ) : (
            <div style={{ aspectRatio: aspectCss(mediaView.aspect), width: mediaView.widthPx }} className="mx-auto max-w-full" />
          )}
        </div>
        <div className={`min-w-0 ${opts.layout === "side" ? "flex-1" : "w-full"} ${center ? "text-center" : "text-left"}`}>
          <h3 className="font-bold text-gray-900" style={{ fontSize: opts.nameSizePx }}>
            {tier.name}
          </h3>
          {opts.showPrice && (
            <p className="mt-1 text-base font-semibold text-gray-800">
              {honorary ? "명예 등급" : tier.price === 0 ? "무료" : `월 ${tier.price.toLocaleString()}원`}
              {!honorary && tier.price > 0 && <span className="ml-1 text-xs font-normal text-gray-400">부가세 포함</span>}
            </p>
          )}
          {opts.showSummary && plan && !honorary && opts.showCategories && totalCount > 0 && (
            <p className="mt-2 text-xs leading-5 text-gray-500">
              총 <strong className="text-gray-800">{totalCount}곳</strong> 이용 가능
              {hasPrevious ? (
                <>
                  {" "}
                  · 이전 등급 혜택을 모두 포함하고 <strong className="text-amber-700">새로 {newCount}곳</strong>이 열려요
                </>
              ) : (
                ""
              )}
            </p>
          )}
        </div>
      </div>

      <div className="mt-6">
        {honorary ? (
          <p className="rounded-md bg-gray-50 p-3 text-xs text-gray-600">공연·전시에 참여한 예술가에게 자동으로 부여되는 명예 등급이에요. 모든 등급의 혜택을 이용할 수 있어요.</p>
        ) : (
          <>
            {opts.showCategories && shownNew.length > 0 && (
              <div>
                <p className="mb-3 text-sm font-semibold text-gray-900">{hasPrevious ? "이 등급에서 새로 열리는 곳" : "이 등급으로 이용할 수 있는 곳"}</p>
                <GroupedChips groups={shownNew} highlightNew={false} />
              </div>
            )}
            {opts.showCategories && shownNew.length === 0 && hasPrevious && (
              <p className="rounded-md bg-gray-50 p-3 text-xs text-gray-600">열람할 수 있는 게시판·페이지 범위는 이전 등급과 같아요. 아래 이용 혜택이 더 좋아져요.</p>
            )}
            {opts.showCategories && opts.showFullList && hasPrevious && (
              <details className="mt-4 rounded-md border border-gray-200 p-3">
                <summary className="cursor-pointer text-xs font-medium text-gray-600">이 등급으로 이용할 수 있는 전체 {totalCount}곳 보기</summary>
                <div className="mt-3">
                  <GroupedChips groups={shownAll} highlightNew />
                </div>
              </details>
            )}

            {opts.showNotes && notes.length > 0 && (
              <div className="mt-5 rounded-md bg-gray-50 p-4">
                <p className="text-xs font-semibold text-gray-700">요금·이용 조건</p>
                <ul className="mt-2 space-y-1 text-xs leading-5 text-gray-700">
                  {notes.map((n) => (
                    <li key={n} className="flex gap-1.5">
                      <span aria-hidden>·</span>
                      <span>{n}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </>
        )}
      </div>

      <div className="mt-6 flex flex-col items-center gap-3">
        {!honorary && opts.showJoin && (
          <button
            type="button"
            onClick={onJoin}
            disabled={join.disabled}
            style={join.disabled ? undefined : { background: accent }}
            className="w-full max-w-xs rounded-md bg-gray-900 px-8 py-3 text-sm font-semibold text-white hover:opacity-90 disabled:bg-gray-300 disabled:text-gray-600"
          >
            {join.label}
          </button>
        )}
        {((opts.showLetter && hasStory) || isAdmin) && (
          <div className="flex flex-wrap items-center justify-center gap-2">
            {opts.showLetter && (hasStory || isAdmin) && (
              <button
                type="button"
                onClick={() => setPanelOpen((o) => !o)}
                aria-expanded={panelOpen}
                className="rounded-full border border-gray-400 px-5 py-2 text-sm text-gray-800 hover:bg-gray-50"
              >
                ✉ {panelOpen ? "소개·편지 닫기" : `${tier.name}의 소개와 편지 보기`}
              </button>
            )}
            {isAdmin && (
              <button type="button" onClick={() => setEditing(true)} className="rounded border border-blue-300 px-3 py-2 text-xs text-blue-700 hover:bg-blue-50">
                카드 편집(관리자)
              </button>
            )}
          </div>
        )}
      </div>

      {panelOpen && (
        <div className="mt-5" style={{ animation: "silo-panel-up 0.4s ease-out" }}>
          <style>{"@keyframes silo-panel-up{from{opacity:0;transform:translateY(24px)}to{opacity:1;transform:translateY(0)}}"}</style>
          <TierStory tier={tier} />
        </div>
      )}
      {editing && <TierEditor tier={tier} onClose={() => setEditing(false)} onSaved={onSaved} />}
    </article>
  );
}

export function MembershipCarousel({ options }: { options?: Partial<MembershipCarouselOptions> } = {}) {
  const opts = { ...MEMBERSHIP_CAROUSEL_DEFAULTS, ...options };
  const { member } = useAuth();
  const billing = useMembershipBilling();
  const [tiers, setTiers] = useState<TierContent[] | null>(null);
  const [plans, setPlans] = useState<Record<number, Plan>>({});
  const [active, setActive] = useState(0);
  const [settled, setSettled] = useState(true);
  const [missionOpen, setMissionOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const touchStartX = useRef<number | null>(null);
  const settleTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    fetch("/api/membership/plans")
      .then((r) => (r.ok ? r.json() : { plans: [] }))
      .then((j: { plans?: Plan[] }) => setPlans(Object.fromEntries((j.plans ?? []).map((p) => [p.rank, p]))))
      .catch(() => {});
  }, []);

  useEffect(() => {
    let cancelled = false;
    supabase
      .from("membership_tiers")
      .select(TIER_SELECT)
      .order("rank", { ascending: true })
      .then(({ data }) => {
        if (!cancelled) setTiers((data ?? []) as TierContent[]);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(
    () => () => {
      if (settleTimer.current) clearTimeout(settleTimer.current);
    },
    [],
  );

  // 슬라이드가 넘어가는 동안엔 모든 카드를 원래 높이로 두고(가로 이동이 자연스럽게), 끝나면 안 보이는 카드는
  // 높이를 접어서 캐러셀 전체 높이가 지금 카드에 맞게 줄어들게 한다.
  const select = useCallback((index: number) => {
    setActive(index);
    setSettled(false);
    if (settleTimer.current) clearTimeout(settleTimer.current);
    settleTimer.current = setTimeout(() => setSettled(true), 520);
  }, []);

  const go = useCallback(
    (delta: number) => {
      if (!tiers || tiers.length === 0) return;
      select(Math.min(tiers.length - 1, Math.max(0, active + delta)));
    },
    [tiers, active, select],
  );

  if (!tiers) return <p className="py-10 text-center text-sm text-gray-400">멤버십을 불러오는 중...</p>;
  if (tiers.length === 0) return null;

  const tier = tiers[active];
  const plan = plans[tier.rank] as Plan | undefined;
  const questions = tier.mission_questions ?? [];

  function afterMission() {
    if (plan && !plan.free) setConfirmOpen(true);
    else if (!member) window.location.assign("/signup");
  }

  function handleJoin() {
    if (questions.length > 0) setMissionOpen(true);
    else afterMission();
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
      {(opts.heading || opts.subtitle) && (
        <div className="mb-5 text-center">
          {opts.heading && <h2 className="text-xl font-semibold text-gray-900">{opts.heading}</h2>}
          {opts.subtitle && <p className="mt-1 text-sm text-gray-500">{opts.subtitle}</p>}
        </div>
      )}

      {opts.showTabs && (
        <div className="mb-4 flex justify-start gap-1.5 overflow-x-auto pb-1 sm:justify-center" role="tablist" aria-label="등급 목록">
          {tiers.map((t, i) => (
            <button
              key={t.rank}
              type="button"
              role="tab"
              aria-selected={i === active}
              onClick={() => select(i)}
              style={i === active && opts.accentColor ? { background: opts.accentColor, borderColor: opts.accentColor } : undefined}
              className={`shrink-0 rounded-full border px-3.5 py-1.5 text-sm transition-colors ${
                i === active ? "border-gray-900 bg-gray-900 font-semibold text-white" : "border-gray-300 bg-white text-gray-600 hover:bg-gray-50"
              }`}
            >
              {t.name}
            </button>
          ))}
        </div>
      )}

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
        <div className="flex items-start transition-transform duration-500 ease-out" style={{ transform: `translateX(-${active * 100}%)` }}>
          {tiers.map((t, i) => (
            <div key={t.rank} className={`min-w-full px-1 ${settled && i !== active ? "h-0 overflow-hidden" : ""}`} aria-hidden={i !== active}>
              <TierCard
                tier={t}
                plan={plans[t.rank]}
                nearActive={Math.abs(i - active) <= 1}
                playVideo={i === active}
                opts={opts}
                billing={billing}
                isAdmin={!!member?.is_admin}
                onJoin={handleJoin}
                onSaved={(updated) => setTiers((prev) => prev?.map((x) => (x.rank === updated.rank ? updated : x)) ?? prev)}
              />
            </div>
          ))}
        </div>
      </div>

      {opts.showArrows && (
        <div className="mt-4 flex items-center justify-center gap-3">
          <button type="button" onClick={() => go(-1)} disabled={active === 0} aria-label="이전 등급" className="rounded-full border border-gray-300 bg-white px-3 py-1 text-lg disabled:opacity-30">
            ‹
          </button>
          <span className="text-xs text-gray-500">
            {active + 1} / {tiers.length}
          </span>
          <button type="button" onClick={() => go(1)} disabled={active === tiers.length - 1} aria-label="다음 등급" className="rounded-full border border-gray-300 bg-white px-3 py-1 text-lg disabled:opacity-30">
            ›
          </button>
        </div>
      )}

      {missionOpen && <MissionModal tier={tier} onClose={() => setMissionOpen(false)} onDone={afterMission} />}
      {confirmOpen && plan && (
        <PayConfirmModal
          tier={tier}
          plan={plan}
          loggedIn={!!billing.session}
          busy={billing.busyRank === plan.rank}
          error={billing.error}
          onPay={() => billing.startCheckout(plan.rank)}
          onClose={() => setConfirmOpen(false)}
        />
      )}
    </section>
  );
}
