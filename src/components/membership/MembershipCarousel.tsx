"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/lib/AuthProvider";
import { supabase } from "@/lib/supabaseClient";
import { uploadFileToR2 } from "@/lib/r2Upload";
import { useMembershipBilling } from "@/lib/useMembershipBilling";
import type { BenefitGroup, TierCategoryAccess } from "@/lib/tierCategoryAccess";
import { AnimatePresence, motion } from "framer-motion";
import { TierBackdrop } from "@/components/membership/TierBackdrop";
import { MagneticButton } from "@/components/membership/MagneticButton";
import { setActiveMembershipRank } from "@/lib/membershipActiveStore";
import { TIER_PALETTE, paletteKeyForRank } from "@/lib/tierPalette";
import { TierStory } from "@/components/membership/TierStory";
import { TierEditor } from "@/components/membership/TierEditor";
import { DEFAULT_GROUP_COPY, TIER_SELECT, aspectCss, copyForGroup, copyForRoot, isVideoUrl, parseGroupCopy, type GroupCopy, type TierContent, type TierMediaSettings } from "@/lib/tierContent";
import type { ConditionRow } from "@/lib/tierAccess";

// HOTFIX-161.9(사용자 지시 — PROJECT_VISION.md "멤버십 수익화 마스터플랜" 캐러셀 UI 스펙):
// 게임의 캐릭터 선택창처럼 등급을 스와이프로 고르고 → 이미지/애니메이션 → 소개와 편지 → '가입' → 미션 창.
// 카피는 코드에 하나도 넣지 않는다 — 소개/편지/애니메이션/미션 질문은 전부 membership_tiers 컬럼이고
// 관리자가 이 화면에서 바로 수정한다(RLS의 membership_tiers_admin_write 정책으로 관리자만 저장됨).
type Answer = { text: string; photoUrl: string | null };

type MediaView = { widthPx: number; aspect: string; fit: "contain" | "cover"; radiusPx: number; border: boolean; background: string };

