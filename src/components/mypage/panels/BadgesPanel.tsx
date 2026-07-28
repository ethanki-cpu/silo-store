"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { EmptyState } from "@/components/modules/EmptyState";

type Badge = { id: string; badge_name: string; granted_at: string };

// EPIC-052: "받은 배지" — 배지 목록/획득일은 기존 member_badges 그대로.
// "전체 랭킹"/"다음 배지 진행률"은 (1) member_badges가 본인 행만 읽을 수
// 있는 RLS라 다른 회원과의 비교 집계를 클라이언트에서 계산할 수 없고,
// (2) 배지 획득 조건을 정의하는 규칙 테이블이 없어(스키마 추측 금지)
// "다음 배지까지 남은 진행률"을 계산할 근거 자체가 없다 — 실제 데이터
// 없이 꾸며내지 않고, 이번 EPIC에서는 보유 배지 수만 표시하고 랭킹/진행률은
// NEXT_TASK.md에 후속 과제로 남긴다.
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
    return <EmptyState title="아직 받은 배지가 없어요." />;
  }

  return (
    <div>
      <p className="text-sm text-gray-500 mb-4">보유 배지 {badges.length}개</p>
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
    </div>
  );
}
