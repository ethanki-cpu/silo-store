import { PageHeader } from "@/components/PageHeader";

export default function HeritageGrandmaPage() {
  return (
    <PageHeader
      title="할머니"
      subtitle="사일로 Heritage"
      breadcrumb={[
        { label: "홈", href: "/" },
        { label: "사일로상점", href: "/shop" },
        { label: "사일로 Heritage" },
        { label: "할머니" },
      ]}
      description="할머니의 이야기를 담은 사일로 Heritage 콘텐츠는 현재 준비 중입니다."
    />
  );
}
