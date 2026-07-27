"use client";

import { SalonPanel } from "@/components/mypage/panels/SalonPanel";
import { useMyPageMember } from "@/components/mypage/MyPageContext";

export default function MyPageSalonPage() {
  const memberId = useMyPageMember();

  return (
    <div>
      <h2 className="text-lg font-semibold mb-4">나의 살롱</h2>
      <SalonPanel memberId={memberId} />
    </div>
  );
}
