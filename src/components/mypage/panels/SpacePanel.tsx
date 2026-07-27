"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";
import { EmptyState } from "../EmptyState";

type SpaceBooking = {
  id: string;
  floor: string;
  shootType: string;
  bookingDate: string;
  status: string;
};

// EPIC-052: "나의 공간" — 대관/예약 내역은 기존 rental_bookings를 그대로
// 조회한다. "스타일링 신청 내역"은 대응하는 고객 신청 테이블이 없어
// (styling_projects는 관리자 포트폴리오, 고객 신청 기록이 아님) 표시하지
// 않고, 대신 Studio 게시판(공간 스타일링)으로 안내한다(NEXT_TASK.md 참고).
export function SpacePanel({ memberId }: { memberId: string }) {
  const [bookings, setBookings] = useState<SpaceBooking[]>([]);
  const [loadingData, setLoadingData] = useState(true);

  useEffect(() => {
    let cancelled = false;

    supabase
      .from("rental_bookings")
      .select(
        "id, booking_date, payment_status, rental_types(floor, shoot_type)",
      )
      .eq("member_id", memberId)
      .order("booking_date", { ascending: false })
      .then(({ data }) => {
        if (cancelled) return;
        const rows = (data ?? []) as unknown as {
          id: string;
          booking_date: string;
          payment_status: string;
          rental_types: { floor: string; shoot_type: string } | null;
        }[];
        setBookings(
          rows.map((r) => ({
            id: r.id,
            floor:
              r.rental_types?.floor === "2f_salon"
                ? "2층 살롱데상"
                : "1층 사일로상점",
            shootType: r.rental_types?.shoot_type === "video" ? "영상" : "사진",
            bookingDate: r.booking_date,
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

  return (
    <div>
      {bookings.length === 0 ? (
        <EmptyState message="아직 대관 예약 내역이 없어요." />
      ) : (
        <div className="space-y-2 mb-6">
          {bookings.map((b) => (
            <div key={b.id} className="rounded-lg border border-gray-200 p-3">
              <div className="flex items-center justify-between">
                <p className="font-medium text-sm">
                  {b.floor} · {b.shootType} 촬영
                </p>
                <span className="text-xs text-gray-400">
                  {new Date(b.bookingDate).toLocaleDateString()}
                </span>
              </div>
              <p className="text-xs text-gray-500 mt-1">
                {b.status === "confirmed"
                  ? "예약 확정"
                  : b.status === "pending_transfer"
                    ? "입금 확인 대기"
                    : "취소됨"}
              </p>
            </div>
          ))}
        </div>
      )}

      <p className="text-sm text-gray-500">
        공간 스타일링 신청은{" "}
        <Link href="/boards" className="text-gray-800 underline">
          Studio 게시판(공간 스타일링)
        </Link>
        에서 확인할 수 있어요.
      </p>
    </div>
  );
}
