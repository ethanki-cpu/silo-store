"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/lib/AuthProvider";
import { supabase } from "@/lib/supabaseClient";
import { MyPageNav } from "@/components/mypage/MyPageNav";
import { MyPageProvider } from "@/components/mypage/MyPageContext";

type Tier = { rank: number; name: string; price: number };

// EPIC-045: 11개 탭이던 /mypage 단일 페이지를 하위 라우트 구조로 재구성 —
// 계정 요약(등급/포인트) 조회 + 로그인 게이트는 모든 하위 라우트가 공유해야
// 하므로 이 layout.tsx로 끌어올리고, memberId는 MyPageProvider로 하위
// page.tsx들에 전달한다(기존 panel 컴포넌트는 memberId prop 그대로 재사용).
export default function MyPageLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { session, loading } = useAuth();
  const router = useRouter();
  const [memberId, setMemberId] = useState<string | null>(null);
  const [myRank, setMyRank] = useState<number | null>(null);
  const [tiers, setTiers] = useState<Tier[]>([]);
  const [totalPoints, setTotalPoints] = useState(0);
  const [fetching, setFetching] = useState(true);

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

      {fetching || !memberId ? (
        <p className="text-gray-500">불러오는 중...</p>
      ) : (
        <>
          <div className="rounded-lg border border-gray-200 p-4 mb-8 flex justify-between text-sm">
            <span>
              현재 등급 <strong>{myTier?.name ?? "-"}</strong>
            </span>
            <span>
              누적 활동 포인트 <strong>{totalPoints.toLocaleString()}P</strong>
            </span>
          </div>

          <MyPageNav />

          <MyPageProvider value={{ memberId }}>{children}</MyPageProvider>
        </>
      )}
    </main>
  );
}
