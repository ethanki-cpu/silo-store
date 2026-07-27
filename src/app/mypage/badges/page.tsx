"use client";

import { BadgesPanel } from "@/components/mypage/panels/BadgesPanel";
import { useMyPageMember } from "@/components/mypage/MyPageContext";

export default function MyPageBadgesPage() {
  const memberId = useMyPageMember();

  return (
    <div>
      <h2 className="text-lg font-semibold mb-4">받은 배지</h2>
      <BadgesPanel memberId={memberId} />
    </div>
  );
}
