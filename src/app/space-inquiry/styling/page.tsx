import { PageHeader } from "@/components/PageHeader";

export default function StylingInquiryPage() {
  return (
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
  );
}
