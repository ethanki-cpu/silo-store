"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { EmptyState } from "../EmptyState";

type Certificate = {
  id: string;
  title: string;
  purchasedAt: string;
  status: "confirmed" | "pending_transfer" | "cancelled";
};

// EPIC-052: "나의 도슨트 수료증" — 별도 수료증/진행률 테이블이 없어(스키마
// 추측 금지 원칙), 결제 확정된 도슨트 콘텐츠 구매(docent_purchases)를
// "수료 완료" 개념으로 재해석해 보여준다. 강의 모듈/진행률 개념 자체가
// 없어 실제 %진행률은 표시하지 않고, 결제 완료 날짜만 "완료 날짜"로 표시.
export function DocentCertificatePanel({ memberId }: { memberId: string }) {
  const [items, setItems] = useState<Certificate[]>([]);
  const [loadingData, setLoadingData] = useState(true);

  useEffect(() => {
    let cancelled = false;

    supabase
      .from("docent_purchases")
      .select("id, purchased_at, payment_status, docent_contents(title)")
      .eq("member_id", memberId)
      .order("purchased_at", { ascending: false })
      .then(({ data }) => {
        if (cancelled) return;
        const rows = (data ?? []) as unknown as {
          id: string;
          purchased_at: string;
          payment_status: Certificate["status"];
          docent_contents: { title: string } | null;
        }[];
        setItems(
          rows.map((r) => ({
            id: r.id,
            title: r.docent_contents?.title ?? "알 수 없는 콘텐츠",
            purchasedAt: r.purchased_at,
            status: r.payment_status,
          })),
        );
        setLoadingData(false);
      });

    return () => {
      cancelled = true;
    };
  }, [memberId]);

  if (loadingData) return <p className="text-gray-500">불러오는 중...</p>;

  const confirmed = items.filter((i) => i.status === "confirmed");

  if (items.length === 0) {
    return <EmptyState message="아직 구매한 도슨트 콘텐츠가 없어요." />;
  }

  return (
    <div>
      <p className="text-sm text-gray-500 mb-4">
        수료 완료 {confirmed.length}건 / 전체 {items.length}건
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {items.map((item) => (
          <div
            key={item.id}
            className="rounded-lg border border-gray-200 p-4"
          >
            <p className="font-medium text-sm">{item.title}</p>
            <p className="text-xs text-gray-500 mt-1">
              {item.status === "confirmed"
                ? `완료일 ${new Date(item.purchasedAt).toLocaleDateString()}`
                : item.status === "pending_transfer"
                  ? "결제 확인 대기 중"
                  : "취소됨"}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
