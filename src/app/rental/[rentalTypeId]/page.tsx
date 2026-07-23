"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useParams } from "next/navigation";
import { useAuth } from "@/lib/AuthProvider";
import { supabase } from "@/lib/supabaseClient";

type RentalType = {
  id: string;
  floor: string;
  shoot_type: string;
  weekday_price: number;
  weekend_price: number;
  base_headcount: number;
  extra_person_hourly_fee: number;
};

type BookingResult = {
  booking_date: string;
  is_weekend: boolean;
  hours: number;
  headcount: number;
  price_charged: number;
  point_earned_pct: number;
  point_earned: number;
  payment_status: "pending_transfer";
};

const FLOOR_LABEL: Record<string, string> = {
  "1f_silostore": "1층 사일로상점",
  "2f_salon": "2층 살롱데상",
};

const SHOOT_TYPE_LABEL: Record<string, string> = {
  photo: "사진촬영",
  video: "영상촬영",
};

const WEEKDAY_KR = ["일", "월", "화", "수", "목", "금", "토"];

export default function RentalBookingPage() {
  const { rentalTypeId } = useParams<{ rentalTypeId: string }>();
  const { session } = useAuth();

  const [rentalType, setRentalType] = useState<RentalType | null>(null);
  const [fetching, setFetching] = useState(true);

  const [bookingDate, setBookingDate] = useState("");
  const [hours, setHours] = useState(1);
  const [headcount, setHeadcount] = useState(1);

  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<BookingResult | null>(null);

  useEffect(() => {
    async function load() {
      setFetching(true);
      const { data } = await supabase
        .from("rental_types")
        .select(
          "id, floor, shoot_type, weekday_price, weekend_price, base_headcount, extra_person_hourly_fee",
        )
        .eq("id", rentalTypeId)
        .single();
      setRentalType(data);
      setFetching(false);
    }

    load();
  }, [rentalTypeId]);

  const selectedDayLabel = bookingDate
    ? (() => {
        const day = new Date(`${bookingDate}T00:00:00`).getDay();
        const isWeekend = day === 0 || day === 6;
        return `${WEEKDAY_KR[day]}요일 (${isWeekend ? "주말" : "평일"} 요금)`;
      })()
    : null;

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const res = await fetch("/api/rental-bookings", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(session
          ? { Authorization: `Bearer ${session.access_token}` }
          : {}),
      },
      body: JSON.stringify({ rentalTypeId, bookingDate, hours, headcount }),
    });

    const data = await res.json();
    setLoading(false);

    if (!res.ok) {
      setError(data.error);
      return;
    }

    setResult(data);
  }

  if (fetching) {
    return <main className="flex-1 p-8">불러오는 중...</main>;
  }

  if (!rentalType) {
    return (
      <main className="flex-1 p-8">
        <p className="text-red-600">대관 종류를 찾을 수 없어요.</p>
      </main>
    );
  }

  return (
    <main className="flex-1 p-8 max-w-xl mx-auto w-full">
      <p className="text-xs font-medium text-blue-600">
        {FLOOR_LABEL[rentalType.floor] ?? rentalType.floor}
      </p>
      <h1 className="text-2xl font-bold mt-1 mb-6">
        {SHOOT_TYPE_LABEL[rentalType.shoot_type] ?? rentalType.shoot_type} 대관
        예약
      </h1>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm mb-1">날짜</label>
          <input
            type="date"
            required
            value={bookingDate}
            onChange={(e) => setBookingDate(e.target.value)}
            className="w-full rounded-md border border-gray-300 px-3 py-2"
          />
          {selectedDayLabel && (
            <p className="text-xs text-gray-500 mt-1">{selectedDayLabel}</p>
          )}
        </div>

        <div>
          <label className="block text-sm mb-1">시간 수</label>
          <input
            type="number"
            min={1}
            required
            value={hours}
            onChange={(e) => setHours(Math.max(1, Number(e.target.value)))}
            className="w-full rounded-md border border-gray-300 px-3 py-2"
          />
        </div>

        <div>
          <label className="block text-sm mb-1">
            인원 수 (기준 {rentalType.base_headcount}명, 초과 시 1인당{" "}
            {rentalType.extra_person_hourly_fee.toLocaleString()}원/시간 추가)
          </label>
          <input
            type="number"
            min={1}
            required
            value={headcount}
            onChange={(e) =>
              setHeadcount(Math.max(1, Number(e.target.value)))
            }
            className="w-full rounded-md border border-gray-300 px-3 py-2"
          />
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <button
          type="submit"
          disabled={loading}
          className="rounded-md bg-gray-800 text-white px-4 py-2 disabled:opacity-50"
        >
          {loading ? "예약 중..." : "예약하기"}
        </button>
      </form>

      {result && (
        <div className="mt-6 rounded-md bg-blue-50 border border-blue-200 p-4 text-sm">
          <p className="font-medium text-blue-700">
            예약 완료 — {result.booking_date} (
            {result.is_weekend ? "주말" : "평일"}) · {result.hours}시간 ·{" "}
            {result.headcount}명
          </p>
          <p className="text-gray-700 mt-2">
            최종 결제 금액: {result.price_charged.toLocaleString()}원 —
            계좌이체 대기 중
          </p>
          {result.point_earned > 0 && (
            <p className="text-gray-600 mt-1">
              적립 포인트: {result.point_earned}P ({result.point_earned_pct}%)
            </p>
          )}
        </div>
      )}
    </main>
  );
}
