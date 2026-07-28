import { PageHeader } from "@/components/PageHeader";

export default function ItemRentalInquiryPage() {
  return (
    <PageHeader
      title="물품 대여"
      subtitle="스튜디오"
      breadcrumb={[
        { label: "홈", href: "/" },
        { label: "스튜디오" },
        { label: "물품 대여" },
      ]}
      description="물품 대여 문의 콘텐츠는 현재 준비 중입니다."
    />
  );
}
