"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useAuth } from "@/lib/AuthProvider";
import { PageEditButton } from "@/components/admin/PageEditButton";
import { PageBuilderRenderer } from "@/components/PageBuilderRenderer";
import { fetchPublishedPageBySlug, type PageModuleRow } from "@/lib/pageBuilder";
import { CollectButton } from "@/components/common/CollectButton";
import { guessDocentCollectionCategory } from "@/lib/collectionCategory";
import { fetchTossCustomerInfo, requestSinglePayment } from "@/lib/tossClient";
import { TOSS_MEMBERSHIP_ENABLED } from "@/lib/bankAccount";

type ContentDetail = {
  id: string;
  title: string;
  keywords: string | null;
  is_free: boolean;
  price: number;
  cover_image: string | null;
  body_url: string | null;
  era: string | null;
  figure_name: string | null;
  purchased: boolean;
};

type PurchaseResult = {
  price_charged: number;
  discount_applied_pct: number;
  is_monthly_free: boolean;
  payment_status: "confirmed" | "pending_payment" | "pending_transfer";
  purchase_id?: string;
  order_id?: string;
  needs_agreement_notice: boolean;
};

export default function DocentDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { session, loading: authLoading } = useAuth();

  const [content, setContent] = useState<ContentDetail | null>(null);
  const [fetching, setFetching] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [purchasing, setPurchasing] = useState(false);
  // HOTFIX-158.6: 디지털 콘텐츠는 열람을 시작하면 청약철회가 제한된다(전자상거래법 제17조 제2항) — 결제 전 안내 + 동의.
  const [withdrawalAck, setWithdrawalAck] = useState(false);
  const [purchaseError, setPurchaseError] = useState<string | null>(null);
  const [purchaseResult, setPurchaseResult] = useState<PurchaseResult | null>(
    null,
  );

  // EPIC-067: page_builder(slug="docent-id") 위젯을 본문/구매 영역 아래에
  // 이어서 렌더링(EPIC-066이 발견한 PageEditButton-only 결함 수정, Phase 1).
  const [pageModules, setPageModules] = useState<PageModuleRow[]>([]);
  // EPIC-158: 토스 결제창에서 돌아온 결과(/api/payments/toss/success 리다이렉트 쿼리).
  const [paymentNotice, setPaymentNotice] = useState<{ kind: "success" | "failed"; reason?: string } | null>(null);
  useEffect(() => {
    const q = new URLSearchParams(window.location.search);
    const p = q.get("payment");
    if (p === "success" || p === "failed") setPaymentNotice({ kind: p, reason: q.get("reason") ?? undefined });
  }, []);
  useEffect(() => {
    let cancelled = false;
    fetchPublishedPageBySlug("docent-id").then((result) => {
      if (!cancelled) setPageModules(result?.modules ?? []);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  async function load() {
    setFetching(true);
    setLoadError(null);

    const res = await fetch(`/api/docent-contents/${id}`, {
      headers: session
        ? { Authorization: `Bearer ${session.access_token}` }
        : {},
    });
    const data = await res.json();

    if (!res.ok) {
      setLoadError(data.error ?? "콘텐츠를 불러오지 못했어요.");
      setFetching(false);
      return;
    }

    setContent(data);
    setFetching(false);
  }

  useEffect(() => {
    if (authLoading) return;
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, session, authLoading]);

  async function handlePurchase() {
    setPurchasing(true);
    setPurchaseError(null);

    const res = await fetch("/api/docent-purchases", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(session
          ? { Authorization: `Bearer ${session.access_token}` }
          : {}),
      },
      body: JSON.stringify({ contentId: id }),
    });

    const data = await res.json();
    setPurchasing(false);

    if (!res.ok) {
      setPurchaseError(data.error);
      return;
    }

    setPurchaseResult(data);

    if (data.payment_status === "confirmed") {
      load();
      return;
    }

    // EPIC-158: 유료 도슨트는 토스페이먼츠 결제창(카드 + 간편결제)으로 결제한다.
    if (data.order_id && session && content) {
      const { data: info, error: infoError } = await fetchTossCustomerInfo(session.access_token);
      if (!info) {
        setPurchaseError(infoError ?? "결제 정보를 불러오지 못했어요.");
        return;
      }
      try {
        await requestSinglePayment({
          customerKey: info.customerKey,
          amount: data.price_charged,
          orderId: data.order_id,
          orderName: content.title.slice(0, 100),
          failPath: `/docent/${id}?payment=failed`,
          customerName: info.customerName,
          customerEmail: session.user.email ?? undefined,
        });
      } catch (e) {
        setPurchaseError(e instanceof Error ? e.message : "결제 창을 열지 못했어요.");
      }
    }
  }

  if (fetching) {
    return <main className="flex-1 p-8">불러오는 중...</main>;
  }

  if (loadError || !content) {
    return (
      <main className="flex-1 p-8">
        <p className="text-red-600">{loadError ?? "콘텐츠를 찾을 수 없어요."}</p>
      </main>
    );
  }

  return (
    <>
      <PageEditButton slug="docent-id" />
      <main className="flex-1 p-8 max-w-2xl mx-auto w-full">
      {content.cover_image && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={content.cover_image}
          alt={content.title}
          className="w-full aspect-video object-cover rounded-lg mb-4"
        />
      )}

      <div className="flex items-start justify-between gap-3">
        <h1 className="text-2xl font-bold">{content.title}</h1>
        {/* EPIC-095(요구사항 1.2): 도슨트 뷰어의 "내 컬렉션에 담기" —
            era/figure_name이 있으면 그 축으로, 없으면 'era'를 기본
            제안한다(guessDocentCollectionCategory). */}
        <CollectButton
          title={content.title}
          imageUrl={content.cover_image}
          suggestedCategory={guessDocentCollectionCategory(content)}
          size="sm"
        />
      </div>
      {content.keywords && (
        <p className="text-sm text-gray-500 mt-1">{content.keywords}</p>
      )}
      {paymentNotice?.kind === "success" && (
        <p className="mt-3 rounded-md border border-green-200 bg-green-50 p-3 text-sm text-green-700">결제가 완료됐어요. 바로 열람하실 수 있어요.</p>
      )}
      {paymentNotice?.kind === "failed" && (
        <p className="mt-3 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">결제가 완료되지 않았어요{paymentNotice.reason ? ` (${paymentNotice.reason})` : ""}. 다시 시도해 주세요.</p>
      )}

      {content.purchased ? (
        <div className="mt-6 rounded-lg border border-gray-200 p-4">
          <p className="text-sm text-gray-500 mb-2">본문</p>
          <a
            href={content.body_url ?? "#"}
            target="_blank"
            rel="noreferrer"
            className="text-blue-600 underline"
          >
            {content.body_url}
          </a>
        </div>
      ) : (
        <div className="mt-6 rounded-lg border border-gray-200 p-4">
          <p className="text-gray-600 mb-3">
            이 콘텐츠는 구매 후 열람할 수 있어요. ({content.price.toLocaleString()}
            원)
          </p>

          {!session && (
            <p className="text-sm text-red-600 mb-3">
              구매하려면 로그인이 필요해요.
            </p>
          )}

          <label className="mb-3 flex items-start gap-2 text-xs leading-5 text-gray-600">
            <input type="checkbox" checked={withdrawalAck} onChange={(e) => setWithdrawalAck(e.target.checked)} className="mt-1" />
            <span>
              온라인 도슨트는 결제 즉시 열람할 수 있는 디지털 콘텐츠이며, 열람을 시작하면 청약철회가 제한됨을 확인했습니다(열람 시작 전 7일 이내에는 전액
              환불, 콘텐츠 하자 시에는 예외). 자세한 내용은 <Link href="/refund-policy" className="underline">환불 및 구독 해지 안내</Link>를 확인해 주세요.
            </span>
          </label>

          <button
            onClick={handlePurchase}
            disabled={purchasing || !session || !withdrawalAck || !TOSS_MEMBERSHIP_ENABLED}
            className="rounded-md bg-gray-800 text-white px-4 py-2 disabled:opacity-50"
          >
            {purchasing ? "처리 중..." : "구매하기"}
          </button>

          {!TOSS_MEMBERSHIP_ENABLED && (
            <p className="text-xs text-gray-500 mt-2">카드 결제는 준비 중이에요. 구매를 원하시면 하단 사업자 정보의 이메일로 문의해 주세요.</p>
          )}

          {purchaseError && (
            <p className="text-sm text-red-600 mt-2">{purchaseError}</p>
          )}

          {purchaseResult && (
            <div className="mt-4 rounded-md bg-blue-50 border border-blue-200 p-3 text-sm">
              {purchaseResult.payment_status === "confirmed" ? (
                <p className="font-medium text-blue-700">
                  {purchaseResult.is_monthly_free
                    ? "이번 달 무료 혜택으로 구매 완료! 바로 열람하실 수 있어요."
                    : "구매 완료!"}
                </p>
              ) : (
                <>
                  <p className="font-medium text-blue-700">
                    결제 금액 {purchaseResult.price_charged.toLocaleString()}원 —
                    결제 창에서 결제를 진행해 주세요
                  </p>
                  {purchaseResult.discount_applied_pct > 0 && (
                    <p className="text-gray-600 mt-1">
                      등급 할인 {purchaseResult.discount_applied_pct}% 적용됨
                    </p>
                  )}
                </>
              )}
              {purchaseResult.needs_agreement_notice && (
                <p className="text-amber-600 mt-2 text-xs">
                  ⚠ Artist 등급의 도슨트 콘텐츠 이용 정책은 아직 논의 중이에요.
                  지금은 건별 구매 방식으로 임시 운영돼요.
                </p>
              )}
            </div>
          )}
        </div>
      )}

      <div className="mt-12 pt-8 border-t border-gray-200">
        <PageBuilderRenderer modules={pageModules} />
      </div>
      </main>
    </>
  );
}
