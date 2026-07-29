"use client";

import { WishlistPanel } from "@/components/mypage/panels/WishlistPanel";
import { useMyPageMember } from "@/components/mypage/MyPageContext";
import { PageEditButton } from "@/components/admin/PageEditButton";

export default function MyPageWishlistPage() {
  const memberId = useMyPageMember();

  return (
    <>
      <PageEditButton slug="mypage-wishlist" />
      <div>
      <h2 className="text-lg font-semibold mb-4">나의 위시리스트</h2>
      <WishlistPanel memberId={memberId} />
    </div>
    </>
  );
}
