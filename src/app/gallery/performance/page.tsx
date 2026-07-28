import { PageHeaderContent } from "@/components/PageHeader";

// EPIC-057: 카테고리 실제 Route 생성 — Board/DB 연결 없는 Placeholder Page.
export default function GalleryPerformancePage() {
  return (
    <main className="flex-1 p-8 max-w-2xl mx-auto w-full">
      <PageHeaderContent
        title="공연"
        subtitle="살롱데상 · Gallery"
        breadcrumb={[
        { label: "홈", href: "/" },
        { label: "살롱데상" },
        { label: "Gallery", href: "/gallery" },
        { label: "공연" },
        ]}
        description="공연 갤러리 게시판입니다."
      />
      <div className="mt-8 rounded-lg border border-dashed border-gray-300 p-8 text-center text-sm text-gray-400">
        여기에 게시판이 들어갑니다.
      </div>
    </main>
  );
}
