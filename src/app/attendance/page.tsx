"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/AuthProvider";
import { PageEditButton } from "@/components/admin/PageEditButton";

function todayDateString(): string {
  return new Date().toISOString().slice(0, 10);
}

export default function AttendancePage() {
  const { session, loading } = useAuth();
  const router = useRouter();

  const [dates, setDates] = useState<string[]>([]);
  const [checkedInToday, setCheckedInToday] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [checkingIn, setCheckingIn] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!loading && !session) {
      router.replace("/login");
    }
  }, [loading, session, router]);

  async function load() {
    if (!session) return;
    setFetching(true);
    const res = await fetch("/api/attendance", {
      headers: { Authorization: `Bearer ${session.access_token}` },
      cache: "no-store",
    });
    const data = await res.json();
    if (res.ok) {
      setDates(data.dates ?? []);
      setCheckedInToday(data.checkedInToday ?? false);
    }
    setFetching(false);
  }

  useEffect(() => {
    load();
  }, [session]);

  async function handleCheckin() {
    if (!session) return;
    setCheckingIn(true);
    setError(null);
    setMessage(null);

    const res = await fetch("/api/attendance", {
      method: "POST",
      headers: { Authorization: `Bearer ${session.access_token}` },
    });
    const data = await res.json();
    setCheckingIn(false);

    if (!res.ok) {
      setError(data.error);
      return;
    }

    setMessage(`출석 완료! ${data.point_earned}P 적립되었어요.`);
    load();
  }

  if (loading || !session) {
    return null;
  }

  const now = new Date();
  const year = now.getUTCFullYear();
  const month = now.getUTCMonth();
  const firstWeekday = new Date(Date.UTC(year, month, 1)).getUTCDay();
  const daysInMonth = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
  const monthDates = new Set(
    dates.filter((d) => d.startsWith(`${year}-${String(month + 1).padStart(2, "0")}`)),
  );

  const cells: (number | null)[] = [
    ...Array(firstWeekday).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];

  const today = todayDateString();

  return (
    <>
      <PageEditButton slug="attendance" />
      <main className="flex-1 p-8 max-w-md mx-auto w-full">
      <h1 className="text-2xl font-bold mb-6">출석체크</h1>

      <button
        onClick={handleCheckin}
        disabled={checkedInToday || checkingIn}
        className="w-full rounded-md bg-gray-800 text-white px-4 py-3 font-medium disabled:opacity-50 mb-4"
      >
        {checkedInToday
          ? "오늘 출석 완료"
          : checkingIn
            ? "처리 중..."
            : "오늘 출석하기"}
      </button>

      {error && <p className="text-sm text-red-600 mb-4">{error}</p>}
      {message && <p className="text-sm text-green-600 mb-4">{message}</p>}

      {fetching ? (
        <p className="text-gray-500">불러오는 중...</p>
      ) : (
        <div>
          <h2 className="text-sm font-semibold text-gray-600 mb-2">
            {year}년 {month + 1}월 출석 현황
          </h2>
          <div className="grid grid-cols-7 gap-1 text-center text-xs text-gray-400 mb-1">
            {["일", "월", "화", "수", "목", "금", "토"].map((d) => (
              <div key={d}>{d}</div>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-1">
            {cells.map((day, idx) => {
              if (day === null) return <div key={idx} />;
              const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
              const checked = monthDates.has(dateStr);
              const isToday = dateStr === today;
              return (
                <div
                  key={idx}
                  className={`aspect-square rounded-md flex items-center justify-center text-sm ${
                    checked
                      ? "bg-green-500 text-white font-semibold"
                      : isToday
                        ? "border border-gray-400 text-gray-700"
                        : "text-gray-400"
                  }`}
                >
                  {day}
                </div>
              );
            })}
          </div>
        </div>
      )}
      </main>
    </>
  );
}