function TierMedia({ tier, playVideo, view, fill = false }: { tier: TierContent; playVideo: boolean; view: MediaView; fill?: boolean }) {
  const src = tier.animation_url || tier.image_url;
  const fit = view.fit === "cover" ? "object-cover" : "object-contain";
  return (
    <div
      className={`mx-auto max-w-full overflow-hidden ${fill ? "h-full w-full" : ""} ${view.border && !fill ? "border border-gray-200" : ""} ${view.background ? "" : "bg-gray-100"}`}
      style={fill ? { background: view.background || undefined } : { width: view.widthPx, aspectRatio: aspectCss(view.aspect), borderRadius: view.radiusPx, background: view.background || undefined }}
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
  // HOTFIX-162.14: 카드 안 문구(사일로의 결에 맞춘 말투) — 전부 위젯 설정에서 고친다. {name}/{n}은 자리표시자.
  firstTitle: string;
  newTitle: string;
  perksTitle: string;
  fullListLabel: string;
  notesTitle: string;
  storyButton: string;
  groupCopy: string;
  joinLabel: string;
};

export const MEMBERSHIP_CAROUSEL_DEFAULTS: MembershipCarouselOptions = {
  heading: "당신은 어떤 ‘사일로의 사람’이 되고 싶으세요?",
  subtitle: "첫눈처럼 찾아온 사람부터 예술가의 곁을 지키는 후원자까지. 옆으로 넘기며 지금의 나에게 맞는 자리를 찾아보세요. 새로운 자리는 앞선 자리의 문을 모두 품고 있어요.",
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
  commonNotes: "사일로 상점에서 물건을 만날 때마다 포인트가 쌓여요",
  firstTitle: "이 자리에서 열리는 세계",
  newTitle: "이 자리에서 새롭게 열리는 문",
  perksTitle: "이 자리에서만 받는 특별한 대접",
  fullListLabel: "지금까지 열린 {n}개의 문 모두 펼쳐보기",
  notesTitle: "마음 편히 알아두세요 · 요금과 이용 방식",
  storyButton: "✉ {name}의 이야기와 편지 읽기",
  groupCopy: DEFAULT_GROUP_COPY,
  joinLabel: "초대장 열어보기",
};

type Plan = {
  rank: number;
  name: string;
  price: number;
  free?: boolean;
  honorary?: boolean;
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

function GroupedChips({ groups, highlightNew, copy }: { groups: BenefitGroup[]; highlightNew: boolean; copy: GroupCopy }) {
  const roots: { root: string; groups: BenefitGroup[] }[] = [];
  for (const g of groups) {
    const last = roots[roots.length - 1];
    if (last && last.root === g.root) last.groups.push(g);
    else roots.push({ root: g.root, groups: [g] });
  }
  return (
    <div className="space-y-6">
      {roots.map((r) => {
        const rootCopy = copyForRoot(copy, r.root);
        return (
          <div key={r.root}>
            <p className="text-sm font-bold tracking-wide text-gray-900">{r.root}</p>
            {rootCopy && <p className="mt-1 text-xs italic leading-5 text-gray-500">{rootCopy}</p>}
            <div className="mt-2 space-y-4 border-l-2 border-gray-100 pl-3">
              {r.groups.map((g) => {
                const line = copyForGroup(copy, g.title);
                return (
                  <div key={`${g.root}/${g.title}`}>
                    {g.title !== r.root && (
                      <p className="text-xs font-semibold text-gray-700">
                        {g.title} <span className="font-normal text-gray-400">{g.items.length}</span>
                      </p>
                    )}
                    {line && <p className="mb-1.5 mt-0.5 text-xs leading-5 text-gray-500">{line}</p>}
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
                );
              })}
            </div>
          </div>
        );
      })}
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
  if (!plan) return { label: "문을 열 준비 중이에요", disabled: true };
  if (plan.free) {
    if (!billing.session) return { label: "무료로 사일로의 사람이 되기", disabled: false };
    return { label: billing.currentRank === 0 ? "지금 머무는 자리예요" : "누구나 시작하는 기본 자리예요", disabled: true };
  }
  const isCurrent = billing.entitled && billing.sub?.tier_rank === plan.rank;
  if (!plan.available || !billing.cardAvailable) return { label: "문을 열 준비 중이에요", disabled: true };
  if (isCurrent) return { label: "지금 이 자리에 계세요", disabled: true };
  if (billing.entitled) return { label: "자리를 옮기는 기능을 준비 중이에요", disabled: true };
  if (billing.session && billing.currentRank >= plan.rank) return { label: "이미 더 깊은 곳에 계세요", disabled: true };
  return { label: `${plan.name}, 이 자리로 들어가기`, disabled: false };
}

export function resolveMediaView(tier: TierContent, opts: MembershipCarouselOptions): MediaView {
  const ms: TierMediaSettings = tier.media_settings ?? {};
  return {
    widthPx: ms.widthPx ?? opts.mediaWidthPx,
    aspect: ms.aspect ?? opts.mediaAspect,
    fit: ms.fit ?? opts.mediaFit,
    radiusPx: ms.radiusPx ?? opts.mediaRadiusPx,
    border: opts.mediaBorder,
    background: opts.mediaBackground,
  };
}

const ROMAN = ["Ⅰ", "Ⅱ", "Ⅲ", "Ⅳ", "Ⅴ", "Ⅵ", "Ⅶ"];

// EPIC-163: 타로 카드 덱 — 활성 카드는 가운데, 이웃 카드는 기울어져 뒤에 겹쳐 보이며 좌우 스와이프(드래그)/클릭으로 넘긴다.
function TarotDeck({
  tiers,
  active,
  opts,
  onSelect,
  onSwipe,
}: {
  tiers: TierContent[];
  active: number;
  opts: MembershipCarouselOptions;
  onSelect: (i: number) => void;
  onSwipe: (d: number) => void;
}) {
  const view = resolveMediaView(tiers[active], opts);
  const [aw, ah] = (view.aspect === "auto" ? "4:5" : view.aspect).split(":").map(Number);
  const w = view.widthPx;
  const h = Math.round(w * (ah / aw));
  return (
    <div className="relative mx-auto w-full select-none overflow-hidden" style={{ height: h + 64 }}>
      {tiers.map((t, i) => {
        const offset = i - active;
        const abs = Math.abs(offset);
        if (abs > 2) return null;
        const p = TIER_PALETTE[paletteKeyForRank(t.rank)];
        const isActive = offset === 0;
        const plate = p.depth === "#D4C9C1" ? "#5a4d44" : p.depth;
        return (
          <motion.div
            key={t.rank}
            className="absolute left-1/2 top-8 cursor-pointer"
            style={{ width: w, height: h, marginLeft: -w / 2, zIndex: 10 - abs, touchAction: "pan-y" }}
            initial={false}
            animate={{ x: offset * Math.min(w * 0.62, 190), scale: isActive ? 1 : 0.82, rotate: offset * 7, opacity: isActive ? 1 : abs === 1 ? 0.6 : 0.3, y: isActive ? 0 : 14 }}
            transition={{ type: "spring", stiffness: 240, damping: 26 }}
            drag={isActive ? "x" : false}
            dragConstraints={{ left: 0, right: 0 }}
            dragElastic={0.35}
            onDragEnd={(_, info) => {
              if (info.offset.x < -50 || info.velocity.x < -450) onSwipe(1);
              else if (info.offset.x > 50 || info.velocity.x > 450) onSwipe(-1);
            }}
            onClick={() => {
              if (!isActive) onSelect(i);
            }}
            whileHover={isActive ? { y: -6 } : undefined}
            aria-hidden={!isActive}
          >
            <div
              className="relative h-full w-full rounded-[20px] p-2"
              style={{
                background: `linear-gradient(160deg, ${p.base}, ${p.highlight})`,
                border: `2px solid ${p.highlight}`,
                boxShadow: `0 22px 44px ${p.depth}50, inset 0 0 0 1px ${p.depth}55${isActive ? `, 0 0 38px ${p.highlight}99` : ""}`,
              }}
            >
              <div className="relative h-full w-full overflow-hidden rounded-[14px]" style={{ border: `1px solid ${p.depth}88` }}>
                <TierMedia tier={t} playVideo={isActive} view={{ ...view, radiusPx: 0, border: false }} fill />
                <span className="absolute left-1/2 top-2 -translate-x-1/2 rounded-full px-3 py-0.5 text-[11px] font-semibold tracking-[0.25em]" style={{ background: `${p.base}dd`, color: plate }}>
                  ✦ {ROMAN[i] ?? i + 1} ✦
                </span>
                <div className="absolute inset-x-0 bottom-0 px-3 pb-3 pt-10 text-center" style={{ background: `linear-gradient(to top, ${plate}ee, transparent)` }}>
                  <span className="text-sm font-bold tracking-wide text-white drop-shadow">{t.name}</span>
                </div>
              </div>
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}

function TierCard({
  tier,
  plan,
  opts,
  billing,
  isAdmin,
  onJoin,
  onSaved,
  perks,
}: {
  perks: string[];
  tier: TierContent;
  plan: Plan | undefined;
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
  const copy = parseGroupCopy(opts.groupCopy);
  const join = joinState(plan, billing);
  const accent = opts.accentColor || undefined;

  const cats = plan?.categories ?? null;
  const shownAll = cats && opts.showCategories ? filterGroups(cats.groups, excluded, false) : [];
  const shownNew = cats && opts.showCategories ? filterGroups(cats.groups, excluded, true) : [];
  const totalCount = shownAll.reduce((n, g) => n + g.items.length, 0);
  const newCount = shownNew.reduce((n, g) => n + g.items.length, 0);
  const hasPrevious = totalCount > newCount;
  const notes = plan ? [...commonNotes, ...plan.access.activities, ...plan.access.perks] : [];
  const hasStory = !!(tier.intro_html || tier.letter_html || tier.intro_text || tier.letter_text);

  return (
    <article
      className={`mx-auto overflow-hidden p-5 shadow-sm ${opts.cardBackground ? "" : "bg-white"} ${opts.cardBorder ? "border border-gray-200" : ""}`}
      style={{ maxWidth: opts.cardMaxWidthPx, background: opts.cardBackground || undefined, borderRadius: opts.cardRadiusPx }}
    >
      <div className="flex flex-col items-center gap-4">
        <div className="w-full min-w-0 text-center">
          <h3 className="font-bold text-gray-900" style={{ fontSize: opts.nameSizePx }}>
            {tier.name}
          </h3>
          {opts.showPrice && (
            <p className="mt-1 text-base font-semibold text-gray-800">
              {honorary ? "명예 등급" : tier.price === 0 ? "무료" : `월 ${tier.price.toLocaleString()}원`}
              {!honorary && tier.price > 0 && <span className="ml-1 text-xs font-normal text-gray-400">부가세 포함</span>}
            </p>
          )}
          {opts.showSummary && plan && opts.showCategories && totalCount > 0 && (
            <p className="mt-2 text-xs leading-5 text-gray-500">
              <strong className="text-gray-800">{totalCount}개의 방</strong>이 열려 있어요
              {hasPrevious ? (
                newCount > 0 ? (
                  <>
                    {" "}
                    · 앞선 자리의 문을 모두 품고, <strong className="text-amber-700">새로 {newCount}개의 문</strong>이 더 열려요
                  </>
                ) : (
                  " · 앞선 자리의 문을 하나도 빠짐없이 품고 있어요"
                )
              ) : (
                ""
              )}
            </p>
          )}
        </div>
      </div>

      <div className="mt-6 space-y-6">
        {honorary && (
          <p className="rounded-md bg-amber-50/70 p-3 text-xs leading-5 text-gray-700">
            공연과 전시로 사일로의 무대를 채워 준 예술가에게, 사일로가 먼저 건네는 명예로운 자리예요. 신청하는 곳이 아니라, 초대받는 자리랍니다.
          </p>
        )}

        {perks.length > 0 && (
          <div className="rounded-md border border-amber-200 bg-amber-50/60 p-4">
            <p className="text-sm font-semibold text-gray-900">{opts.perksTitle}</p>
            <ul className="mt-2 space-y-1 text-sm leading-6 text-gray-800">
              {perks.map((t) => (
                <li key={t} className="flex gap-2">
                  <span aria-hidden className="text-amber-600">
                    ✦
                  </span>
                  <span>{t}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {opts.showCategories && shownNew.length > 0 && (
          <div>
            <p className="mb-3 text-sm font-semibold text-gray-900">{hasPrevious ? opts.newTitle : opts.firstTitle}</p>
            <GroupedChips groups={shownNew} highlightNew={false} copy={copy} />
          </div>
        )}
        {opts.showCategories && shownNew.length === 0 && hasPrevious && (
          <p className="rounded-md bg-gray-50 p-3 text-xs leading-5 text-gray-600">앞선 자리의 모든 방을 그대로 품고 있어요. 이 자리만의 이야기는 위의 특별한 대접에 담겨 있어요.</p>
        )}
        {opts.showCategories && opts.showFullList && hasPrevious && (
          <details className="rounded-md border border-gray-200 p-3">
            <summary className="cursor-pointer text-xs font-medium text-gray-600">{opts.fullListLabel.replace("{n}", String(totalCount))}</summary>
            <div className="mt-4">
              <GroupedChips groups={shownAll} highlightNew copy={copy} />
            </div>
          </details>
        )}

        {opts.showNotes && notes.length > 0 && (
          <div className="rounded-md bg-gray-50 p-4">
            <p className="text-xs font-semibold text-gray-700">{opts.notesTitle}</p>
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
      </div>

      <div className="mt-6 flex flex-col items-center gap-3">
        {!honorary && opts.showJoin && (
          <MagneticButton
            onClick={onJoin}
            disabled={join.disabled}
            style={join.disabled ? undefined : { background: accent || TIER_PALETTE[paletteKeyForRank(tier.rank)].depth }}
            className="rounded-full bg-gray-900 px-10 py-3.5 text-sm font-semibold tracking-wide text-white shadow-lg hover:opacity-95 disabled:bg-gray-300 disabled:text-gray-600 disabled:shadow-none"
          >
            {join.disabled ? join.label : opts.joinLabel}
          </MagneticButton>
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
                {panelOpen ? "편지 접기" : opts.storyButton.replace("{name}", tier.name)}
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
          {!honorary && opts.showJoin && (
            <div className="mt-8 flex flex-col items-center gap-2 border-t border-black/5 pt-6">
              <p className="text-xs text-gray-500">편지를 다 읽으셨다면, 이제 초대장을 열어 볼 차례예요.</p>
              <MagneticButton
                onClick={onJoin}
                disabled={join.disabled}
                style={join.disabled ? undefined : { background: accent || TIER_PALETTE[paletteKeyForRank(tier.rank)].depth }}
                className="rounded-full bg-gray-900 px-10 py-3.5 text-sm font-semibold tracking-wide text-white shadow-lg hover:opacity-95 disabled:bg-gray-300 disabled:text-gray-600 disabled:shadow-none"
              >
                {join.disabled ? join.label : opts.joinLabel}
              </MagneticButton>
            </div>
          )}
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
  const [conditionRows, setConditionRows] = useState<ConditionRow[]>([]);
  const [active, setActive] = useState(0);
  const [missionOpen, setMissionOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);

  useEffect(() => {
    fetch("/api/membership/plans")
      .then((r) => (r.ok ? r.json() : { plans: [] }))
      .then((j: { plans?: Plan[]; conditionRows?: ConditionRow[] }) => {
        setPlans(Object.fromEntries((j.plans ?? []).map((p) => [p.rank, p])));
        setConditionRows(j.conditionRows ?? []);
      })
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

  const select = useCallback((index: number) => setActive(index), []);

  const go = useCallback(
    (delta: number) => {
      if (!tiers || tiers.length === 0) return;
      select(Math.min(tiers.length - 1, Math.max(0, active + delta)));
    },
    [tiers, active, select],
  );

  const activeRank = tiers?.[active]?.rank;
  useEffect(() => {
    if (activeRank != null) setActiveMembershipRank(activeRank);
  }, [activeRank]);

  if (!tiers) return <p className="py-10 text-center text-sm text-gray-400">멤버십을 불러오는 중...</p>;
  if (tiers.length === 0) return null;

  const tier = tiers[active];
  const plan = plans[tier.rank] as Plan | undefined;

  // 이전 자리와 달라진 조건 중 "받는 것"만 뽑아 특별한 대접으로 보여준다(없어졌거나 같은 것은 제외).
  const perksFor = (rank: number): string[] => {
    const ranks = Object.keys(plans).map(Number).sort((a, b) => a - b);
    const prev = ranks[ranks.indexOf(rank) - 1];
    if (prev == null) return [];
    const out: string[] = [];
    for (const row of conditionRows) {
      const cur = row.cells[rank];
      if (cur === undefined || cur === false || cur === row.cells[prev]) continue;
      out.push(typeof cur === "string" ? `${row.label} — ${cur}` : row.label);
    }
    return out;
  };
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
      <TierBackdrop rank={tier.rank} />

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

      <TarotDeck tiers={tiers} active={active} opts={opts} onSelect={select} onSwipe={go} />

      <AnimatePresence mode="wait">
        <motion.div
          key={tier.rank}
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.35, ease: "easeInOut" }}
        >
          <TierCard
            tier={tier}
            plan={plans[tier.rank]}
            opts={opts}
            billing={billing}
            isAdmin={!!member?.is_admin}
            perks={perksFor(tier.rank)}
            onJoin={handleJoin}
            onSaved={(updated) => setTiers((prev) => prev?.map((x) => (x.rank === updated.rank ? updated : x)) ?? prev)}
          />
        </motion.div>
      </AnimatePresence>

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
