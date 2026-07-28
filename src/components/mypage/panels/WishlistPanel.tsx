"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";
import { WishlistButton } from "@/components/WishlistButton";
import { EmptyState } from "@/components/modules/EmptyState";

type WishlistItem = {
  wishlist_id: string;
  item_id: string;
  item_name: string;
  item_photo_url: string | null;
  price: number;
};

export function WishlistPanel({ memberId }: { memberId: string }) {
  const [items, setItems] = useState<WishlistItem[]>([]);
  const [loadingData, setLoadingData] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      const { data } = await supabase
        .from("wishlists")
        .select("id, item_id, items(name, photo_url, price)")
        .eq("member_id", memberId)
        .order("created_at", { ascending: false });

      if (cancelled) return;

      const rows = (data ?? []) as unknown as {
        id: string;
        item_id: string;
        items: { name: string; photo_url: string | null; price: number } | null;
      }[];

      setItems(
        rows
          .filter((w) => w.items !== null)
          .map((w) => ({
            wishlist_id: w.id,
            item_id: w.item_id,
            item_name: w.items!.name,
            item_photo_url: w.items!.photo_url,
            price: w.items!.price,
          })),
      );
      setLoadingData(false);
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [memberId]);

  if (loadingData) return <p className="text-gray-500">불러오는 중...</p>;
  if (items.length === 0) {
    return <EmptyState title="아직 찜한 물품이 없어요." />;
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
      {items.map((w) => (
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
  );
}
