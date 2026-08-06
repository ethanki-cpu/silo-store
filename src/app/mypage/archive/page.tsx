"use client";

import { ScrapsPanel } from "@/components/mypage/panels/ScrapsPanel";
import { PageEditButton } from "@/components/admin/PageEditButton";

// EPIC-085: "아카이브 / 내 스크랩" — ScrapButton(user_scraps)으로 저장한
// 게시글을 모아보는 화면. ScrapsPanel이 session.user.id(auth.uid())로 직접
// 조회하므로 다른 패널들과 달리 memberId(useMyPageMember)는 필요 없다.
export default function MyPageArchivePage() {
  return (
    <>
      <PageEditButton slug="mypage-archive" />
      <div>
        <h2 className="text-lg font-semibold mb-4">아카이브 / 내 스크랩</h2>
        <ScrapsPanel />
      </div>
    </>
  );
}
