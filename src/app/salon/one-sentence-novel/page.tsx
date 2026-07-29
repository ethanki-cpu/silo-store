import { PageHeader } from "@/components/PageHeader";
import { PageEditButton } from "@/components/admin/PageEditButton";

export default function OneSentenceNovelPage() {
  return (
    <>
      <PageEditButton slug="salon-one-sentence-novel" />
      <PageHeader
      title="한문장 소설 프로젝트"
      subtitle="Membership"
      breadcrumb={[
        { label: "홈", href: "/" },
        { label: "살롱데상" },
        { label: "Membership" },
        { label: "한문장 소설 프로젝트" },
      ]}
      description="한문장 소설 프로젝트 콘텐츠는 현재 준비 중입니다."
    />
    </>
  );
}
