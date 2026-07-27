"use client";

import { WishlistPanel } from "@/components/mypage/panels/WishlistPanel";
import { useMyPageMember } from "@/components/mypage/MyPageContext";

export default function MyPageWishlistPage() {
  const memberId = useMyPageMember();

  return (
    <div>
      <h2 className="text-lg font-semibold mb-4">나의 위시리스트</h2>
      <WishlistPanel memberId={memberId} />
    </div>
  );
}
