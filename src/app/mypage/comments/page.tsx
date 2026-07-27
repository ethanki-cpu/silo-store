"use client";

import { CommentsPanel } from "@/components/mypage/panels/CommentsPanel";
import { useMyPageMember } from "@/components/mypage/MyPageContext";

export default function MyPageCommentsPage() {
  const memberId = useMyPageMember();

  return (
    <div>
      <h2 className="text-lg font-semibold mb-4">내가 쓴 댓글</h2>
      <CommentsPanel memberId={memberId} />
    </div>
  );
}
