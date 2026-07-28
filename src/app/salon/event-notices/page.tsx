import { PageHeader } from "@/components/PageHeader";
import { PageEditButton } from "@/components/admin/PageEditButton";

export default function EventNoticesPage() {
  return (
    <>
      <PageEditButton slug="event-notices" />
      <PageHeader
        title="이벤트 공지"
        subtitle="Community"
        breadcrumb={[
          { label: "홈", href: "/" },
          { label: "살롱데상" },
          { label: "Community" },
          { label: "이벤트 공지" },
        ]}
        description="이벤트 공지 콘텐츠는 현재 준비 중입니다."
      />
    </>
  );
}
