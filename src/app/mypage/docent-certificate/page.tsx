"use client";

import { DocentCertificatePanel } from "@/components/mypage/panels/DocentCertificatePanel";
import { useMyPageMember } from "@/components/mypage/MyPageContext";
import { PageEditButton } from "@/components/admin/PageEditButton";

export default function MyPageDocentCertificatePage() {
  const memberId = useMyPageMember();

  return (
    <>
      <PageEditButton slug="mypage-docent-certificate" />
      <div>
      <h2 className="text-lg font-semibold mb-4">나의 도슨트 수료증</h2>
      <DocentCertificatePanel memberId={memberId} />
    </div>
    </>
  );
}
