import { PageHeaderContent } from "@/components/PageHeader";
import { PageEditButton } from "@/components/admin/PageEditButton";

// EPIC-057: 카테고리 실제 Route 생성 — Board/DB 연결 없는 Placeholder Page.
export default function HeritageGrandpasPage() {
  return (
    <>
      <PageEditButton slug="heritage-grandpas" />
      <main className="flex-1 p-8 max-w-2xl mx-auto w-full">
      <PageHeaderContent
        title="Grandpas"
        subtitle="사일로상점 · Heritage"
        breadcrumb={[
        { label: "홈", href: "/" },
        { label: "사일로상점" },
        { label: "Heritage", href: "/heritage" },
        { label: "Grandpas" },
        ]}
        description="할아버지들의 이야기를 모아보는 게시판입니다."
      />
      <div className="mt-8 rounded-lg border border-dashed border-gray-300 p-8 text-center text-sm text-gray-400">
        여기에 게시판이 들어갑니다.
      </div>
    </main>
    </>
  );
}
