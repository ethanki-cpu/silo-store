"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/lib/AuthProvider";
import { SALON_BANK_ACCOUNT, STEPPAY_UI_ENABLED } from "@/lib/bankAccount";
import type { TierAccess } from "@/lib/tierAccess";

// EPIC-160: 유료 멤버십 4등급(Alice/Great Gatsby/Patron/Lautrec) 가입 화면. /membership 과 마이페이지 공용.
// 로그인하지 않아도 4개 등급의 가격·접근 게시판·활동·혜택을 볼 수 있고, 가입/해지는 로그인 후 스텝페이로 진행한다.
// 결제 결과·등급 반영·해지 반영은 웹훅이 하므로 이 컴포넌트는 상태를 읽어 보여주기만 한다.
type Plan = { rank: number; name: string; price: number; free?: boolean; available: boolean; access: TierAccess };
type Sub = { subscription_id: number; status: string; tier_rank: number | null; next_payment_date: string | null; end_date: string | null } | null;
type StatusInfo = { enabled: boolean; subscription: Sub; membership_rank: number };

const ENTITLED = ["ACTIVE", "PENDING_CANCEL", "PENDING_PAUSE", "QUEUEING"];
const STATUS_LABEL: Record<string, string> = {
  ACTIVE: "구독 중",
  PENDING_CANCEL: "해지 예약됨(결제한 기간까지 이용)",
  PENDING_PAUSE: "일시정지 예정",
  QUEUEING: "갱신 결제 진행 중",
  UNPAID: "결제 실패(서비스 일시 중지)",
  PAUSE: "일시 정지",
  INCOMPLETE: "결제 대기",
  EXPIRED: "만료",
  CANCELED: "해지됨",
};

function fmtDate(v: string | null): string {
  return v ? new Date(v).toLocaleDateString("ko-KR", { year: "numeric", month: "long", day: "numeric" }) : "";
}

