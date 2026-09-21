"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/lib/AuthProvider";
import { SALON_BANK_ACCOUNT, STEPPAY_UI_ENABLED } from "@/lib/bankAccount";
import { supabase } from "@/lib/supabaseClient";

// EPIC-159: Patron 정기구독(스텝페이) + 그 밖의 유료 등급 계좌이체 접수. /membership 과 마이페이지 공용.
// 결제는 스텝페이 결제 페이지로 이동해 진행하고, 등급 반영/해지 반영은 웹훅이 하므로 이 컴포넌트는 상태를 읽어 보여주기만 한다.
type Tier = { rank: number; name: string; price: number };
type Sub = { subscription_id: number; status: string; next_payment_date: string | null; end_date: string | null } | null;
type StatusInfo = { enabled: boolean; subscription: Sub; membership_rank: number };

const PATRON_RANK = 3;
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

export function PatronSubscribeSection() {
  const { session, loading } = useAuth();
  const [tiers, setTiers] = useState<Tier[]>([]);
  const [info, setInfo] = useState<StatusInfo | null>(null);
  const [agreed, setAgreed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const reload = useCallback(async () => {
    if (!session) return;
    const res = await fetch("/api/payments/steppay/status", { headers: { Authorization: `Bearer ${session.access_token}` } });
    if (res.ok) setInfo((await res.json()) as StatusInfo);
  }, [session]);

  useEffect(() => {
    supabase
      .from("membership_tiers")
      .select("rank, name, price, is_lifetime")
      .gt("price", 0)
      .order("rank", { ascending: true })
      .then(({ data }) => {
        const rows = (data ?? []) as (Tier & { is_lifetime: boolean })[];
        setTiers(rows.filter((t) => !t.is_lifetime && t.rank > 0 && t.rank < 99));
      });
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

  async function post(path: string): Promise<{ ok: boolean; json: Record<string, unknown> }> {
    const res = await fetch(path, { method: "POST", headers: { Authorization: `Bearer ${session?.access_token}` } });
    return { ok: res.ok, json: await res.json().catch(() => ({})) };
  }

  async function handleStart() {
    setBusy(true);
    setError(null);
    const { ok, json } = await post("/api/payments/steppay/checkout");
    if (ok && typeof json.payUrl === "string") {
      window.location.href = json.payUrl;
      return;
    }
    setError(String(json.error ?? "결제를 시작하지 못했어요."));
    setBusy(false);
  }

  async function handleCancel() {
    if (!window.confirm("구독을 해지할까요? 이미 결제한 기간이 끝날 때까지 등급은 유지되고, 이후 요금이 청구되지 않아요.")) return;
    setBusy(true);
    setError(null);
    setNotice(null);
    const { ok, json } = await post("/api/payments/steppay/cancel");
    if (ok) {
      setNotice("해지가 접수됐어요. 곧 상태에 반영돼요.");
      await reload();
    } else setError(String(json.error ?? "해지하지 못했어요."));
    setBusy(false);
  }

  if (loading) return null;

  const patron = tiers.find((t) => t.rank === PATRON_RANK);
  const sub = info?.subscription ?? null;
  const entitled = sub !== null && ENTITLED.includes(sub.status);
  const cardAvailable = STEPPAY_UI_ENABLED && info?.enabled === true;

  return (
    <section className="mt-10 rounded-lg border border-gray-200 p-5">
      <h2 className="text-lg font-semibold">멤버십</h2>

      {!session ? (
        <p className="mt-3 text-sm text-red-600">구독하려면 로그인이 필요해요.</p>
      ) : (
        <>
          {sub && (
            <div className="mt-3 space-y-1 text-sm">
              <p className={entitled ? "text-green-700" : "text-red-600"}>
                Patron {STATUS_LABEL[sub.status] ?? sub.status}
                {sub.status === "ACTIVE" && sub.next_payment_date ? ` · 다음 결제일 ${fmtDate(sub.next_payment_date)}` : ""}
                {sub.status === "PENDING_CANCEL" && sub.end_date ? ` · ${fmtDate(sub.end_date)}까지 이용` : ""}
              </p>
              {sub.status === "UNPAID" && (
                <p className="text-red-600">최근 결제가 실패했어요. 카드 한도·유효기간을 확인해 주세요. 스텝페이가 정해진 일정에 다시 결제를 시도해요.</p>
              )}
              {sub.status === "ACTIVE" && (
                <button
                  type="button"
                  disabled={busy}
                  onClick={handleCancel}
                  className="mt-1 rounded-md border border-red-300 px-3 py-1.5 text-sm text-red-700 disabled:opacity-50"
                >
                  구독 해지
                </button>
              )}
            </div>
          )}

          {!entitled && cardAvailable && patron && (
            <div className="mt-4">
              <p className="text-sm text-gray-500">카드로 매월 자동 결제되는 정기구독이에요.</p>
              <div className="mt-3 rounded-md border border-gray-200 p-4">
                <p className="font-medium">{patron.name}</p>
                <p className="mt-1 text-sm text-gray-600">월 {patron.price.toLocaleString()}원 (부가세 포함)</p>
                <label className="mt-3 flex items-start gap-2 text-xs leading-5 text-gray-600">
                  <input type="checkbox" checked={agreed} onChange={(e) => setAgreed(e.target.checked)} className="mt-1" />
                  <span>
                    멤버십은 매월 자동 결제되며, 결제 후 7일 이내라도 등급 혜택(전용 콘텐츠·할인·무료 이용권 등)을 이용하면 청약철회가 제한되거나 이용분이 공제될 수
                    있음을 확인했고, <Link href="/refund-policy" className="underline">환불 및 구독 해지 안내</Link>와{" "}
                    <Link href="/terms" className="underline">이용약관</Link>에 동의합니다. (해지는 언제든 가능하며, 결제한 기간이 끝날 때까지 혜택이 유지돼요.)
                  </span>
                </label>
                <button
                  type="button"
                  onClick={handleStart}
                  disabled={busy || !agreed}
                  className="mt-3 rounded-md bg-gray-800 px-4 py-2 text-sm text-white disabled:opacity-50"
                >
                  {busy ? "결제 창으로 이동 중..." : `${patron.name} 정기구독 시작하기`}
                </button>
              </div>
            </div>
          )}

          {!entitled && !cardAvailable && (
            <p className="mt-3 text-sm text-gray-600">카드 정기결제는 준비 중이에요. 그동안은 아래 계좌이체로 접수해 주세요.</p>
          )}

          {!entitled && SALON_BANK_ACCOUNT && (
            <div className="mt-6 rounded-md border border-gray-200 bg-gray-50 p-4 text-sm leading-6 text-gray-700">
              <p className="font-medium text-gray-900">계좌이체로 접수하기</p>
              <p className="mt-1">입금 계좌: {SALON_BANK_ACCOUNT}</p>
              <ul className="mt-2 list-disc space-y-0.5 pl-5 text-xs text-gray-600">
                {tiers.map((tier) => (
                  <li key={tier.rank}>
                    {tier.name}: {tier.price.toLocaleString()}원 (1개월, 부가세 포함)
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
        </>
      )}
      {notice && <p className="mt-3 text-sm text-green-700">{notice}</p>}
      {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
    </section>
  );
}
