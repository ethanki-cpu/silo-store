"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/lib/AuthProvider";
import { supabase } from "@/lib/supabaseClient";

// EPIC-087-PHASE-E: "스튜디오 대관/물품대여 신청 관리" — 기존 "스튜디오
// 포트폴리오 등록"(styling_projects CRUD, 신청 관리와 무관)을 완전히
// 대체한 admin nav 항목. 두 섹션: (1) 공간 대관 — rental_bookings(기존
// 실데이터), CLAUDE.md에 이미 문서화된 admin-bypass select RLS로 anon
// 클라이언트에서 직접 조회(새 API 라우트 불필요). (2) 물품 대여 —
// item_rental_requests(신규, PHASE-E에서 처음 생성) + 상태 변경(pending→
// confirmed/cancelled)은 admin-bypass update RLS로 직접 저장.

const FLOOR_LABEL: Record<string, string> = {
  "1f_silostore": "1층 사일로상점",
  "2f_salon": "2층 살롱데상",
};
const SHOOT_TYPE_LABEL: Record<string, string> = {
  photo: "사진촬영",
  video: "영상촬영",
};
const STATUS_LABEL: Record<string, string> = {
  pending_transfer: "입금 대기",
  confirmed: "확정",
  cancelled: "취소",
};
const ITEM_STATUS_OPTIONS = ["pending", "confirmed", "cancelled"] as const;

type RentalBookingRow = {
  id: string;
  member_id: string;
  hours: number;
  headcount: number;
  price_charged: number;
  payment_status: string;
  created_at: string;
  rental_types: { floor: string; shoot_type: string } | null;
};

type ItemRentalRequestRow = {
  id: string;
  member_id: string;
  item_description: string;
  desired_start_date: string | null;
  desired_end_date: string | null;
  contact_note: string | null;
  status: "pending" | "confirmed" | "cancelled";
  created_at: string;
};

