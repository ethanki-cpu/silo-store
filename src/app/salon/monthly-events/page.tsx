import { PageHeader } from "@/components/PageHeader";
import { PageEditButton } from "@/components/admin/PageEditButton";

export default function MonthlyEventsPage() {
  return (
    <>
      <PageEditButton slug="monthly-events" />
      <PageHeader
        title="월별 모임"
        subtitle="Community · 패트론의 살롱"
        breadcrumb={[
          { label: "홈", href: "/" },
          { label: "살롱데상" },
          { label: "Community" },
          { label: "월별 모임" },
        ]}
        description="패트론의 살롱, 월별 모임 콘텐츠는 현재 준비 중입니다."
      />
    </>
  );
}
