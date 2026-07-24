"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/lib/AuthProvider";
import { supabase } from "@/lib/supabaseClient";

export function WishlistButton({
  itemId,
  className,
}: {
  itemId: string;
  className?: string;
}) {
  const { session, member } = useAuth();
  const [wishlisted, setWishlisted] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!member) {
      setWishlisted(false);
      return;
    }

    supabase
      .from("wishlists")
      .select("id")
      .eq("item_id", itemId)
      .eq("member_id", member.id)
      .maybeSingle()
      .then(({ data }) => setWishlisted(!!data));
  }, [member, itemId]);

  async function handleClick(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();

    if (!session) {
      window.location.href = "/login";
      return;
    }

    setLoading(true);
    const res = await fetch(`/api/items/${itemId}/wishlist`, {
      method: "POST",
      headers: { Authorization: `Bearer ${session.access_token}` },
    });
    const data = await res.json();
    setLoading(false);

    if (res.ok) {
      setWishlisted(data.wishlisted);
    }
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={loading}
      aria-label={wishlisted ? "찜 해제" : "찜하기"}
      aria-pressed={wishlisted}
      className={
        className ??
        "text-lg leading-none disabled:opacity-50"
      }
    >
      {wishlisted ? "❤️" : "🤍"}
    </button>
  );
}
