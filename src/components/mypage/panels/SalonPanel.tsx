"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { EmptyState } from "../EmptyState";

type SalonItem = {
  id: string;
  kind: "reservation" | "checkin" | "attendance" | "survey";
  label: string;
  detail: string;
  createdAt: string;
};

// EPIC-052: "나의 살롱" — 참여한 클럽 예약(reservations)/살롱 체크인
// (salon_checkins)/출석체크(daily_checkins)/설문 참여(poll_votes)를 종합
// 표시. 새 테이블 없이 기존 4개 테이블을 그대로 조회한다.
export function SalonPanel({ memberId }: { memberId: string }) {
  const [items, setItems] = useState<SalonItem[]>([]);
  const [loadingData, setLoadingData] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoadingData(true);

      const [reservationsRes, checkinsRes, dailyRes, votesRes] =
        await Promise.all([
          supabase
            .from("reservations")
            .select(
              "id, created_at, payment_status, club_sessions(session_date, clubs(name))",
            )
            .eq("member_id", memberId),
          supabase
            .from("salon_checkins")
            .select("id, checkin_at, hours")
            .eq("member_id", memberId),
          supabase
            .from("daily_checkins")
            .select("id, checkin_date, created_at")
            .eq("member_id", memberId),
          supabase
            .from("poll_votes")
            .select("id, created_at, polls(question)")
            .eq("member_id", memberId),
        ]);

      if (cancelled) return;

      const reservations = (
        (reservationsRes.data ?? []) as unknown as {
          id: string;
          created_at: string;
          payment_status: string;
          club_sessions: {
            session_date: string;
            clubs: { name: string } | null;
          } | null;
        }[]
      ).map<SalonItem>((r) => ({
        id: `reservation-${r.id}`,
        kind: "reservation",
        label: r.club_sessions?.clubs?.name ?? "클럽 모임",
        detail: `${r.club_sessions?.session_date ?? ""} · ${
          r.payment_status === "confirmed" ? "예약 확정" : "예약 대기"
        }`,
        createdAt: r.created_at,
      }));

      const checkins = (
        (checkinsRes.data ?? []) as {
          id: string;
          checkin_at: string;
          hours: number;
        }[]
      ).map<SalonItem>((c) => ({
        id: `checkin-${c.id}`,
        kind: "checkin",
        label: "살롱 체크인",
        detail: `${c.hours}시간 이용`,
        createdAt: c.checkin_at,
      }));

      const daily = (
        (dailyRes.data ?? []) as {
          id: string;
          checkin_date: string;
          created_at: string;
        }[]
      ).map<SalonItem>((d) => ({
        id: `daily-${d.id}`,
        kind: "attendance",
        label: "출석체크",
        detail: d.checkin_date,
        createdAt: d.created_at,
      }));

      const votes = (
        (votesRes.data ?? []) as unknown as {
          id: string;
          created_at: string;
          polls: { question: string } | null;
        }[]
      ).map<SalonItem>((v) => ({
        id: `vote-${v.id}`,
        kind: "survey",
        label: "설문 참여",
        detail: v.polls?.question ?? "설문",
        createdAt: v.created_at,
      }));

      const merged = [...reservations, ...checkins, ...daily, ...votes].sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      );

      setItems(merged);
      setLoadingData(false);
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [memberId]);

  if (loadingData) return <p className="text-gray-500">불러오는 중...</p>;
  if (items.length === 0) {
    return <EmptyState message="아직 살롱 활동 기록이 없어요." />;
  }

  return (
    <div className="space-y-2">
      {items.map((item) => (
        <div key={item.id} className="rounded-lg border border-gray-200 p-3">
          <div className="flex items-center justify-between">
            <p className="font-medium text-sm">{item.label}</p>
            <span className="text-xs text-gray-400">
              {new Date(item.createdAt).toLocaleDateString()}
            </span>
          </div>
          <p className="text-xs text-gray-500 mt-1">{item.detail}</p>
        </div>
      ))}
    </div>
  );
}
