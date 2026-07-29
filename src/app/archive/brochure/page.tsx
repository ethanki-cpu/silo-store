import { PageHeaderContent } from "@/components/PageHeader";
import { PageEditButton } from "@/components/admin/PageEditButton";

// EPIC-057: 카테고리 실제 Route 생성 — Board/DB 연결 없는 Placeholder Page.
export default function ArchiveBrochurePage() {
  return (
    <>
      <PageEditButton slug="archive-brochure" />
      <main className="flex-1 p-8 max-w-2xl mx-auto w-full">
      <PageHeaderContent
        title="소개지"
        subtitle="살롱데상 · Archive"
        breadcrumb={[
        { label: "홈", href: "/" },
        { label: "살롱데상" },
        { label: "Archive", href: "/archive" },
        { label: "소개지" },
        ]}
        description="소개지 아카이브 게시판입니다."
      />
      <div className="mt-8 rounded-lg border border-dashed border-gray-300 p-8 text-center text-sm text-gray-400">
        여기에 게시판이 들어갑니다.
      </div>
    </main>
    </>
  );
}
