"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useAuth } from "@/lib/AuthProvider";

// EPIC-159: 스텝페이 결제 페이지에서 돌아오는 곳(successUrl/errorUrl). 결제 성공 표시만 믿지 않고, 실제 등급/구독 상태는
// 웹훅이 DB에 반영한 값을 /api/payments/steppay/status로 확인해 보여준다(반영까지 몇 초 걸릴 수 있어 잠시 다시 확인).
function ResultInner() {
  const params = useSearchParams();
  const { session, loading } = useAuth();
  const failed = params.get("status") === "error";
  const [state, setState] = useState<"checking" | "active" | "waiting">("checking");

  useEffect(() => {
    if (loading || !session || failed) return;
    let cancelled = false;
    let tries = 0;
    const token = session.access_token;
    async function poll() {
      tries += 1;
      const res = await fetch("/api/payments/steppay/status", { headers: { Authorization: `Bearer ${token}` } });
      const j = res.ok ? await res.json() : null;
      const st = j?.subscription?.status as string | undefined;
      if (cancelled) return;
      if (st && ["ACTIVE", "QUEUEING"].includes(st)) setState("active");
      else if (tries >= 8) setState("waiting");
      else setTimeout(poll, 2500);
    }
    void poll();
    return () => {
      cancelled = true;
    };
  }, [loading, session, failed]);

  return (
    <main className="mx-auto w-full max-w-lg flex-1 p-8">
      <h1 className="text-xl font-bold">멤버십 정기구독</h1>
      {failed ? (
        <p className="mt-4 text-red-600">결제가 완료되지 않았어요. 카드 정보를 확인한 뒤 다시 시도해 주세요.</p>
      ) : state === "active" ? (
        <p className="mt-4 text-green-700">정기구독이 시작됐고 Patron 등급이 적용됐어요!</p>
      ) : state === "waiting" ? (
        <p className="mt-4 text-gray-700">결제 결과를 확인하고 있어요. 등급 반영까지 몇 분 걸릴 수 있으니 잠시 뒤 멤버십 페이지에서 확인해 주세요.</p>
      ) : (
        <p className="mt-4 text-gray-600">결제 결과를 확인하고 있어요...</p>
      )}
      <Link href="/membership" className="mt-6 inline-block text-sm text-blue-600 underline">
        멤버십 페이지로 돌아가기
      </Link>
    </main>
  );
}

export default function SteppayResultPage() {
  return (
    <Suspense fallback={<main className="flex-1 p-8">불러오는 중...</main>}>
      <ResultInner />
    </Suspense>
  );
}
