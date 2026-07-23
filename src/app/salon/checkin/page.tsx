"use client";

import { useState } from "react";
import { useAuth } from "@/lib/AuthProvider";

type CheckinResult = {
  checkin_at: string;
  fee_charged: number;
  free: boolean;
  guest_count: number;
};

export default function SalonCheckinPage() {
  const { session } = useAuth();
  const [guestCount, setGuestCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<CheckinResult | null>(null);

  async function handleCheckin() {
    setLoading(true);
    setError(null);

    const res = await fetch("/api/salon-checkins", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(session
          ? { Authorization: `Bearer ${session.access_token}` }
          : {}),
      },
      body: JSON.stringify({ guestCount }),
    });

    const data = await res.json();
    setLoading(false);

    if (!res.ok) {
      setError(data.error);
      return;
    }

    setResult(data);
  }

  return (
    <main className="flex-1 p-8 max-w-md mx-auto w-full flex flex-col items-center text-center">
      <h1 className="text-2xl font-bold mb-2">살롱데상 입장</h1>
      <p className="text-gray-600 mb-6">
        2층 살롱데상에 입장하시려면 아래 버튼을 눌러주세요.
      </p>

      <div className="w-full mb-6">
        <label className="block text-sm mb-1 text-left">
          동반 인원 (선택)
        </label>
        <input
          type="number"
          min={0}
          value={guestCount}
          onChange={(e) => setGuestCount(Math.max(0, Number(e.target.value)))}
          className="w-full rounded-md border border-gray-300 px-3 py-2"
        />
        {guestCount > 0 && (
          <p className="text-xs text-gray-400 mt-1 text-left">
            동반 인원 요금 정책은 아직 정해지지 않아서, 안내만 되고
            결제 금액에는 반영되지 않아요.
          </p>
        )}
      </div>

      <button
        onClick={handleCheckin}
        disabled={loading || !!result}
        className="rounded-md bg-gray-800 text-white px-6 py-3 disabled:opacity-50"
      >
        {loading ? "입장 처리 중..." : "입장하기"}
      </button>

      {error && <p className="text-sm text-red-600 mt-4">{error}</p>}

      {result && (
        <div className="mt-6 w-full rounded-md bg-blue-50 border border-blue-200 p-4 text-sm">
          <p className="font-medium text-blue-700">
            {result.free
              ? "무료 입장 완료!"
              : `${result.fee_charged.toLocaleString()}원 결제 대기`}
          </p>
          <p className="text-gray-600 mt-1">
            체크인 시각: {new Date(result.checkin_at).toLocaleString()}
          </p>
          {result.guest_count > 0 && (
            <p className="text-gray-600 mt-1">
              동반 인원 {result.guest_count}명
            </p>
          )}
        </div>
      )}
    </main>
  );
}
