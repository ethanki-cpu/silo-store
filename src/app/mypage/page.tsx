"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/AuthProvider";
import { supabase } from "@/lib/supabaseClient";

type Tier = { rank: number; name: string; price: number };

type Treasure = {
  order_id: string;
  item_name: string;
  item_photo_url: string | null;
  order_type: "purchase" | "rental";
  created_at: string;
};

export default function MyPage() {
  const { session, loading } = useAuth();
  const router = useRouter();
  const [tiers, setTiers] = useState<Tier[]>([]);
  const [myName, setMyName] = useState<string | null>(null);
  const [myRank, setMyRank] = useState<number | null>(null);
  const [totalPoints, setTotalPoints] = useState(0);
  const [treasures, setTreasures] = useState<Treasure[]>([]);
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
            .select("id, name, membership_rank")
            .eq("auth_user_id", session!.user.id)
            .single(),
          supabase
            .from("membership_tiers")
            .select("rank, name, price")
            .order("rank"),
          supabase.from("points_ledger").select("points"),
        ]);

      setMyName(memberData?.name ?? null);
      setMyRank(memberData?.membership_rank ?? null);
      setTiers(tierData ?? []);
      setTotalPoints(
        (pointsData ?? []).reduce((sum, row) => sum + row.points, 0),
      );

      if (memberData) {
        const { data: orderData } = await supabase
          .from("orders")
          .select("id, order_type, created_at, items(name, photo_url)")
          .eq("member_id", memberData.id)
          .eq("payment_status", "confirmed")
          .order("created_at", { ascending: false });

        const orders = (orderData ?? []) as unknown as {
          id: string;
          order_type: "purchase" | "rental";
          created_at: string;
          items: { name: string; photo_url: string | null } | null;
        }[];

        setTreasures(
          orders.map((o) => ({
            order_id: o.id,
            item_name: o.items?.name ?? "알 수 없는 물품",
            item_photo_url: o.items?.photo_url ?? null,
            order_type: o.order_type,
            created_at: o.created_at,
          })),
        );
      }

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
      <h1 className="text-2xl font-bold mb-6">마이페이지</h1>

      {fetching ? (
        <p className="text-gray-500">불러오는 중...</p>
      ) : (
        <>
          <div className="rounded-lg border border-gray-200 p-4 mb-8">
            <div className="flex justify-between py-1.5 border-b border-gray-100">
              <span className="text-gray-500">이름</span>
              <span>{myName}</span>
            </div>
            <div className="flex justify-between py-1.5 border-b border-gray-100">
              <span className="text-gray-500">이메일</span>
              <span>{session.user.email}</span>
            </div>
            <div className="flex justify-between py-1.5 border-b border-gray-100">
              <span className="text-gray-500">멤버십 등급</span>
              <span>{myTier?.name ?? "-"}</span>
            </div>
            <div className="flex justify-between py-1.5 border-b border-gray-100">
              <span className="text-gray-500">월 회비</span>
              <span>
                {myTier ? `${myTier.price.toLocaleString()}원` : "-"}
              </span>
            </div>
            <div className="flex justify-between py-1.5">
              <span className="text-gray-500">누적 포인트</span>
              <span>{totalPoints.toLocaleString()}P</span>
            </div>
          </div>

          <h2 className="text-lg font-semibold mb-3">Your Treasures</h2>
          {treasures.length === 0 ? (
            <p className="text-gray-500 mb-8">
              아직 입양(구매)한 물품이 없어요.
            </p>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-8">
              {treasures.map((t) => (
                <div
                  key={t.order_id}
                  className="rounded-lg border border-gray-200 overflow-hidden"
                >
                  {t.item_photo_url && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={t.item_photo_url}
                      alt={t.item_name}
                      className="w-full aspect-square object-cover"
                    />
                  )}
                  <div className="p-3">
                    <p className="font-medium text-sm">{t.item_name}</p>
                    <p className="text-xs text-gray-500 mt-1">
                      {t.order_type === "purchase" ? "구매" : "대여"} ·{" "}
                      {new Date(t.created_at).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}

          <h2 className="text-lg font-semibold mb-3">다른 등급이었다면?</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            {tiers.map((tier) => (
              <div
                key={tier.rank}
                className={`rounded-lg border p-4 ${
                  tier.rank === myRank
                    ? "border-blue-500 bg-blue-50 ring-2 ring-blue-500"
                    : "border-gray-200"
                }`}
              >
                <p className="font-semibold">{tier.name}</p>
                <p className="text-sm text-gray-600">
                  {tier.price.toLocaleString()}원/월
                </p>
                {tier.rank === myRank && (
                  <p className="text-xs text-blue-600 mt-1">현재 등급</p>
                )}
              </div>
            ))}
          </div>
        </>
      )}
    </main>
  );
}
