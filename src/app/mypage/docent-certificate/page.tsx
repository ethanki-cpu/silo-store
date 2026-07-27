"use client";

import { DocentCertificatePanel } from "@/components/mypage/panels/DocentCertificatePanel";
import { useMyPageMember } from "@/components/mypage/MyPageContext";

export default function MyPageDocentCertificatePage() {
  const memberId = useMyPageMember();

  return (
    <div>
      <h2 className="text-lg font-semibold mb-4">나의 도슨트 수료증</h2>
      <DocentCertificatePanel memberId={memberId} />
    </div>
  );
}
