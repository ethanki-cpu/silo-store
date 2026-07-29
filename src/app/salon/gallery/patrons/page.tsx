import { PageHeader } from "@/components/PageHeader";
import { PageEditButton } from "@/components/admin/PageEditButton";

export default function GalleryPatronsPage() {
  return (
    <>
      <PageEditButton slug="salon-gallery-patrons" />
      <PageHeader
      title="패트론들"
      subtitle="Gallery"
      breadcrumb={[
        { label: "홈", href: "/" },
        { label: "살롱데상" },
        { label: "Gallery" },
        { label: "패트론들" },
      ]}
      description="패트론들 갤러리 콘텐츠는 현재 준비 중입니다."
    />
    </>
  );
}
