"use client";

import { VisitorsPanel } from "@/components/mypage/panels/VisitorsPanel";
import { useMyPageMember } from "@/components/mypage/MyPageContext";

export default function MyPageVisitorsPage() {
  const memberId = useMyPageMember();

  return (
    <div>
      <h2 className="text-lg font-semibold mb-4">방문자 기록</h2>
      <VisitorsPanel memberId={memberId} />
    </div>
  );
}
