"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { useAuth } from "@/lib/AuthProvider";
import { PageEditButton } from "@/components/admin/PageEditButton";

type ContentDetail = {
  id: string;
  title: string;
  keywords: string | null;
  is_free: boolean;
  price: number;
  cover_image: string | null;
  body_url: string | null;
  purchased: boolean;
};

type PurchaseResult = {
  price_charged: number;
  discount_applied_pct: number;
  is_monthly_free: boolean;
  payment_status: "confirmed" | "pending_transfer";
  needs_agreement_notice: boolean;
};

export default function DocentDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { session, loading: authLoading } = useAuth();

  const [content, setContent] = useState<ContentDetail | null>(null);
  const [fetching, setFetching] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [purchasing, setPurchasing] = useState(false);
  const [purchaseError, setPurchaseError] = useState<string | null>(null);
  const [purchaseResult, setPurchaseResult] = useState<PurchaseResult | null>(
    null,
  );

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

      <h1 className="text-2xl font-bold">{content.title}</h1>
      {content.keywords && (
        <p className="text-sm text-gray-500 mt-1">{content.keywords}</p>
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

          <button
            onClick={handlePurchase}
            disabled={purchasing || !session}
            className="rounded-md bg-gray-800 text-white px-4 py-2 disabled:opacity-50"
          >
            {purchasing ? "처리 중..." : "구매하기"}
          </button>

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
                    참여비 {purchaseResult.price_charged.toLocaleString()}원 —
                    계좌이체 대기 중
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
      </main>
    </>
  );
}
