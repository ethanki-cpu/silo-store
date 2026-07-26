"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/lib/AuthProvider";
import { supabase } from "@/lib/supabaseClient";
import { MyPageNav } from "@/components/mypage/MyPageNav";
import type { MyPageTabId } from "@/components/mypage/mypageConfig";
import { CollectionsPanel } from "@/components/mypage/panels/CollectionsPanel";
import { WishlistPanel } from "@/components/mypage/panels/WishlistPanel";
import { FollowPanel } from "@/components/mypage/panels/FollowPanel";
import { BadgesPanel } from "@/components/mypage/panels/BadgesPanel";
import { CommentsPanel } from "@/components/mypage/panels/CommentsPanel";
import { VisitorsPanel } from "@/components/mypage/panels/VisitorsPanel";
import { PlaceholderPanel } from "@/components/mypage/panels/PlaceholderPanel";

type Tier = { rank: number; name: string; price: number };

export default function MyPage() {
  const { session, loading } = useAuth();
  const router = useRouter();
  const [memberId, setMemberId] = useState<string | null>(null);
  const [myRank, setMyRank] = useState<number | null>(null);
  const [tiers, setTiers] = useState<Tier[]>([]);
  const [totalPoints, setTotalPoints] = useState(0);
  const [fetching, setFetching] = useState(true);
  const [activeTab, setActiveTab] = useState<MyPageTabId>("collections");

  useEffect(() => {
    if (!loading && !session) {
      router.replace("/login");
    }
  }, [loading, session, router]);

  useEffect(() => {
    if (!session) return;

    async function load() {
      const [{ data: memberData }, { data: tierData }, { data: pointsData }] =
        await Promise.all([
          supabase
            .from("members")
            .select("id, membership_rank")
            .eq("auth_user_id", session!.user.id)
            .single(),
          supabase
            .from("membership_tiers")
            .select("rank, name, price")
            .order("rank"),
          supabase.from("points_ledger").select("points"),
        ]);

      setMemberId(memberData?.id ?? null);
      setMyRank(memberData?.membership_rank ?? null);
      setTiers(tierData ?? []);
      setTotalPoints(
        (pointsData ?? []).reduce((sum, row) => sum + row.points, 0),
      );
      setFetching(false);
    }

    load();
  }, [session]);

  if (loading || !session) {
    return null;
  }

  const myTier = tiers.find((t) => t.rank === myRank);

  return (
    <main className="flex-1 p-8 max-w-3xl mx-auto w-full">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">마이페이지</h1>
        <Link
          href="/settings"
          className="text-sm text-gray-500 hover:underline"
        >
          설정
        </Link>
      </div>

      {fetching ? (
        <p className="text-gray-500">불러오는 중...</p>
      ) : (
        <>
          {/* 계정 요약 (등급/포인트) — 11개 탭 밖의 기본 정보 */}
          <div className="rounded-lg border border-gray-200 p-4 mb-8 flex justify-between text-sm">
            <span>
              현재 등급 <strong>{myTier?.name ?? "-"}</strong>
            </span>
            <span>
              누적 활동 포인트 <strong>{totalPoints.toLocaleString()}P</strong>
            </span>
          </div>

          <MyPageNav activeTab={activeTab} onSelect={setActiveTab} />

          {memberId && (
            <>
              {activeTab === "collections" && (
                <CollectionsPanel memberId={memberId} />
              )}
              {activeTab === "wishlist" && (
                <WishlistPanel memberId={memberId} />
              )}
              {activeTab === "follow" && <FollowPanel memberId={memberId} />}
              {activeTab === "salon" && (
                <PlaceholderPanel label="나의 살롱" />
              )}
              {activeTab === "docent-certificate" && (
                <PlaceholderPanel label="나의 도슨트 수료증" />
              )}
              {activeTab === "space" && <PlaceholderPanel label="나의 공간" />}
              {activeTab === "exhibition" && (
                <PlaceholderPanel label="나의 전시회" />
              )}
              {activeTab === "badges" && <BadgesPanel memberId={memberId} />}
              {activeTab === "comments" && (
                <CommentsPanel memberId={memberId} />
              )}
              {activeTab === "timeline" && (
                <PlaceholderPanel label="타임라인" />
              )}
              {activeTab === "visitors" && (
                <VisitorsPanel memberId={memberId} />
              )}
            </>
          )}
        </>
      )}
    </main>
  );
}
