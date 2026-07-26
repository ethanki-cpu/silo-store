"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/lib/AuthProvider";

type PaymentRow = {
  type: "orders" | "reservations" | "rental_bookings" | "docent_purchases";
  id: string;
  member_name: string;
  description: string;
  amount: number;
  payment_status: string;
  created_at: string;
};

const TYPE_LABEL: Record<PaymentRow["type"], string> = {
  orders: "물품",
  reservations: "클럽모임",
  rental_bookings: "공간 대관",
  docent_purchases: "도슨트",
};

export default function AdminPaymentsPage() {
  // is_admin 인증 가드는 src/app/admin/layout.tsx(EPIC-024)가 공통으로 처리한다.
  // 이 페이지가 렌더링된다는 것 자체가 이미 관리자로 확인됐다는 뜻이므로
  // 이 컴포넌트에서는 session을 API 호출용 access_token으로만 사용한다.
  const { session } = useAuth();

  const [filter, setFilter] = useState<"pending" | "all">("pending");
  const [rows, setRows] = useState<PaymentRow[]>([]);
  const [fetching, setFetching] = useState(true);
  const [confirmingId, setConfirmingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    if (!session) return;
    setFetching(true);
    const res = await fetch(`/api/admin/payments?status=${filter}`, {
      headers: { Authorization: `Bearer ${session.access_token}` },
    });
    const data = await res.json();
    setRows(Array.isArray(data) ? data : []);
    setFetching(false);
  }

  useEffect(() => {
    if (session) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session, filter]);

  async function handleConfirm(row: PaymentRow) {
    setConfirmingId(row.id);
    setError(null);

    const res = await fetch("/api/admin/payments/confirm", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session!.access_token}`,
      },
      body: JSON.stringify({ type: row.type, id: row.id }),
    });

    const data = await res.json();
    setConfirmingId(null);

    if (!res.ok) {
      setError(data.error);
      return;
    }

    await load();
  }

  return (
    <main className="flex-1 p-8 max-w-4xl mx-auto w-full">
      <h1 className="text-2xl font-bold mb-6">결제 확인 관리</h1>

      <div className="flex gap-2 mb-4">
        <button
          onClick={() => setFilter("pending")}
          className={`rounded-md px-3 py-1.5 text-sm border ${
            filter === "pending"
              ? "bg-gray-800 text-white border-gray-800"
              : "bg-white text-gray-700 border-gray-300"
          }`}
        >
          대기중만 보기
        </button>
        <button
          onClick={() => setFilter("all")}
          className={`rounded-md px-3 py-1.5 text-sm border ${
            filter === "all"
              ? "bg-gray-800 text-white border-gray-800"
              : "bg-white text-gray-700 border-gray-300"
          }`}
        >
          확인완료 포함 전체보기
        </button>
      </div>

      {error && <p className="text-sm text-red-600 mb-3">{error}</p>}

      {fetching ? (
        <p className="text-gray-500">불러오는 중...</p>
      ) : rows.length === 0 ? (
        <p className="text-gray-500">표시할 내역이 없어요.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="text-left text-gray-500 border-b border-gray-200">
                <th className="py-2 pr-3">구분</th>
                <th className="py-2 pr-3">신청자</th>
                <th className="py-2 pr-3">내용</th>
                <th className="py-2 pr-3">금액</th>
                <th className="py-2 pr-3">신청일시</th>
                <th className="py-2 pr-3">상태</th>
                <th className="py-2 pr-3"></th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr
                  key={`${row.type}-${row.id}`}
                  className="border-b border-gray-100"
                >
                  <td className="py-2 pr-3">{TYPE_LABEL[row.type]}</td>
                  <td className="py-2 pr-3">{row.member_name}</td>
                  <td className="py-2 pr-3">{row.description}</td>
                  <td className="py-2 pr-3">
                    {row.amount.toLocaleString()}원
                  </td>
                  <td className="py-2 pr-3 text-xs text-gray-500">
                    {new Date(row.created_at).toLocaleString()}
                  </td>
                  <td className="py-2 pr-3">
                    {row.payment_status === "pending_transfer" ? (
                      <span className="text-amber-600">대기중</span>
                    ) : (
                      <span className="text-green-600">확인완료</span>
                    )}
                  </td>
                  <td className="py-2 pr-3">
                    {row.payment_status === "pending_transfer" && (
                      <button
                        onClick={() => handleConfirm(row)}
                        disabled={confirmingId === row.id}
                        className="rounded-md bg-gray-800 text-white px-3 py-1 text-xs disabled:opacity-50"
                      >
                        {confirmingId === row.id ? "처리 중..." : "입금 확인"}
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </main>
  );
}
