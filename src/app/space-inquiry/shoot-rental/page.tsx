import { PageHeader } from "@/components/PageHeader";
import { PageEditButton } from "@/components/admin/PageEditButton";

export default function ShootRentalInquiryPage() {
  return (
    <>
      <PageEditButton slug="space-inquiry-shoot-rental" />
      <PageHeader
      title="공간 촬영 대관"
      subtitle="스튜디오"
      breadcrumb={[
        { label: "홈", href: "/" },
        { label: "스튜디오" },
        { label: "공간 촬영 대관" },
      ]}
      description="공간 촬영 대관 문의 콘텐츠는 현재 준비 중입니다. 실제 예약은 공간 촬영 대관 메뉴(/rental)를 이용해 주세요."
    />
    </>
  );
}
