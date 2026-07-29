import { PageHeader } from "@/components/PageHeader";
import { PageEditButton } from "@/components/admin/PageEditButton";

export default function StylingInquiryPage() {
  return (
    <>
      <PageEditButton slug="space-inquiry-styling" />
      <PageHeader
      title="공간 스타일링"
      subtitle="스튜디오"
      breadcrumb={[
        { label: "홈", href: "/" },
        { label: "스튜디오" },
        { label: "공간 스타일링" },
      ]}
      description="공간 스타일링 문의 콘텐츠는 현재 준비 중입니다."
    />
    </>
  );
}
