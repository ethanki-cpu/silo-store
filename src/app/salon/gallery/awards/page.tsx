import { PageHeader } from "@/components/PageHeader";

export default function GalleryAwardsPage() {
  return (
    <PageHeader
      title="시상식"
      subtitle="Gallery"
      breadcrumb={[
        { label: "홈", href: "/" },
        { label: "살롱데상" },
        { label: "Gallery" },
        { label: "시상식" },
      ]}
      description="시상식 갤러리 콘텐츠는 현재 준비 중입니다."
    />
  );
}
