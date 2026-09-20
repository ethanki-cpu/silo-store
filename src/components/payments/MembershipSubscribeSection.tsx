"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/lib/AuthProvider";
import { fetchTossCustomerInfo, requestBillingAuth, type TossCustomerInfo } from "@/lib/tossClient";

// EPIC-158: 유료 멤버십(Alice/Great Gatsby/Patron/Lautrec) 정기구독 시작 + 현재 구독 상태.
// /membership 과 마이페이지에서 공용. 등급 목록/금액/customerKey는 서버(/api/payments/toss/customer-key)가
// 산출해 내려주며, 빌링키는 클라이언트에 내려오지 않는다(member_billing 컬럼 권한 + 서버 전용 라우트).
export function MembershipSubscribeSection() {
  const { session, member, loading } = useAuth();
  const [info, setInfo] = useState<TossCustomerInfo | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [startingRank, setStartingRank] = useState<number | null>(null);

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

  if (loading) return null;

  const currentRank = member?.membership_rank ?? info?.currentRank ?? 0;
  const billing = info?.billing ?? null;
  const active = billing?.status === "active";
  const suspended = billing?.status === "suspended";
  const activeTierName = info?.tiers.find((t) => t.rank === billing?.tier_rank)?.name;

  return (
    <section className="mt-10 rounded-lg border border-gray-200 p-5">
      <h2 className="text-lg font-semibold">멤버십 정기구독</h2>
      <p className="mt-1 text-sm text-gray-500">카드를 등록하면 첫 결제와 함께 선택한 등급이 바로 적용되고, 매월 자동 결제돼요.</p>

      {!session ? (
        <p className="mt-3 text-sm text-red-600">구독하려면 로그인이 필요해요.</p>
      ) : (
        <>
          {active && (
            <p className="mt-3 text-sm text-green-700">
              {activeTierName ?? "멤버십"} 구독 중이에요
              {billing?.card_company ? ` (${billing.card_company} ${billing.card_number_masked ?? ""})` : ""}
              {billing?.next_billing_date ? ` · 다음 결제일 ${billing.next_billing_date}` : ""}
            </p>
          )}
          {suspended && (
            <p className="mt-3 text-sm text-red-600">
              결제가 실패해 구독이 일시 중지됐어요{billing?.last_failure_reason ? ` (${billing.last_failure_reason})` : ""}. 카드를 다시 등록해 주세요.
            </p>
          )}

          <ul className="mt-4 grid gap-3 sm:grid-cols-2">
            {(info?.tiers ?? []).map((tier) => {
              const isCurrentActive = active && billing?.tier_rank === tier.rank;
              // 이미 그 등급 이상이면 신규 구독 불가(일시 중지 상태의 재등록은 허용), 구독 중이면 더 높은 등급만.
              const blocked =
                isCurrentActive ||
                (currentRank >= tier.rank && !suspended) ||
                (active && billing !== null && tier.rank <= billing.tier_rank);
              return (
                <li key={tier.rank} className="rounded-md border border-gray-200 p-4">
                  <p className="font-medium">{tier.name}</p>
                  <p className="mt-1 text-sm text-gray-600">월 {tier.price.toLocaleString()}원</p>
                  <button
                    type="button"
                    onClick={() => handleStart(tier.rank)}
                    disabled={blocked || startingRank !== null || !info}
                    className="mt-3 rounded-md bg-gray-800 px-4 py-2 text-sm text-white disabled:opacity-50"
                  >
                    {startingRank === tier.rank
                      ? "결제 창을 여는 중..."
                      : isCurrentActive
                        ? "구독 중"
                        : blocked
                          ? "이미 이용 중인 등급 이하"
                          : suspended && billing?.tier_rank === tier.rank
                            ? "카드 다시 등록하기"
                            : `${tier.name} 정기구독 시작하기`}
                  </button>
                </li>
              );
            })}
          </ul>
        </>
      )}
      {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
    </section>
  );
}
