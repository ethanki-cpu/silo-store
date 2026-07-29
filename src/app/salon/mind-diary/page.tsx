import { PageHeader } from "@/components/PageHeader";
import { PageEditButton } from "@/components/admin/PageEditButton";

export default function MindDiaryPage() {
  return (
    <>
      <PageEditButton slug="salon-mind-diary" />
      <PageHeader
      title="마음일기"
      subtitle="Membership"
      breadcrumb={[
        { label: "홈", href: "/" },
        { label: "살롱데상" },
        { label: "Membership" },
        { label: "마음일기" },
      ]}
      description="마음일기 콘텐츠는 현재 준비 중입니다."
    />
    </>
  );
}
