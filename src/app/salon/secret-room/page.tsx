import { PageHeader } from "@/components/PageHeader";
import { PageEditButton } from "@/components/admin/PageEditButton";

export default function SecretRoomPage() {
  return (
    <>
      <PageEditButton slug="salon-secret-room" />
      <PageHeader
      title="비밀의 방 도슨트"
      subtitle="Membership"
      breadcrumb={[
        { label: "홈", href: "/" },
        { label: "살롱데상" },
        { label: "Membership" },
        { label: "비밀의 방 도슨트" },
      ]}
      description="비밀의 방 도슨트 콘텐츠는 현재 준비 중입니다."
    />
    </>
  );
}
