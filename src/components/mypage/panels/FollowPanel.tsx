"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { EmptyState } from "../EmptyState";

// EPIC-052: "향후 알림 시스템과 연동 가능하도록 설계" — member_follows에
// follower_id/following_id가 이미 분리돼 있어, 알림 기능이 생기면 "누가
// 나를 팔로우했다" 이벤트를 이 테이블의 insert 시점에 그대로 훅킹할 수
// 있다(스키마 변경 없음, 이번 EPIC에서 실제 알림 발송 로직은 만들지 않음).
type FollowRow = { id: string; name: string };

async function resolveNames(ids: string[]): Promise<FollowRow[]> {
  if (ids.length === 0) return [];
  const { data } = await supabase
    .from("public_profiles")
    .select("id, name")
    .in("id", ids);
  return (data ?? []) as FollowRow[];
}

export function FollowPanel({ memberId }: { memberId: string }) {
  const [tab, setTab] = useState<"following" | "followers">("following");
  const [following, setFollowing] = useState<FollowRow[]>([]);
  const [followers, setFollowers] = useState<FollowRow[]>([]);
  const [loadingData, setLoadingData] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      const [{ data: followingIds }, { data: followerIds }] =
        await Promise.all([
          supabase
            .from("member_follows")
            .select("following_id")
            .eq("follower_id", memberId),
          supabase
            .from("member_follows")
            .select("follower_id")
            .eq("following_id", memberId),
        ]);

      const followingList = await resolveNames(
        (followingIds ?? []).map((r) => r.following_id as string),
      );
      const followerList = await resolveNames(
        (followerIds ?? []).map((r) => r.follower_id as string),
      );

      if (cancelled) return;
      setFollowing(followingList);
      setFollowers(followerList);
      setLoadingData(false);
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [memberId]);

  const list = tab === "following" ? following : followers;

  return (
    <div>
      <div className="flex gap-2 mb-4">
        <button
          type="button"
          onClick={() => setTab("following")}
          className={`px-3 py-1.5 rounded-full text-sm border ${
            tab === "following"
              ? "bg-gray-800 text-white border-gray-800"
              : "border-gray-300 text-gray-600 hover:bg-gray-50"
          }`}
        >
          팔로잉 ({following.length})
        </button>
        <button
          type="button"
          onClick={() => setTab("followers")}
          className={`px-3 py-1.5 rounded-full text-sm border ${
            tab === "followers"
              ? "bg-gray-800 text-white border-gray-800"
              : "border-gray-300 text-gray-600 hover:bg-gray-50"
          }`}
        >
          팔로워 ({followers.length})
        </button>
      </div>

      {loadingData ? (
        <p className="text-gray-500">불러오는 중...</p>
      ) : list.length === 0 ? (
        <EmptyState
          message={
            tab === "following"
              ? "아직 팔로우한 회원이 없어요."
              : "아직 나를 팔로우한 회원이 없어요."
          }
        />
      ) : (
        <div className="space-y-2">
          {list.map((m) => (
            <div key={m.id} className="rounded-lg border border-gray-200 p-3">
              {m.name}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
