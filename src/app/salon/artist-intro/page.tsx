import { PageHeader } from "@/components/PageHeader";
import { PageEditButton } from "@/components/admin/PageEditButton";

export default function ArtistIntroPage() {
  return (
    <>
      <PageEditButton slug="salon-artist-intro" />
      <PageHeader
      title="나의 아티스트 소개"
      subtitle="Membership"
      breadcrumb={[
        { label: "홈", href: "/" },
        { label: "살롱데상" },
        { label: "Membership" },
        { label: "나의 아티스트 소개" },
      ]}
      description="나의 아티스트 소개 콘텐츠는 현재 준비 중입니다."
    />
    </>
  );
}
