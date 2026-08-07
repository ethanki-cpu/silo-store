"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { PageHeaderContent } from "@/components/PageHeader";
import { PageEditButton } from "@/components/admin/PageEditButton";
import { useAuth } from "@/lib/AuthProvider";

// EPIC-087-PHASE-E: 지금까지 "물품 대여 문의 콘텐츠는 현재 준비 중입니다."
// 정적 안내만 있던 자리 — 실제 신청 폼으로 교체(item_rental_requests,
// /api/item-rental-requests). 공간 대관(/rental)처럼 실시간 가격 계산이
// 필요한 예약이 아니라 "이런 물품을 이 기간에 빌리고 싶다"는 자유 서술
// 신청이라 폼은 최소한으로 유지한다.
export default function ItemRentalInquiryPage() {
  const { session, loading } = useAuth();
  const router = useRouter();

  const [itemDescription, setItemDescription] = useState("");
  const [desiredStartDate, setDesiredStartDate] = useState("");
  const [desiredEndDate, setDesiredEndDate] = useState("");
  const [contactNote, setContactNote] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!session) {
      router.push("/login");
      return;
    }
    setSubmitting(true);
    setError(null);
    const res = await fetch("/api/item-rental-requests", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({ itemDescription, desiredStartDate, desiredEndDate, contactNote }),
    });
    const data = await res.json();
    setSubmitting(false);
    if (!res.ok) {
      setError(data.error ?? "신청에 실패했어요.");
      return;
    }
    setDone(true);
  }

  return (
    <>
      <PageEditButton slug="space-inquiry-item-rental" />
      <main className="flex-1 p-8 max-w-2xl mx-auto w-full">
        <PageHeaderContent
          title="물품 대여"
          subtitle="스튜디오"
          breadcrumb={[
            { label: "홈", href: "/" },
            { label: "스튜디오" },
            { label: "물품 대여" },
          ]}
          description="대여하고 싶은 물품과 희망 기간을 남겨주시면 확인 후 연락드려요."
        />

        {done ? (
          <p className="mt-6 text-sm text-gray-700">
            신청이 접수됐어요. 확인 후 연락드릴게요.
          </p>
        ) : (
          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">대여하고 싶은 물품</label>
              <textarea
                required
                value={itemDescription}
                onChange={(e) => setItemDescription(e.target.value)}
                rows={3}
                placeholder="예: 빈티지 카메라 2대, 조명 세트"
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">희망 시작일</label>
                <input
                  type="date"
                  value={desiredStartDate}
                  onChange={(e) => setDesiredStartDate(e.target.value)}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">희망 종료일</label>
                <input
                  type="date"
                  value={desiredEndDate}
                  onChange={(e) => setDesiredEndDate(e.target.value)}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">연락처/메모 (선택)</label>
              <textarea
                value={contactNote}
                onChange={(e) => setContactNote(e.target.value)}
                rows={2}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
              />
            </div>

            {error && <p className="text-sm text-red-600">{error}</p>}

            <button
              type="submit"
              disabled={submitting || loading}
              className="rounded-md bg-gray-900 text-white px-4 py-2 text-sm hover:bg-gray-800 disabled:opacity-50"
            >
              {submitting ? "신청 중..." : session ? "신청하기" : "로그인 후 신청하기"}
            </button>
          </form>
        )}
      </main>
    </>
  );
}
