"use client";

import { BucketListPanel } from "@/components/mypage/panels/BucketListPanel";
import { useMyPageMember } from "@/components/mypage/MyPageContext";
import { PageEditButton } from "@/components/admin/PageEditButton";

export default function MyPageBucketListPage() {
  const memberId = useMyPageMember();

  return (
    <>
      <PageEditButton slug="mypage-bucketlist" />
      <div>
      <h2 className="text-lg font-semibold mb-4">버킷리스트</h2>
      <BucketListPanel memberId={memberId} />
    </div>
    </>
  );
}
