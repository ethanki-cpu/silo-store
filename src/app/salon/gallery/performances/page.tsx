import { PageHeader } from "@/components/PageHeader";

export default function GalleryPerformancesPage() {
  return (
    <PageHeader
      title="공연들"
      subtitle="Gallery"
      breadcrumb={[
        { label: "홈", href: "/" },
        { label: "살롱데상" },
        { label: "Gallery" },
        { label: "공연들" },
      ]}
      description="공연들 갤러리 콘텐츠는 현재 준비 중입니다."
    />
  );
}
