"use client";

import { FollowPanel } from "@/components/mypage/panels/FollowPanel";
import { useMyPageMember } from "@/components/mypage/MyPageContext";

export default function MyPageFollowPage() {
  const memberId = useMyPageMember();

  return (
    <div>
      <h2 className="text-lg font-semibold mb-4">팔로우</h2>
      <FollowPanel memberId={memberId} />
    </div>
  );
}
