import { PageHeader } from "@/components/PageHeader";
import { PageEditButton } from "@/components/admin/PageEditButton";

export default function DrinksPage() {
  return (
    <>
      <PageEditButton slug="salon-drinks" />
      <PageHeader
      title="음료 주문"
      subtitle="살롱데상"
      breadcrumb={[
        { label: "홈", href: "/" },
        { label: "살롱데상" },
        { label: "음료 주문" },
      ]}
      description="음료 주문 콘텐츠는 현재 준비 중입니다."
    />
    </>
  );
}
