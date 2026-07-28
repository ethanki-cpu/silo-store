import { PageHeader } from "@/components/PageHeader";

export default function GalleryPartiesPage() {
  return (
    <PageHeader
      title="파티"
      subtitle="Gallery"
      breadcrumb={[
        { label: "홈", href: "/" },
        { label: "살롱데상" },
        { label: "Gallery" },
        { label: "파티" },
      ]}
      description="파티 갤러리 콘텐츠는 현재 준비 중입니다."
    />
  );
}
