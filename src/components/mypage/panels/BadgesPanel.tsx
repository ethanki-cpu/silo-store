"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { EmptyState } from "../EmptyState";

type Badge = { id: string; badge_name: string; granted_at: string };

export function BadgesPanel({ memberId }: { memberId: string }) {
  const [badges, setBadges] = useState<Badge[]>([]);
  const [loadingData, setLoadingData] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      const { data } = await supabase
        .from("member_badges")
        .select("id, badge_name, granted_at")
        .eq("member_id", memberId)
        .order("granted_at", { ascending: false });

      if (cancelled) return;
      setBadges((data ?? []) as Badge[]);
      setLoadingData(false);
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [memberId]);

  if (loadingData) return <p className="text-gray-500">불러오는 중...</p>;
  if (badges.length === 0) {
    return <EmptyState message="아직 받은 배지가 없어요." />;
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
      {badges.map((b) => (
        <div
          key={b.id}
          className="rounded-lg border border-gray-200 p-4 text-center"
        >
          <p className="font-medium">{b.badge_name}</p>
          <p className="text-xs text-gray-400 mt-1">
            {new Date(b.granted_at).toLocaleDateString()}
          </p>
        </div>
      ))}
    </div>
  );
}
