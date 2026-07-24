"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/lib/AuthProvider";
import { supabase } from "@/lib/supabaseClient";
import { WishlistButton } from "@/components/WishlistButton";

type Tier = { rank: number; name: string; price: number };

type Treasure = {
  order_id: string;
  item_name: string;
  item_photo_url: string | null;
  order_type: "purchase" | "rental";
  created_at: string;
};

type MyPost = {
  id: string;
  body: string;
  photo_url: string | null;
  visibility: "public" | "private" | "friends";
  like_count: number;
  created_at: string;
};

type RecentComment = {
  id: string;
  body: string;
  created_at: string;
  post_title: string | null;
  board_name: string | null;
};

type WishlistItem = {
  wishlist_id: string;
  item_id: string;
  item_name: string;
  item_photo_url: string | null;
  price: number;
};

export default function MyPage() {
  const { session, loading } = useAuth();
  const router = useRouter();
  const [tiers, setTiers] = useState<Tier[]>([]);
  const [myRank, setMyRank] = useState<number | null>(null);
  const [totalPoints, setTotalPoints] = useState(0);
  const [treasures, setTreasures] = useState<Treasure[]>([]);
  const [myPosts, setMyPosts] = useState<MyPost[]>([]);
  const [recentComments, setRecentComments] = useState<RecentComment[]>([]);
  const [wishlistItems, setWishlistItems] = useState<WishlistItem[]>([]);
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

      setMyRank(memberData?.membership_rank ?? null);
      setTiers(tierData ?? []);
      setTotalPoints(
        (pointsData ?? []).reduce((sum, row) => sum + row.points, 0),
      );

      if (memberData) {
        const [{ data: orderData }, postsRes, { data: commentData }, { data: wishlistData }] =
          await Promise.all([
            supabase
              .from("orders")
              .select("id, order_type, created_at, items(name, photo_url)")
              .eq("member_id", memberData.id)
              .eq("payment_status", "confirmed")
              .order("created_at", { ascending: false }),
            fetch(`/api/members/${memberData.id}/posts`, {
              headers: { Authorization: `Bearer ${session!.access_token}` },
            }).then((r) => r.json()),
            supabase
              .from("comments")
              .select(
                "id, body, created_at, posts(title, boards(name))",
              )
              .eq("author_id", memberData.id)
              .order("created_at", { ascending: false })
              .limit(10),
            supabase
              .from("wishlists")
              .select("id, item_id, items(name, photo_url, price)")
              .eq("member_id", memberData.id)
              .order("created_at", { ascending: false }),
          ]);

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

        setMyPosts(postsRes?.posts ?? []);

        const comments = (commentData ?? []) as unknown as {
          id: string;
          body: string;
          created_at: string;
          posts: { title: string | null; boards: { name: string } | null } | null;
        }[];

        setRecentComments(
          comments.map((c) => ({
            id: c.id,
            body: c.body,
            created_at: c.created_at,
            post_title: c.posts?.title ?? null,
            board_name: c.posts?.boards?.name ?? null,
          })),
        );

        const wishlistRows = (wishlistData ?? []) as unknown as {
          id: string;
          item_id: string;
          items: { name: string; photo_url: string | null; price: number } | null;
        }[];

        setWishlistItems(
          wishlistRows
            .filter((w) => w.items !== null)
            .map((w) => ({
              wishlist_id: w.id,
              item_id: w.item_id,
              item_name: w.items!.name,
              item_photo_url: w.items!.photo_url,
              price: w.items!.price,
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
  const galleryPosts = myPosts.filter((p) => p.photo_url);
  const textPosts = myPosts.filter((p) => !p.photo_url);
  const ownedItems = treasures.filter((t) => t.order_type === "purchase");

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
          {/* ① 갤러리 */}
          <h2 className="text-lg font-semibold mb-1">갤러리</h2>
          <p className="text-xs text-gray-400 mb-3">
            폴더 기능은 아직 준비 중이에요. 지금은 사진이 있는 글을 모아 보여드려요.
          </p>
          {galleryPosts.length === 0 ? (
            <p className="text-gray-500 mb-8">아직 사진과 함께 남긴 글이 없어요.</p>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-8">
              {galleryPosts.map((post) => (
                <div
                  key={post.id}
                  className="rounded-lg border border-gray-200 overflow-hidden"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={post.photo_url!}
                    alt=""
                    className="w-full aspect-square object-cover"
                  />
                  <div className="p-3">
                    <p className="text-sm text-gray-800 line-clamp-2">
                      {post.body}
                    </p>
                    <p className="text-xs text-gray-400 mt-1">
                      {new Date(post.created_at).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* ② 오늘의 영감 */}
          <h2 className="text-lg font-semibold mb-3">오늘의 영감</h2>
          <div className="rounded-lg border border-dashed border-gray-300 p-4 mb-8 text-center text-gray-400 text-sm">
            준비 중입니다. 짧은 한 줄 기록 기능이 곧 추가될 예정이에요.
          </div>

          {/* ③ 일반 글 */}
          <h2 className="text-lg font-semibold mb-3">일반 글</h2>
          {textPosts.length === 0 ? (
            <p className="text-gray-500 mb-8">아직 작성한 글이 없어요.</p>
          ) : (
            <div className="space-y-2 mb-8">
              {textPosts.map((post) => (
                <div
                  key={post.id}
                  className="rounded-lg border border-gray-200 p-3"
                >
                  <p className="text-gray-800 whitespace-pre-wrap">
                    {post.body}
                  </p>
                  <p className="text-xs text-gray-400 mt-2">
                    좋아요 {post.like_count} ·{" "}
                    {new Date(post.created_at).toLocaleString()}
                  </p>
                </div>
              ))}
            </div>
          )}

          {/* ④ 내가 소유한 물품 */}
          <h2 className="text-lg font-semibold mb-3">내가 소유한 물품</h2>
          {ownedItems.length === 0 ? (
            <p className="text-gray-500 mb-8">아직 소유한 물품이 없어요.</p>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-8">
              {ownedItems.map((t) => (
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
                      {new Date(t.created_at).toLocaleDateString()} 구매
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* ⑤ 사일로상점 구매 물품 */}
          <h2 className="text-lg font-semibold mb-3">사일로상점 구매 물품</h2>
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

          {/* 찜 목록 */}
          <h2 className="text-lg font-semibold mb-3">찜 목록</h2>
          {wishlistItems.length === 0 ? (
            <p className="text-gray-500 mb-8">아직 찜한 물품이 없어요.</p>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-8">
              {wishlistItems.map((w) => (
                <Link
                  key={w.wishlist_id}
                  href={`/shop/${w.item_id}`}
                  className="relative block rounded-lg border border-gray-200 overflow-hidden hover:shadow-md transition-shadow"
                >
                  <span className="absolute top-2 right-2 z-10 rounded-full bg-white/90 w-8 h-8 flex items-center justify-center shadow">
                    <WishlistButton itemId={w.item_id} />
                  </span>
                  {w.item_photo_url && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={w.item_photo_url}
                      alt={w.item_name}
                      className="w-full aspect-square object-cover"
                    />
                  )}
                  <div className="p-3">
                    <p className="font-medium text-sm">{w.item_name}</p>
                    <p className="text-xs text-gray-500 mt-1">
                      {w.price.toLocaleString()}원
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          )}

          {/* ⑥ 최근 댓글 */}
          <h2 className="text-lg font-semibold mb-3">최근 댓글</h2>
          {recentComments.length === 0 ? (
            <p className="text-gray-500 mb-8">아직 작성한 댓글이 없어요.</p>
          ) : (
            <div className="space-y-2 mb-8">
              {recentComments.map((c) => (
                <div
                  key={c.id}
                  className="rounded-lg border border-gray-200 p-3"
                >
                  <p className="text-gray-800">{c.body}</p>
                  <p className="text-xs text-gray-400 mt-2">
                    {c.board_name ?? c.post_title ?? "게시글"}
                    {c.post_title ? ` · ${c.post_title}` : ""} ·{" "}
                    {new Date(c.created_at).toLocaleString()}
                  </p>
                </div>
              ))}
            </div>
          )}

          {/* ⑦ 멤버십 */}
          <h2 className="text-lg font-semibold mb-3">멤버십</h2>
          <div className="rounded-lg border border-gray-200 p-4 mb-8">
            <div className="flex justify-between py-1.5 border-b border-gray-100">
              <span className="text-gray-500">현재 등급</span>
              <span>{myTier?.name ?? "-"}</span>
            </div>
            <div className="flex justify-between py-1.5">
              <span className="text-gray-500">누적 활동 포인트</span>
              <span>{totalPoints.toLocaleString()}P</span>
            </div>
          </div>

          <h3 className="text-sm font-semibold text-gray-500 mb-3">
            다른 등급이었다면?
          </h3>
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
