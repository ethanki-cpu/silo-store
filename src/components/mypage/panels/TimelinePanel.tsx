"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { TimelineView } from "@/components/TimelineView";

type Entry = {
  id: string;
  createdAt: string;
  label: string;
  detail?: string;
};

const REASON_LABELS: Record<string, string> = {
  post: "글 작성",
  comment: "댓글 작성",
  like_received: "좋아요 받음",
  best_post: "개념글 승격",
  shop_purchase: "상점 구매",
  shop_rental: "상점 대여",
  venue_rental: "공간 대관",
  club_participation: "클럽 참여",
  attendance: "출석체크",
};

// EPIC-052: "타임라인" — Timeline Engine(src/lib/timelineEngine.ts +
// src/components/TimelineView.tsx)을 그대로 재사용해 글 작성/댓글/좋아요/
// 출석/예약/팔로우 등 활동을 연/월로 묶어 보여준다. 새 활동 로그 테이블을
// 만들지 않고 기존 points_ledger(글/댓글/출석/예약 등 대부분의 활동에 이미
// 포인트가 적립될 때 함께 기록됨)+likes(내가 준 좋아요)+member_follows
// (팔로우)를 조합한다 — "도슨트"/"배지"는 points_ledger에 전용 reason이
// 없어 이번 EPIC에서는 다루지 않음(NEXT_TASK.md 참고).
export function TimelinePanel({ memberId }: { memberId: string }) {
  const [entries, setEntries] = useState<Entry[]>([]);
  const [loadingData, setLoadingData] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoadingData(true);

      const [ledgerRes, likesRes, followsRes] = await Promise.all([
        supabase
          .from("points_ledger")
          .select("id, reason, points, created_at")
          .eq("member_id", memberId),
        supabase
          .from("likes")
          .select("id, created_at, posts(title)")
          .eq("member_id", memberId),
        supabase
          .from("member_follows")
          .select("id, created_at, public_profiles:following_id(name)")
          .eq("follower_id", memberId),
      ]);

      if (cancelled) return;

      const ledgerEntries = (
        (ledgerRes.data ?? []) as {
          id: string;
          reason: string;
          points: number;
          created_at: string;
        }[]
      ).map<Entry>((row) => ({
        id: `ledger-${row.id}`,
        createdAt: row.created_at,
        label: REASON_LABELS[row.reason] ?? row.reason,
        detail: `+${row.points}P`,
      }));

      const likeEntries = (
        (likesRes.data ?? []) as unknown as {
          id: string;
          created_at: string;
          posts: { title: string | null } | null;
        }[]
      ).map<Entry>((row) => ({
        id: `like-${row.id}`,
        createdAt: row.created_at,
        label: "좋아요",
        detail: row.posts?.title ?? undefined,
      }));

      const followEntries = (
        (followsRes.data ?? []) as unknown as {
          id: string;
          created_at: string;
          public_profiles: { name: string } | null;
        }[]
      ).map<Entry>((row) => ({
        id: `follow-${row.id}`,
        createdAt: row.created_at,
        label: "팔로우",
        detail: row.public_profiles?.name ?? undefined,
      }));

      setEntries([...ledgerEntries, ...likeEntries, ...followEntries]);
      setLoadingData(false);
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [memberId]);

  if (loadingData) return <p className="text-gray-500">불러오는 중...</p>;

  return (
    <TimelineView
      entries={entries}
      emptyMessage="아직 활동 기록이 없어요."
      renderItem={(entry) => (
        <div className="flex items-center justify-between">
          <div>
            <p className="font-serif text-gray-900">{entry.label}</p>
            {entry.detail && (
              <p className="text-xs text-gray-400">{entry.detail}</p>
            )}
          </div>
          <span className="text-xs text-gray-400">
            {new Date(entry.createdAt).toLocaleDateString()}
          </span>
        </div>
      )}
    />
  );
}
