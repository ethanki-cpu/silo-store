"use client";

import { ExhibitionPanel } from "@/components/mypage/panels/ExhibitionPanel";
import { useMyPageMember } from "@/components/mypage/MyPageContext";

export default function MyPageExhibitionPage() {
  const memberId = useMyPageMember();

  return (
    <div>
      <h2 className="text-lg font-semibold mb-4">나의 전시회</h2>
      <ExhibitionPanel memberId={memberId} />
    </div>
  );
}
