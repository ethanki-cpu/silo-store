"use client";

import { loadTossPayments } from "@tosspayments/tosspayments-sdk";

// EPIC-158: 토스페이먼츠 SDK v2 브라우저 헬퍼. 클라이언트 키만 다루며, 금액/customerKey는 항상
// 서버(/api/payments/toss/*)가 산출한 값을 그대로 받아 넘긴다.

export type TossTier = { rank: number; name: string; price: number };

export type TossCustomerInfo = {
  customerKey: string;
  tiers: TossTier[];
  customerName: string;
  billing: {
    status: "active" | "canceled" | "suspended";
    tier_rank: number;
    next_billing_date: string | null;
    card_company: string | null;
    card_number_masked: string | null;
    last_failure_reason: string | null;
    cancel_at_period_end: boolean;
    pending_tier_rank: number | null;
    failed_count: number;
  } | null;
  currentRank: number;
};

export async function fetchTossCustomerInfo(accessToken: string): Promise<{ data: TossCustomerInfo | null; error: string | null }> {
  const res = await fetch("/api/payments/toss/customer-key", { headers: { Authorization: `Bearer ${accessToken}` } });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) return { data: null, error: json.error ?? "결제 정보를 불러오지 못했어요." };
  return { data: json as TossCustomerInfo, error: null };
}

/** 구독 해지 예약(cancel=true)/철회(false) — 이미 결제한 기간이 끝날 때까지 등급 유지. */
export async function requestSubscriptionCancel(accessToken: string, cancel: boolean): Promise<string | null> {
  const res = await fetch("/api/payments/toss/cancel", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${accessToken}` },
    body: JSON.stringify({ cancel }),
  });
  const json = await res.json().catch(() => ({}));
  return res.ok ? null : (json.error ?? "처리하지 못했어요.");
}

/** 구독 중 등급 변경 예약(다음 결제일부터 적용). 현재 구독 등급을 보내면 예약 해제. */
export async function requestTierChange(accessToken: string, tierRank: number): Promise<string | null> {
  const res = await fetch("/api/payments/toss/change-tier", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${accessToken}` },
    body: JSON.stringify({ tierRank }),
  });
  const json = await res.json().catch(() => ({}));
  return res.ok ? null : (json.error ?? "처리하지 못했어요.");
}

function requireClientKey(): string {
  const key = process.env.NEXT_PUBLIC_TOSS_CLIENT_KEY;
  if (!key) throw new Error("NEXT_PUBLIC_TOSS_CLIENT_KEY가 설정되지 않았어요.");
  return key;
}

/** 자동결제(빌링) 카드 등록 창 — 성공 시 successUrl로 authKey/customerKey가 붙어 리다이렉트된다. */
export async function requestBillingAuth(params: { customerKey: string; tierRank: number; customerName?: string; customerEmail?: string }) {
  const tossPayments = await loadTossPayments(requireClientKey());
  const payment = tossPayments.payment({ customerKey: params.customerKey });
  await payment.requestBillingAuth({
    method: "CARD",
    successUrl: `${window.location.origin}/payments/toss/billing-success?tier=${params.tierRank}`,
    failUrl: `${window.location.origin}/membership?billing=failed`,
    customerName: params.customerName,
    customerEmail: params.customerEmail,
  });
}

/** 단건 결제 창(카드 + 간편결제) — 성공 시 /api/payments/toss/success로 리다이렉트된다. */
export async function requestSinglePayment(params: {
  customerKey: string;
  amount: number;
  orderId: string;
  orderName: string;
  failPath: string;
  customerName?: string;
  customerEmail?: string;
}) {
  const tossPayments = await loadTossPayments(requireClientKey());
  const payment = tossPayments.payment({ customerKey: params.customerKey });
  await payment.requestPayment({
    method: "CARD",
    amount: { currency: "KRW", value: params.amount },
    orderId: params.orderId,
    orderName: params.orderName,
    successUrl: `${window.location.origin}/api/payments/toss/success`,
    failUrl: `${window.location.origin}${params.failPath}`,
    customerName: params.customerName,
    customerEmail: params.customerEmail,
    card: { flowMode: "DEFAULT", useEscrow: false },
  });
}
