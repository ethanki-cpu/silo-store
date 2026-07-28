import { PageHeaderContent } from "@/components/PageHeader";

// EPIC-057: 카테고리 실제 Route 생성 — Board/DB 연결 없는 Placeholder Page.
export default function DocentBaroquePage() {
  return (
    <main className="flex-1 p-8 max-w-2xl mx-auto w-full">
      <PageHeaderContent
        title="Baroque"
        subtitle="사일로상점 · Online Docent"
        breadcrumb={[
        { label: "홈", href: "/" },
        { label: "사일로상점" },
        { label: "Online Docent", href: "/docent" },
        { label: "Baroque" },
        ]}
        description="Baroque 시대 온라인 도슨트 콘텐츠입니다."
      />
      <div className="mt-8 rounded-lg border border-dashed border-gray-300 p-8 text-center text-sm text-gray-400">
        여기에 게시판이 들어갑니다.
      </div>
    </main>
  );
}
