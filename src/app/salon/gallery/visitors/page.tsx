import { PageHeader } from "@/components/PageHeader";

export default function GalleryVisitorsPage() {
  return (
    <PageHeader
      title="운명의 방문자들"
      subtitle="Gallery"
      breadcrumb={[
        { label: "홈", href: "/" },
        { label: "살롱데상" },
        { label: "Gallery" },
        { label: "운명의 방문자들" },
      ]}
      description="운명의 방문자들 갤러리 콘텐츠는 현재 준비 중입니다."
    />
  );
}
