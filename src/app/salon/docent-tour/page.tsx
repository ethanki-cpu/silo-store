import { PageHeader } from "@/components/PageHeader";
import { PageEditButton } from "@/components/admin/PageEditButton";

export default function DocentTourPage() {
  return (
    <>
      <PageEditButton slug="salon-docent-tour" />
      <PageHeader
      title="투어 도슨트 프로그램"
      subtitle="살롱데상"
      breadcrumb={[
        { label: "홈", href: "/" },
        { label: "살롱데상" },
        { label: "투어 도슨트 프로그램" },
      ]}
      description="투어 도슨트 프로그램 콘텐츠는 현재 준비 중입니다."
    />
    </>
  );
}
