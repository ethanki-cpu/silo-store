"use client";

import { TimelinePanel } from "@/components/mypage/panels/TimelinePanel";
import { useMyPageMember } from "@/components/mypage/MyPageContext";
import { PageEditButton } from "@/components/admin/PageEditButton";

export default function MyPageTimelinePage() {
  const memberId = useMyPageMember();

  return (
    <>
      <PageEditButton slug="mypage-timeline" />
      <div>
      <h2 className="text-lg font-semibold mb-4">타임라인</h2>
      <TimelinePanel memberId={memberId} />
    </div>
    </>
  );
}
