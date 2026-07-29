"use client";

import { CommentsPanel } from "@/components/mypage/panels/CommentsPanel";
import { useMyPageMember } from "@/components/mypage/MyPageContext";
import { PageEditButton } from "@/components/admin/PageEditButton";

export default function MyPageCommentsPage() {
  const memberId = useMyPageMember();

  return (
    <>
      <PageEditButton slug="mypage-comments" />
      <div>
      <h2 className="text-lg font-semibold mb-4">내가 쓴 댓글</h2>
      <CommentsPanel memberId={memberId} />
    </div>
    </>
  );
}