export default function AdminRentalsPage() {
  const { session } = useAuth();

  const [bookings, setBookings] = useState<RentalBookingRow[]>([]);
  const [itemRequests, setItemRequests] = useState<ItemRentalRequestRow[]>([]);
  const [nameById, setNameById] = useState<Map<string, string>>(new Map());
  const [fetching, setFetching] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [savingId, setSavingId] = useState<string | null>(null);

  async function load() {
    setFetching(true);
    const [bookingsRes, itemRes] = await Promise.all([
      supabase
        .from("rental_bookings")
        .select("id, member_id, hours, headcount, price_charged, payment_status, created_at, rental_types(floor, shoot_type)")
        .order("created_at", { ascending: false }),
      supabase
        .from("item_rental_requests")
        .select("id, member_id, item_description, desired_start_date, desired_end_date, contact_note, status, created_at")
        .order("created_at", { ascending: false }),
    ]);

    if (bookingsRes.error || itemRes.error) {
      setError(bookingsRes.error?.message ?? itemRes.error?.message ?? "목록을 불러오지 못했어요.");
      setFetching(false);
      return;
    }

    const bookingsData = (bookingsRes.data ?? []) as unknown as RentalBookingRow[];
    const itemData = (itemRes.data ?? []) as ItemRentalRequestRow[];
    setBookings(bookingsData);
    setItemRequests(itemData);

    const memberIds = [...new Set([...bookingsData.map((b) => b.member_id), ...itemData.map((r) => r.member_id)])];
    if (memberIds.length > 0) {
      const { data: profiles } = await supabase.from("public_profiles").select("id, name").in("id", memberIds);
      setNameById(new Map((profiles ?? []).map((p) => [p.id, p.name])));
    }
    setError(null);
    setFetching(false);
  }

  useEffect(() => {
    if (session) load();
  }, [session]);

  async function updateItemStatus(id: string, status: ItemRentalRequestRow["status"]) {
    setSavingId(id);
    const { error: updateError } = await supabase.from("item_rental_requests").update({ status }).eq("id", id);
    setSavingId(null);
    if (updateError) {
      setError(updateError.message);
      return;
    }
    setItemRequests((prev) => prev.map((r) => (r.id === id ? { ...r, status } : r)));
  }

  return (
    <main className="flex-1 p-8 max-w-5xl mx-auto w-full">
      <h1 className="text-2xl font-bold mb-2">스튜디오 대관/물품대여 신청 관리</h1>
      <div className="flex gap-3 mb-6 text-sm">
        <a href="/rental" target="_blank" rel="noreferrer" className="text-blue-600 hover:underline">
          공간 대관 신청 페이지 보기/수정 →
        </a>
        <a href="/space-inquiry/item-rental" target="_blank" rel="noreferrer" className="text-blue-600 hover:underline">
          물품 대여 신청 페이지 보기/수정 →
        </a>
        <Link href="/admin/projects/new" className="text-gray-400 hover:underline">
          (스튜디오 포트폴리오 등록은 여기로 이동)
        </Link>
      </div>

      {error && <p className="text-sm text-red-600 mb-3">{error}</p>}

      {fetching ? (
        <p className="text-gray-500">불러오는 중...</p>
      ) : (
        <>
          <section className="mb-10">
            <h2 className="text-lg font-semibold mb-3">공간 대관 신청</h2>
            {bookings.length === 0 ? (
              <p className="text-sm text-gray-400">신청 내역이 없어요.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm border-collapse">
                  <thead>
                    <tr className="text-left text-gray-500 border-b border-gray-200">
                      <th className="py-2 pr-3">신청자</th>
                      <th className="py-2 pr-3">대관 내용</th>
                      <th className="py-2 pr-3">금액</th>
                      <th className="py-2 pr-3">상태</th>
                      <th className="py-2 pr-3">신청일</th>
                    </tr>
                  </thead>
                  <tbody>
                    {bookings.map((b) => (
                      <tr key={b.id} className="border-b border-gray-100">
                        <td className="py-2 pr-3">{nameById.get(b.member_id) ?? "알 수 없음"}</td>
                        <td className="py-2 pr-3">
                          {FLOOR_LABEL[b.rental_types?.floor ?? ""] ?? b.rental_types?.floor}{" "}
                          {SHOOT_TYPE_LABEL[b.rental_types?.shoot_type ?? ""] ?? b.rental_types?.shoot_type} (
                          {b.hours}시간, {b.headcount}명)
                        </td>
                        <td className="py-2 pr-3">{b.price_charged.toLocaleString()}원</td>
                        <td className="py-2 pr-3">
                          <span className="px-2 py-0.5 rounded text-xs bg-gray-100 text-gray-700">
                            {STATUS_LABEL[b.payment_status] ?? b.payment_status}
                          </span>
                        </td>
                        <td className="py-2 pr-3 text-xs text-gray-500">
                          {new Date(b.created_at).toLocaleString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            <p className="text-xs text-gray-400 mt-2">
              입금 확인/상태 변경은 <Link href="/admin/payments" className="underline">결제 관리</Link>에서 처리해요.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold mb-3">물품 대여 신청</h2>
            {itemRequests.length === 0 ? (
              <p className="text-sm text-gray-400">신청 내역이 없어요.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm border-collapse">
                  <thead>
                    <tr className="text-left text-gray-500 border-b border-gray-200">
                      <th className="py-2 pr-3">신청자</th>
                      <th className="py-2 pr-3">물품/기간</th>
                      <th className="py-2 pr-3">연락처/메모</th>
                      <th className="py-2 pr-3">상태</th>
                      <th className="py-2 pr-3">신청일</th>
                    </tr>
                  </thead>
                  <tbody>
                    {itemRequests.map((r) => (
                      <tr key={r.id} className="border-b border-gray-100">
                        <td className="py-2 pr-3">{nameById.get(r.member_id) ?? "알 수 없음"}</td>
                        <td className="py-2 pr-3 max-w-xs">
                          <p>{r.item_description}</p>
                          {(r.desired_start_date || r.desired_end_date) && (
                            <p className="text-xs text-gray-400">
                              {r.desired_start_date ?? "-"} ~ {r.desired_end_date ?? "-"}
                            </p>
                          )}
                        </td>
                        <td className="py-2 pr-3 text-xs text-gray-500">{r.contact_note ?? "-"}</td>
                        <td className="py-2 pr-3">
                          <select
                            value={r.status}
                            onChange={(e) => updateItemStatus(r.id, e.target.value as ItemRentalRequestRow["status"])}
                            disabled={savingId === r.id}
                            className="rounded-md border border-gray-300 px-2 py-1 text-xs"
                          >
                            {ITEM_STATUS_OPTIONS.map((s) => (
                              <option key={s} value={s}>
                                {s === "pending" ? "대기" : s === "confirmed" ? "확정" : "취소"}
                              </option>
                            ))}
                          </select>
                        </td>
                        <td className="py-2 pr-3 text-xs text-gray-500">
                          {new Date(r.created_at).toLocaleString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </>
      )}
    </main>
  );
}
