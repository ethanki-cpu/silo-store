"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/lib/AuthProvider";
import { fetchTossCustomerInfo, requestBillingAuth, type TossCustomerInfo } from "@/lib/tossClient";

// EPIC-158: Patron 정기구독 시작 버튼 + 현재 구독 상태. /membership 과 마이페이지에서 공용.
// 금액/customerKey는 서버(/api/payments/toss/customer-key)가 산출해 내려주며, 빌링키는 클라이언트에
// 내려오지 않는다(member_billing 컬럼 권한 + 서버 전용 라우트).
export function PatronSubscribeButton() {
  const { session, member, loading } = useAuth();
  const [info, setInfo] = useState<TossCustomerInfo | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [starting, setStarting] = useState(false);

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

  async function handleStart() {
    if (!session || !info) return;
    setStarting(true);
    setError(null);
    try {
      await requestBillingAuth({
        customerKey: info.customerKey,
        customerName: info.customerName,
        customerEmail: session.user.email ?? undefined,
      });
    } catch (e) {
      // 사용자가 결제창을 닫은 경우도 여기로 온다.
      setError(e instanceof Error ? e.message : "카드 등록 창을 열지 못했어요.");
      setStarting(false);
    }
  }

  if (loading) return null;

  const active = info?.billing?.status === "active";
  const suspended = info?.billing?.status === "suspended";

  return (
    <section className="mt-10 rounded-lg border border-gray-200 p-5">
      <h2 className="text-lg font-semibold">Patron 정기구독</h2>
      <p className="mt-1 text-sm text-gray-500">
        {info ? `월 ${info.amount.toLocaleString()}원 — 카드를 등록하면 첫 결제와 함께 Patron 등급이 바로 적용돼요.` : "카드를 등록하면 첫 결제와 함께 Patron 등급이 바로 적용돼요."}
      </p>

      {!session ? (
        <p className="mt-3 text-sm text-red-600">구독하려면 로그인이 필요해요.</p>
      ) : active ? (
        <p className="mt-3 text-sm text-green-700">
          구독 중이에요{info?.billing?.card_company ? ` (${info.billing.card_company} ${info.billing.card_number_masked ?? ""})` : ""}
          {info?.billing?.next_billing_date ? ` · 다음 결제일 ${info.billing.next_billing_date}` : ""}
        </p>
      ) : (
        <>
          {suspended && (
            <p className="mt-3 text-sm text-red-600">
              결제가 실패해 구독이 일시 중지됐어요{info?.billing?.last_failure_reason ? ` (${info.billing.last_failure_reason})` : ""}. 카드를 다시 등록해 주세요.
            </p>
          )}
          {member && member.membership_rank >= 3 && !suspended && (
            <p className="mt-3 text-sm text-gray-500">이미 Patron 이상 등급이에요.</p>
          )}
          <button
            type="button"
            onClick={handleStart}
            disabled={starting || !info}
            className="mt-3 rounded-md bg-gray-800 px-4 py-2 text-sm text-white disabled:opacity-50"
          >
            {starting ? "결제 창을 여는 중..." : suspended ? "카드 다시 등록하기" : "Patron 정기구독 시작하기"}
          </button>
        </>
      )}
      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
    </section>
  );
}
