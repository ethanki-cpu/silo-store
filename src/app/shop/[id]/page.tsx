"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { useAuth } from "@/lib/AuthProvider";

type Persona = {
  id: string;
  name: string;
  type: "grandma" | "grandpa";
  photo_url: string | null;
};

type CurationField =
  | { locked: false; value: string | null; persona?: Persona | null }
  | { locked: true; message: string };

type ItemDetail = {
  id: string;
  name: string;
  photo_url: string | null;
  price: number;
  rental_price_per_day: number;
  category: string | null;
  status: string;
  curation: {
    era_info: CurationField;
    era_context: CurationField;
    maker_info: CurationField;
    previous_owner_story: CurationField;
  };
};

type OrderResult = {
  item_name: string;
  order_type: "purchase" | "rental";
  rental_days: number | null;
  price_charged: number;
  discount_applied_pct: number;
  point_earned: number;
  payment_status: "pending_transfer";
};

const CURATION_LABELS: Record<keyof ItemDetail["curation"], string> = {
  era_info: "제작 시기",
  era_context: "시대 배경",
  maker_info: "제작자·기법",
  previous_owner_story: "이전 주인 사연",
};

const CURATION_ORDER: (keyof ItemDetail["curation"])[] = [
  "era_info",
  "era_context",
  "maker_info",
  "previous_owner_story",
];

export default function ItemDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { session, loading: authLoading } = useAuth();
  const [item, setItem] = useState<ItemDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [fetching, setFetching] = useState(true);

  const [rentalDays, setRentalDays] = useState(1);
  const [orderSubmitting, setOrderSubmitting] = useState<
    "purchase" | "rental" | null
  >(null);
  const [orderResult, setOrderResult] = useState<OrderResult | null>(null);
  const [orderError, setOrderError] = useState<string | null>(null);

  useEffect(() => {
    if (authLoading) return;

    async function load() {
      setFetching(true);
      setError(null);

      const res = await fetch(`/api/items/${id}`, {
        headers: session
          ? { Authorization: `Bearer ${session.access_token}` }
          : {},
      });

      if (!res.ok) {
        setError("물품 정보를 불러오지 못했어요.");
        setFetching(false);
        return;
      }

      const data = (await res.json()) as ItemDetail;
      setItem(data);
      setFetching(false);
    }

    load();
  }, [id, session, authLoading]);

  async function handleOrder(orderType: "purchase" | "rental") {
    setOrderSubmitting(orderType);
    setOrderError(null);

    const res = await fetch("/api/orders", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(session
          ? { Authorization: `Bearer ${session.access_token}` }
          : {}),
      },
      body: JSON.stringify({
        itemId: id,
        orderType,
        ...(orderType === "rental" ? { rentalDays } : {}),
      }),
    });

    const data = await res.json();
    setOrderSubmitting(null);

    if (!res.ok) {
      setOrderError(data.error);
      return;
    }

    setOrderResult(data);
  }

  if (fetching) {
    return <main className="flex-1 p-8">불러오는 중...</main>;
  }

  if (error || !item) {
    return (
      <main className="flex-1 p-8">
        <p className="text-red-600">{error ?? "물품을 찾을 수 없어요."}</p>
      </main>
    );
  }

  return (
    <main className="flex-1 p-8 max-w-2xl mx-auto w-full">
      {item.photo_url && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={item.photo_url}
          alt={item.name}
          className="w-full aspect-square object-cover rounded-lg mb-4"
        />
      )}
      <h1 className="text-2xl font-bold">{item.name}</h1>
      <p className="text-lg text-gray-700 mt-1">
        구매가 {item.price.toLocaleString()}원 · 대여가{" "}
        {item.rental_price_per_day.toLocaleString()}원/일
      </p>

      <div className="mt-4 mb-8 rounded-lg border border-gray-200 p-4 space-y-3">
        <div className="flex items-center gap-2">
          <button
            onClick={() => handleOrder("purchase")}
            disabled={orderSubmitting !== null}
            className="rounded-md bg-gray-800 text-white px-3 py-1.5 text-sm disabled:opacity-50"
          >
            {orderSubmitting === "purchase" ? "처리 중..." : "구매하기"}
          </button>

          <input
            type="number"
            min={1}
            value={rentalDays}
            onChange={(e) =>
              setRentalDays(Math.max(1, Number(e.target.value)))
            }
            className="w-16 rounded-md border border-gray-300 px-2 py-1.5 text-sm"
          />
          <span className="text-sm text-gray-600">일</span>
          <button
            onClick={() => handleOrder("rental")}
            disabled={orderSubmitting !== null}
            className="rounded-md bg-gray-800 text-white px-3 py-1.5 text-sm disabled:opacity-50"
          >
            {orderSubmitting === "rental" ? "처리 중..." : "대여하기"}
          </button>
        </div>

        {orderError && <p className="text-sm text-red-600">{orderError}</p>}

        {orderResult && (
          <div className="rounded-md bg-blue-50 border border-blue-200 p-3 text-sm">
            <p className="font-medium text-blue-700">
              {orderResult.order_type === "purchase" ? "구매" : "대여"} 신청
              완료 — 참여비 {orderResult.price_charged.toLocaleString()}원 —
              계좌이체 대기 중
            </p>
            {orderResult.order_type === "rental" && (
              <p className="text-gray-600 mt-1">
                대여 {orderResult.rental_days}일
              </p>
            )}
            {orderResult.discount_applied_pct > 0 && (
              <p className="text-gray-600 mt-1">
                등급 할인 {orderResult.discount_applied_pct}% 적용됨
              </p>
            )}
            {orderResult.point_earned > 0 && (
              <p className="text-gray-600 mt-1">
                적립 예정 포인트 {orderResult.point_earned}P
              </p>
            )}
          </div>
        )}
      </div>

      <div className="space-y-4">
        {CURATION_ORDER.map((key) => {
          const field = item.curation[key];
          return (
            <div key={key} className="rounded-lg border border-gray-200 p-4">
              <p className="text-sm font-medium text-gray-500 mb-2">
                {CURATION_LABELS[key]}
              </p>
              {field.locked ? (
                <div className="relative">
                  <div className="space-y-2 blur-sm select-none pointer-events-none">
                    <div className="h-3 bg-gray-300 rounded w-5/6" />
                    <div className="h-3 bg-gray-300 rounded w-3/4" />
                    <div className="h-3 bg-gray-300 rounded w-2/3" />
                  </div>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-xs font-medium bg-white/90 px-2 py-1 rounded shadow text-gray-700">
                      🔒 {field.message}
                    </span>
                  </div>
                </div>
              ) : (
                <div>
                  {key === "previous_owner_story" && field.persona && (
                    <div className="flex items-center gap-2 mb-2">
                      {field.persona.photo_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={field.persona.photo_url}
                          alt={field.persona.name}
                          className="w-8 h-8 rounded-full object-cover"
                        />
                      ) : (
                        <span className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-sm">
                          {field.persona.type === "grandma" ? "👵" : "👴"}
                        </span>
                      )}
                      <span className="text-sm font-medium text-gray-700">
                        {field.persona.name} {field.persona.type === "grandma" ? "할머니" : "할아버지"}의 사연
                      </span>
                    </div>
                  )}
                  <p className="text-gray-800 whitespace-pre-wrap">
                    {field.value}
                  </p>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </main>
  );
}
