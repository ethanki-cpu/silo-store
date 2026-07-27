"use client";

import { SpacePanel } from "@/components/mypage/panels/SpacePanel";
import { useMyPageMember } from "@/components/mypage/MyPageContext";

export default function MyPageSpacePage() {
  const memberId = useMyPageMember();

  return (
    <div>
      <h2 className="text-lg font-semibold mb-4">나의 공간</h2>
      <SpacePanel memberId={memberId} />
    </div>
  );
}
