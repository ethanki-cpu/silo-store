"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { useAuth } from "@/lib/AuthProvider";
import { supabase } from "@/lib/supabaseClient";
import { PageEditButton } from "@/components/admin/PageEditButton";

type Club = {
  id: string;
  name: string;
  weekday: string;
  description: string | null;
  base_price: number;
};

type ClubSession = {
  id: string;
  session_date: string;
  status: string;
};

type ReservationResult = {
  club_name: string;
  session_date: string;
  price_charged: number;
  discount_applied_pct: number;
  point_earned: number;
  is_monthly_free_pick: boolean;
  payment_status: "confirmed" | "pending_transfer";
};

const WEEKDAY_LABEL: Record<string, string> = {
  mon: "월요일",
  tue: "화요일",
  wed: "수요일",
  thu: "목요일",
  fri: "금요일",
  sat: "토요일",
  sun: "일요일",
};

export default function ClubDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { session, member, loading: authLoading } = useAuth();

  const [club, setClub] = useState<Club | null>(null);
  const [sessions, setSessions] = useState<ClubSession[]>([]);
  const [fetching, setFetching] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [priorityBooking, setPriorityBooking] = useState(false);

  const [submittingId, setSubmittingId] = useState<string | null>(null);
  const [results, setResults] = useState<Record<string, ReservationResult>>(
    {},
  );
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    async function load() {
      setFetching(true);
      setLoadError(null);

      const [{ data: clubData, error: clubError }, { data: sessionData }] =
        await Promise.all([
          supabase
            .from("clubs")
            .select("id, name, weekday, description, base_price")
            .eq("id", id)
            .single(),
          supabase
            .from("club_sessions")
            .select("id, session_date, status")
            .eq("club_id", id)
            .eq("status", "open")
            .order("session_date"),
        ]);

      if (clubError || !clubData) {
        setLoadError("클럽 정보를 불러오지 못했어요.");
        setFetching(false);
        return;
      }

      setClub(clubData);
      setSessions(sessionData ?? []);
      setFetching(false);
    }

    load();
  }, [id]);

  useEffect(() => {
    if (member?.membership_rank === undefined) {
      setPriorityBooking(false);
      return;
    }

    supabase
      .from("membership_tiers")
      .select("club_priority_booking")
      .eq("rank", member.membership_rank)
      .single()
      .then(({ data }) => {
        setPriorityBooking(data?.club_priority_booking ?? false);
      });
  }, [member?.membership_rank]);

  async function handleReserve(sessionId: string) {
    setSubmittingId(sessionId);
    setErrors((prev) => ({ ...prev, [sessionId]: "" }));

    const res = await fetch("/api/reservations", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(session
          ? { Authorization: `Bearer ${session.access_token}` }
          : {}),
      },
      body: JSON.stringify({ sessionId }),
    });

    const data = await res.json();
    setSubmittingId(null);

    if (!res.ok) {
      setErrors((prev) => ({ ...prev, [sessionId]: data.error }));
      return;
    }

    setResults((prev) => ({ ...prev, [sessionId]: data }));
  }

  if (fetching || authLoading) {
    return <main className="flex-1 p-8">불러오는 중...</main>;
  }

  if (loadError || !club) {
    return (
      <main className="flex-1 p-8">
        <p className="text-red-600">{loadError ?? "클럽을 찾을 수 없어요."}</p>
      </main>
    );
  }

  return (
    <>
      <PageEditButton slug="clubs-id" />
      <main className="flex-1 p-8 max-w-2xl mx-auto w-full">
      <p className="text-xs font-medium text-blue-600">
        {WEEKDAY_LABEL[club.weekday] ?? club.weekday}
      </p>
      <h1 className="text-2xl font-bold mt-1">{club.name}</h1>
      {club.description && (
        <p className="text-gray-600 mt-2">{club.description}</p>
      )}
      <p className="text-gray-700 mt-2">
        기본 참여비: {club.base_price.toLocaleString()}원
      </p>

      {priorityBooking && (
        <p className="mt-2 inline-block text-xs font-medium text-amber-700 bg-amber-50 border border-amber-200 rounded-full px-2.5 py-1">
          ⭐ 회원님 등급은 우선예약 대상이에요
        </p>
      )}

      <h2 className="text-lg font-semibold mt-8 mb-3">신청 가능한 날짜</h2>

      {sessions.length === 0 ? (
        <p className="text-gray-500">현재 신청 가능한 날짜가 없어요.</p>
      ) : (
        <div className="space-y-3">
          {sessions.map((s) => {
            const result = results[s.id];
            const error = errors[s.id];

            return (
              <div
                key={s.id}
                className="rounded-lg border border-gray-200 p-4"
              >
                <div className="flex items-center justify-between">
                  <span className="font-medium">{s.session_date}</span>
                  {!result && (
                    <button
                      onClick={() => handleReserve(s.id)}
                      disabled={submittingId === s.id}
                      className="rounded-md bg-gray-800 text-white px-3 py-1.5 text-sm disabled:opacity-50"
                    >
                      {submittingId === s.id ? "신청 중..." : "신청하기"}
                    </button>
                  )}
                </div>

                {error && (
                  <p className="text-sm text-red-600 mt-2">{error}</p>
                )}

                {result && (
                  <div className="mt-3 rounded-md bg-blue-50 border border-blue-200 p-3 text-sm">
                    {result.price_charged === 0 ? (
                      <p className="font-medium text-blue-700">
                        {result.is_monthly_free_pick
                          ? "이번 달 무료 선택권으로 무료 신청 완료!"
                          : "회원님 등급은 클럽모임이 항상 무료예요 — 신청 완료!"}
                      </p>
                    ) : (
                      <>
                        <p className="font-medium text-blue-700">
                          참여비 {result.price_charged.toLocaleString()}원 —
                          계좌이체 대기 중
                        </p>
                        {result.discount_applied_pct > 0 && (
                          <p className="text-gray-600 mt-1">
                            등급 할인 {result.discount_applied_pct}% 적용됨
                          </p>
                        )}
                        {result.point_earned > 0 && (
                          <p className="text-gray-600 mt-1">
                            적립 예정 포인트 {result.point_earned}P
                          </p>
                        )}
                      </>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
      </main>
    </>
  );
}
