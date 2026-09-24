"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/lib/AuthProvider";
import { STEPPAY_UI_ENABLED } from "@/lib/bankAccount";

// HOTFIX-163.1: /membership 캐러셀 카드가 등급별 "가입하기"를 직접 처리하려고, MembershipPlansSection에
// 있던 구독 상태 조회 + 스텝페이 결제 시작 로직을 카드에서도 쓸 수 있게 분리한 훅.
// 결제 결과·등급 반영은 웹훅이 하므로 여기서는 상태를 읽고 결제 창으로 보내기만 한다.
type Sub = { subscription_id: number; status: string; tier_rank: number | null; next_payment_date: string | null; end_date: string | null } | null;
type StatusInfo = { enabled: boolean; subscription: Sub; membership_rank: number };

const ENTITLED = ["ACTIVE", "PENDING_CANCEL", "PENDING_PAUSE", "QUEUEING"];

export function useMembershipBilling() {
  const { session, loading } = useAuth();
  const [info, setInfo] = useState<StatusInfo | null>(null);
  const [busyRank, setBusyRank] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

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

  const sub = info?.subscription ?? null;
  const entitled = sub !== null && ENTITLED.includes(sub.status);
  const currentRank = info?.membership_rank ?? 0;
  const cardAvailable = STEPPAY_UI_ENABLED && (session ? info?.enabled === true : true);

  async function startCheckout(rank: number) {
    if (!session) return;
    setBusyRank(rank);
    setError(null);
    const res = await fetch("/api/payments/steppay/checkout", {
      method: "POST",
      headers: { Authorization: `Bearer ${session.access_token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ tierRank: rank }),
    });
    const json = (await res.json().catch(() => ({}))) as { payUrl?: string; error?: string };
    if (res.ok && typeof json.payUrl === "string") {
      window.location.assign(json.payUrl);
      return;
    }
    setError(json.error ?? "결제를 시작하지 못했어요.");
    setBusyRank(null);
  }

  return { session, sub, entitled, currentRank, cardAvailable, busyRank, error, startCheckout };
}
