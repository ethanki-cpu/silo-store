import { PageHeaderContent } from "@/components/PageHeader";

// EPIC-057: 카테고리 실제 Route 생성 — Board/DB 연결 없는 Placeholder Page.
export default function CommunityWeekdayBetweenLinesPage() {
  return (
    <main className="flex-1 p-8 max-w-2xl mx-auto w-full">
      <PageHeaderContent
        title="행간의 조각가"
        subtitle="살롱데상 · Community · 요일별 모임"
        breadcrumb={[
        { label: "홈", href: "/" },
        { label: "살롱데상" },
        { label: "Community", href: "/community" },
        { label: "요일별 모임", href: "/community/weekday" },
        { label: "행간의 조각가" },
        ]}
        description="행간의 조각가 모임 게시판입니다."
      />
      <div className="mt-8 rounded-lg border border-dashed border-gray-300 p-8 text-center text-sm text-gray-400">
        여기에 게시판이 들어갑니다.
      </div>
    </main>
  );
}
