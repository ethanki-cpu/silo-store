import { PageHeader } from "@/components/PageHeader";

export default function MyTreasureStoryPage() {
  return (
    <PageHeader
      title="나의 보물 이야기"
      subtitle="Membership"
      breadcrumb={[
        { label: "홈", href: "/" },
        { label: "살롱데상" },
        { label: "Membership" },
        { label: "나의 보물 이야기" },
      ]}
      description="나의 보물 이야기 콘텐츠는 현재 준비 중입니다."
    />
  );
}
