"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useAuth } from "@/lib/AuthProvider";

// EPIC-158: 토스 카드 등록(빌링 인증) 성공 리다이렉트 도착 페이지 — authKey를 서버로 넘겨 빌링키 발급,
// 저장, 1회차 결제를 진행한다.
function BillingSuccessInner() {
  const params = useSearchParams();
  const { session, loading } = useAuth();
  const [result, setResult] = useState<{ state: "done" | "error"; message: string } | null>(null);
  const startedRef = useRef(false);
  const authKey = params.get("authKey");
  const customerKey = params.get("customerKey");
  const tierRank = Number(params.get("tier"));

  // 진행 전에 이미 알 수 있는 오류는 effect 안에서 setState하지 않고 렌더링 시점에 파생한다.
  const earlyError = loading
    ? null
    : !session
      ? "로그인이 필요해요. 로그인 후 다시 시도해 주세요."
      : !authKey || !customerKey || !Number.isInteger(tierRank)
        ? "카드 등록 정보가 올바르지 않아요."
        : null;
  const state = earlyError ? "error" : (result?.state ?? "working");
  const message = earlyError ?? result?.message ?? "";

  useEffect(() => {
    if (loading || startedRef.current || !session || !authKey || !customerKey || !Number.isInteger(tierRank)) return;
    startedRef.current = true;
    fetch("/api/payments/toss/billing-auth", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${session.access_token}` },
      body: JSON.stringify({ authKey, customerKey, tierRank }),
    })
      .then(async (res) => {
        const json = await res.json().catch(() => ({}));
        if (!res.ok) {
          setResult({ state: "error", message: json.error ?? "정기구독 처리에 실패했어요." });
          return;
        }
        setResult({ state: "done", message: `${json.tier_name ?? "멤버십"} 정기구독이 시작됐어요. 등급이 적용됐습니다!` });
      })
      .catch(() => setResult({ state: "error", message: "네트워크 오류가 발생했어요." }));
  }, [loading, session, authKey, customerKey, tierRank]);

  return (
    <main className="mx-auto w-full max-w-lg flex-1 p-8">
      <h1 className="text-xl font-bold">멤버십 정기구독</h1>
      {state === "working" && <p className="mt-4 text-gray-600">카드 등록과 첫 결제를 처리하고 있어요. 창을 닫지 마세요...</p>}
      {state === "done" && <p className="mt-4 text-green-700">{message}</p>}
      {state === "error" && <p className="mt-4 text-red-600">{message}</p>}
      <Link href="/membership" className="mt-6 inline-block text-sm text-blue-600 underline">
        멤버십 페이지로 돌아가기
      </Link>
    </main>
  );
}

export default function BillingSuccessPage() {
  return (
    <Suspense fallback={<main className="flex-1 p-8">불러오는 중...</main>}>
      <BillingSuccessInner />
    </Suspense>
  );
}
