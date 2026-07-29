"use client";

import { SalonPanel } from "@/components/mypage/panels/SalonPanel";
import { useMyPageMember } from "@/components/mypage/MyPageContext";
import { PageEditButton } from "@/components/admin/PageEditButton";

export default function MyPageSalonPage() {
  const memberId = useMyPageMember();

  return (
    <>
      <PageEditButton slug="mypage-salon" />
      <div>
      <h2 className="text-lg font-semibold mb-4">나의 살롱</h2>
      <SalonPanel memberId={memberId} />
    </div>
    </>
  );
}