function AccessList({ title, items }: { title: string; items: string[] }) {
  if (items.length === 0) return null;
  return (
    <div className="mt-3">
      <p className="text-xs font-semibold text-gray-500">{title}</p>
      <ul className="mt-1 space-y-0.5 text-xs leading-5 text-gray-700">
        {items.map((it) => (
          <li key={it} className="flex gap-1.5">
            <span aria-hidden>·</span>
            <span>{it}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function MembershipPlansSection() {
  const { session, loading } = useAuth();
  const [plans, setPlans] = useState<Plan[]>([]);
  const [plansLoaded, setPlansLoaded] = useState(false);
  const [info, setInfo] = useState<StatusInfo | null>(null);
  const [agreed, setAgreed] = useState(false);
  const [busyRank, setBusyRank] = useState<number | "cancel" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const reload = useCallback(async () => {
    if (!session) return;
    const res = await fetch("/api/payments/steppay/status", { headers: { Authorization: `Bearer ${session.access_token}` } });
    if (res.ok) setInfo((await res.json()) as StatusInfo);
  }, [session]);

  // 등급 목록은 로그인과 무관하게(비회원 포함) 불러온다.
  useEffect(() => {
    let cancelled = false;
    fetch("/api/membership/plans")
      .then((r) => (r.ok ? r.json() : { plans: [] }))
      .then((j: { plans?: Plan[] }) => {
        if (cancelled) return;
        setPlans(j.plans ?? []);
        setPlansLoaded(true);
      })
      .catch(() => setPlansLoaded(true));
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (loading || !session) return;
    let cancelled = false;
    fetch("/api/payments/steppay/status", { headers: { Authorization: `Bearer ${session.access_token}` } })
      .then((r) => (r.ok ? r.json() : null))
      .then((j) => {
        if (!cancelled && j) setInfo(j as StatusInfo);
      });
    return () => {
      cancelled = true;
    };
  }, [loading, session]);

  async function post(path: string, body?: unknown): Promise<{ ok: boolean; json: Record<string, unknown> }> {
    const res = await fetch(path, {
      method: "POST",
      headers: { Authorization: `Bearer ${session?.access_token}`, "Content-Type": "application/json" },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    return { ok: res.ok, json: await res.json().catch(() => ({})) };
  }

  async function handleStart(rank: number) {
    setBusyRank(rank);
    setError(null);
    const { ok, json } = await post("/api/payments/steppay/checkout", { tierRank: rank });
    if (ok && typeof json.payUrl === "string") {
      window.location.href = json.payUrl;
      return;
    }
    setError(String(json.error ?? "결제를 시작하지 못했어요."));
    setBusyRank(null);
  }

  async function handleCancel() {
    if (!window.confirm("구독을 해지할까요? 이미 결제한 기간이 끝날 때까지 등급은 유지되고, 이후 요금이 청구되지 않아요.")) return;
    setBusyRank("cancel");
    setError(null);
    setNotice(null);
    const { ok, json } = await post("/api/payments/steppay/cancel");
    if (ok) {
      setNotice("해지가 접수됐어요. 곧 상태에 반영돼요.");
      await reload();
    } else setError(String(json.error ?? "해지하지 못했어요."));
    setBusyRank(null);
  }

  if (loading) return null;

  const sub = info?.subscription ?? null;
  const entitled = sub !== null && ENTITLED.includes(sub.status);
  const currentRank = info?.membership_rank ?? 0;
  const cardAvailable = STEPPAY_UI_ENABLED && (session ? info?.enabled === true : true);
  const subTierName = plans.find((p) => p.rank === sub?.tier_rank)?.name ?? "멤버십";

  return (
    <section className="mt-10 rounded-lg border border-gray-200 p-5">
      <h2 className="text-lg font-semibold">멤버십 가입</h2>
      <p className="mt-1 text-sm text-gray-500">
        등급마다 접근할 수 있는 게시판과 활동이 달라요. 카드로 매월 자동 결제되고, 언제든 해지할 수 있어요.
      </p>

      {sub && (
        <div className="mt-3 space-y-1 text-sm">
          <p className={entitled ? "text-green-700" : "text-red-600"}>
            {subTierName} {STATUS_LABEL[sub.status] ?? sub.status}
            {sub.status === "ACTIVE" && sub.next_payment_date ? ` · 다음 결제일 ${fmtDate(sub.next_payment_date)}` : ""}
            {sub.status === "PENDING_CANCEL" && sub.end_date ? ` · ${fmtDate(sub.end_date)}까지 이용` : ""}
          </p>
          {sub.status === "UNPAID" && (
            <p className="text-red-600">최근 결제가 실패했어요. 카드 한도·유효기간을 확인해 주세요. 스텝페이가 정해진 일정에 다시 결제를 시도해요.</p>
          )}
          {sub.status === "ACTIVE" && (
            <button
              type="button"
              disabled={busyRank !== null}
              onClick={handleCancel}
              className="mt-1 rounded-md border border-red-300 px-3 py-1.5 text-sm text-red-700 disabled:opacity-50"
            >
              구독 해지
            </button>
          )}
        </div>
      )}

      {!plansLoaded ? (
        <p className="mt-6 text-sm text-gray-400">멤버십 정보를 불러오는 중...</p>
      ) : plans.length === 0 ? (
        <p className="mt-6 text-sm text-gray-500">멤버십 정보를 불러오지 못했어요. 잠시 후 다시 확인해 주세요.</p>
      ) : (
        <>
          <ul className="mt-5 grid gap-4 sm:grid-cols-2">
            {plans.map((plan) => {
              if (plan.free) {
                // 무료 입문 등급: 가입(회원가입)만 하면 되고 결제가 없다. 이미 회원이면 현재 등급 여부만 안내.
                return (
                  <li key={plan.rank} className="flex flex-col rounded-md border border-dashed border-gray-300 bg-gray-50 p-4 sm:col-span-2">
                    <p className="text-base font-semibold">
                      {plan.name} <span className="ml-1 rounded bg-gray-800 px-1.5 py-0.5 align-middle text-[10px] font-medium text-white">무료</span>
                    </p>
                    <p className="mt-1 text-sm text-gray-600">월 0원 — 가입만 하면 바로 시작해요. 유료 등급은 언제든 올릴 수 있어요.</p>
                    <div className="grid gap-x-6 sm:grid-cols-3">
                      <AccessList title="접근 가능한 게시판" items={plan.access.boards} />
                      <AccessList title="이용 가능한 활동" items={plan.access.activities} />
                      <AccessList title="할인·혜택" items={plan.access.perks} />
                    </div>
                    <div className="pt-4">
                      {!session ? (
                        <Link href="/signup" className="inline-block rounded-md border border-gray-800 px-4 py-2 text-sm text-gray-800">
                          무료로 시작하기
                        </Link>
                      ) : (
                        <span className="text-sm text-gray-500">{currentRank === 0 ? "현재 이용 중인 등급이에요" : "기본(무료) 등급이에요"}</span>
                      )}
                    </div>
                  </li>
                );
              }
              const isCurrent = entitled && sub?.tier_rank === plan.rank;
              const notUpgrade = session ? currentRank >= plan.rank : false;
              const canBuy = cardAvailable && plan.available && !entitled && !notUpgrade;
              let label = `${plan.name} 가입하기`;
              if (!plan.available || !cardAvailable) label = "결제 준비 중";
              else if (isCurrent) label = "구독 중";
              else if (entitled) label = "구독 중에는 등급 변경이 준비 중이에요";
              else if (notUpgrade) label = "현재 등급 이하";
              return (
                <li key={plan.rank} className={`flex flex-col rounded-md border p-4 ${isCurrent ? "border-green-500" : "border-gray-200"}`}>
                  <p className="text-base font-semibold">{plan.name}</p>
                  <p className="mt-1 text-sm text-gray-600">월 {plan.price.toLocaleString()}원 (부가세 포함)</p>
                  <AccessList title="접근 가능한 게시판" items={plan.access.boards} />
                  <AccessList title="이용 가능한 활동" items={plan.access.activities} />
                  <AccessList title="할인·혜택" items={plan.access.perks} />
                  <div className="mt-auto pt-4">
                    {!session && cardAvailable && plan.available ? (
                      <Link href="/login" className="inline-block rounded-md bg-gray-800 px-4 py-2 text-sm text-white">
                        로그인하고 가입하기
                      </Link>
                    ) : (
                      <button
                        type="button"
                        onClick={() => handleStart(plan.rank)}
                        disabled={!canBuy || !agreed || busyRank !== null}
                        className="rounded-md bg-gray-800 px-4 py-2 text-sm text-white disabled:opacity-50"
                      >
                        {busyRank === plan.rank ? "결제 창으로 이동 중..." : label}
                      </button>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>

          <label className="mt-4 flex items-start gap-2 text-xs leading-5 text-gray-600">
            <input type="checkbox" checked={agreed} onChange={(e) => setAgreed(e.target.checked)} className="mt-1" />
            <span>
              멤버십은 매월 자동 결제되며, 결제 후 7일 이내라도 등급 혜택(전용 콘텐츠·할인·무료 이용권 등)을 이용하면 청약철회가 제한되거나 이용분이 공제될 수
              있음을 확인했고, <Link href="/refund-policy" className="underline">환불 및 구독 해지 안내</Link>와{" "}
              <Link href="/terms" className="underline">이용약관</Link>에 동의합니다. (해지는 언제든 가능하며, 결제한 기간이 끝날 때까지 혜택이 유지돼요.)
            </span>
          </label>
        </>
      )}

      {session && !entitled && SALON_BANK_ACCOUNT && (
        <div className="mt-6 rounded-md border border-gray-200 bg-gray-50 p-4 text-sm leading-6 text-gray-700">
          <p className="font-medium text-gray-900">계좌이체로 접수하기</p>
          <p className="mt-1">입금 계좌: {SALON_BANK_ACCOUNT}</p>
          <ul className="mt-2 list-disc space-y-0.5 pl-5 text-xs text-gray-600">
            {plans.map((plan) => (
              <li key={plan.rank}>
                {plan.name}: {plan.price.toLocaleString()}원 (1개월, 부가세 포함)
              </li>
            ))}
          </ul>
          <ul className="mt-2 list-disc space-y-0.5 pl-5 text-xs text-gray-600">
            <li>입금자명은 사이트에 가입한 이름과 같게 해 주세요.</li>
            <li>입금 후 페이지 하단에 안내된 문의 이메일로 가입 이메일과 입금자명을 알려 주세요. 입금 확인 후 영업일 기준 1일 이내에 등급을 적용해 드려요.</li>
            <li>계좌이체는 1개월 이용권이며 자동으로 갱신·결제되지 않아요. 계속 이용하려면 매월 직접 입금해 주세요.</li>
            <li>
              청약철회·환불은 <Link href="/refund-policy" className="underline">환불 및 구독 해지 안내</Link>를 따라요.
            </li>
          </ul>
        </div>
      )}
      {notice && <p className="mt-3 text-sm text-green-700">{notice}</p>}
      {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
    </section>
  );
}
