"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/lib/AuthProvider";
import {
  fetchTossCustomerInfo,
  requestBillingAuth,
  requestSubscriptionCancel,
  requestTierChange,
  type TossCustomerInfo,
} from "@/lib/tossClient";

// EPIC-158: 유료 멤버십(Alice/Great Gatsby/Patron/Lautrec) 정기구독 시작 + 현재 구독 상태.
// /membership 과 마이페이지에서 공용. 등급 목록/금액/customerKey는 서버(/api/payments/toss/customer-key)가
// 산출해 내려주며, 빌링키는 클라이언트에 내려오지 않는다(member_billing 컬럼 권한 + 서버 전용 라우트).
// HOTFIX-158.6: 정책(환불·해지 안내)과 동작 일치 — 결제 전 청약철회 제한 안내 + 동의 체크, 셀프 해지(기간 만료 시 종료)와
// 해지 철회, 구독 중 등급 변경은 다음 결제일부터 적용(예약), 결제 실패 재시도 안내.
export function MembershipSubscribeSection() {
  const { session, member, loading } = useAuth();
  const [info, setInfo] = useState<TossCustomerInfo | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [startingRank, setStartingRank] = useState<number | null>(null);
  const [agreed, setAgreed] = useState(false);
  const [busy, setBusy] = useState(false);

  const reload = useCallback(async () => {
    if (!session) return;
    const { data, error: err } = await fetchTossCustomerInfo(session.access_token);
    setInfo(data);
    setError(err);
  }, [session]);

  useEffect(() => {
    if (loading || !session) return;
    let cancelled = false;
    fetchTossCustomerInfo(session.access_token).then(({ data, error: err }) => {
      if (cancelled) return;
      setInfo(data);
      setError(err);
    });
    return () => {
      cancelled = true;
    };
  }, [loading, session]);

  async function handleStart(tierRank: number) {
    if (!session || !info) return;
    setStartingRank(tierRank);
    setError(null);
    try {
      await requestBillingAuth({
        customerKey: info.customerKey,
        tierRank,
        customerName: info.customerName,
        customerEmail: session.user.email ?? undefined,
      });
    } catch (e) {
      // 사용자가 결제창을 닫은 경우도 여기로 온다.
      setError(e instanceof Error ? e.message : "카드 등록 창을 열지 못했어요.");
      setStartingRank(null);
    }
  }

  async function run(action: () => Promise<string | null>, doneMessage: string) {
    setBusy(true);
    setError(null);
    setNotice(null);
    const err = await action();
    if (err) setError(err);
    else {
      setNotice(doneMessage);
      await reload();
    }
    setBusy(false);
  }

  if (loading) return null;

  const currentRank = member?.membership_rank ?? info?.currentRank ?? 0;
  const billing = info?.billing ?? null;
  const active = billing?.status === "active";
  const suspended = billing?.status === "suspended";
  const cancelPending = active && billing?.cancel_at_period_end === true;
  const tierName = (rank?: number | null) => info?.tiers.find((t) => t.rank === rank)?.name;
  const activeTierName = tierName(billing?.tier_rank);
  const pendingTierName = tierName(billing?.pending_tier_rank);

  return (
    <section className="mt-10 rounded-lg border border-gray-200 p-5">
      <h2 className="text-lg font-semibold">멤버십 정기구독</h2>
      <p className="mt-1 text-sm text-gray-500">카드를 등록하면 첫 결제와 함께 선택한 등급이 바로 적용되고, 매월 자동 결제돼요.</p>

      {!session ? (
        <p className="mt-3 text-sm text-red-600">구독하려면 로그인이 필요해요.</p>
      ) : (
        <>
          {active && (
            <div className="mt-3 space-y-1 text-sm">
              <p className="text-green-700">
                {activeTierName ?? "멤버십"} 구독 중이에요
                {billing?.card_company ? ` (${billing.card_company} ${billing.card_number_masked ?? ""})` : ""}
                {billing?.next_billing_date ? ` · 다음 결제일 ${billing.next_billing_date}` : ""}
              </p>
              {cancelPending && (
                <p className="text-amber-700">
                  해지가 예약됐어요. {billing?.next_billing_date ?? "다음 결제일"} 전까지 지금 등급이 유지되고, 이후 요금이 청구되지 않으며 기본 등급으로
                  전환돼요.
                </p>
              )}
              {!cancelPending && pendingTierName && (
                <p className="text-blue-700">
                  {billing?.next_billing_date ?? "다음 결제일"}부터 {pendingTierName} 등급으로 변경돼요(그 전까지는 {activeTierName} 유지, 일할 계산 없음).
                </p>
              )}
              {(billing?.failed_count ?? 0) > 0 && (
                <p className="text-red-600">
                  최근 결제가 실패했어요{billing?.last_failure_reason ? ` (${billing.last_failure_reason})` : ""}. {billing?.next_billing_date ?? "곧"}에 다시
                  결제를 시도하며, 총 3회 재시도 후에도 실패하면 구독이 일시 중지돼요. 카드 한도/유효기간을 확인해 주세요.
                </p>
              )}
              <div className="pt-1">
                {cancelPending ? (
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => run(() => requestSubscriptionCancel(session.access_token, false), "해지 예약을 철회했어요. 구독이 계속돼요.")}
                    className="rounded-md border border-gray-300 px-3 py-1.5 text-sm disabled:opacity-50"
                  >
                    해지 철회
                  </button>
                ) : (
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => {
                      if (window.confirm("구독을 해지할까요? 이미 결제한 기간이 끝날 때까지 등급은 유지되고, 이후 요금이 청구되지 않아요.")) {
                        void run(() => requestSubscriptionCancel(session.access_token, true), "해지가 예약됐어요.");
                      }
                    }}
                    className="rounded-md border border-red-300 px-3 py-1.5 text-sm text-red-700 disabled:opacity-50"
                  >
                    구독 해지
                  </button>
                )}
              </div>
            </div>
          )}
          {suspended && (
            <p className="mt-3 text-sm text-red-600">
              결제가 실패해 구독이 일시 중지됐어요{billing?.last_failure_reason ? ` (${billing.last_failure_reason})` : ""}. 카드를 다시 등록해 주세요.
            </p>
          )}

          {!active && (
            <label className="mt-4 flex items-start gap-2 text-xs leading-5 text-gray-600">
              <input type="checkbox" checked={agreed} onChange={(e) => setAgreed(e.target.checked)} className="mt-1" />
              <span>
                멤버십은 매월 자동 결제되며, 결제 후 7일 이내라도 등급 혜택(전용 콘텐츠·할인·무료 이용권 등)을 이용하면 청약철회가 제한되거나 이용분이 공제될 수
                있음을 확인했고, <Link href="/refund-policy" className="underline">환불 및 구독 해지 안내</Link>와{" "}
                <Link href="/terms" className="underline">이용약관</Link>에 동의합니다. (해지는 언제든 가능하며, 결제한 기간이 끝날 때까지 혜택이 유지돼요.)
              </span>
            </label>
          )}

          <ul className="mt-4 grid gap-3 sm:grid-cols-2">
            {(info?.tiers ?? []).map((tier) => {
              const isCurrentActive = active && billing?.tier_rank === tier.rank;
              const isPending = active && billing?.pending_tier_rank === tier.rank;
              // 신규 구독(구독 중이 아님): 이미 그 등급 이상이면 불가(일시 중지 상태의 재등록은 허용).
              const blockedNew = !active && currentRank >= tier.rank && !suspended;
              return (
                <li key={tier.rank} className="rounded-md border border-gray-200 p-4">
                  <p className="font-medium">{tier.name}</p>
                  <p className="mt-1 text-sm text-gray-600">월 {tier.price.toLocaleString()}원 (부가세 포함)</p>
                  {active ? (
                    <button
                      type="button"
                      onClick={() =>
                        run(
                          () => requestTierChange(session.access_token, isPending ? (billing?.tier_rank ?? tier.rank) : tier.rank),
                          isPending ? "등급 변경 예약을 취소했어요." : `다음 결제일부터 ${tier.name} 등급으로 변경돼요.`,
                        )
                      }
                      disabled={busy || cancelPending || isCurrentActive}
                      className="mt-3 rounded-md bg-gray-800 px-4 py-2 text-sm text-white disabled:opacity-50"
                    >
                      {isCurrentActive
                        ? "현재 구독 등급"
                        : isPending
                          ? "변경 예약 취소"
                          : `다음 결제일부터 ${tier.name}(으)로 변경`}
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => handleStart(tier.rank)}
                      disabled={blockedNew || !agreed || startingRank !== null || !info}
                      title={!agreed && !blockedNew ? "위 안내에 동의해 주세요." : undefined}
                      className="mt-3 rounded-md bg-gray-800 px-4 py-2 text-sm text-white disabled:opacity-50"
                    >
                      {startingRank === tier.rank
                        ? "결제 창을 여는 중..."
                        : blockedNew
                          ? "이미 이용 중인 등급 이하"
                          : suspended && billing?.tier_rank === tier.rank
                            ? "카드 다시 등록하기"
                            : `${tier.name} 정기구독 시작하기`}
                    </button>
                  )}
                </li>
              );
            })}
          </ul>
        </>
      )}
      {notice && <p className="mt-3 text-sm text-green-700">{notice}</p>}
      {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
    </section>
  );
}
