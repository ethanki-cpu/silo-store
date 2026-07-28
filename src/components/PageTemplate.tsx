import type { BreadcrumbItem } from "@/components/PageHeader";
import { PageHeaderContent } from "@/components/PageHeader";
import { BoardModule } from "@/components/modules/BoardModule";
import { EmptyState } from "@/components/modules/EmptyState";

// EPIC-054F: 아직 실제 Route가 없던 카테고리 허브 메뉴(Studio/Community/
// Membership/Gallery/Archive/Heritage)를 위한 공용 Page Template.
// Breadcrumb/Page Header/Page Description은 PageHeaderContent(EPIC-054A)를,
// Board Container(Search/Sort/Pagination/글쓰기 버튼/Empty State 전부
// 포함)는 BoardModule(EPIC-054C)을 그대로 재사용한다 — 새 컴포넌트/디자인을
// 만들지 않는다. Sidebar는 이 템플릿이 아니라 전역 레이아웃(Navbar의
// LeftSidebar/RightSidebar, src/app/layout.tsx)이 모든 페이지에 이미
// 제공하므로 별도로 그리지 않는다.
//
// boardId가 없으면(해당 카테고리에 아직 연결된 board 행이 DB에 없는
// 경우) Board Container 자리에 EmptyState("게시글이 없습니다.")를
// 보여준다 — Board가 연결되지 않아도 Page 자체는 항상 존재해야 한다는
// 요구 반영.
export function PageTemplate({
  title,
  subtitle,
  breadcrumb,
  description,
  boardId,
}: {
  title: string;
  subtitle?: string;
  breadcrumb: BreadcrumbItem[];
  description: string;
  boardId: string | null;
}) {
  return (
    <main className="flex-1 bg-white px-6 py-12">
      <div className="max-w-3xl mx-auto w-full">
        <PageHeaderContent
          title={title}
          subtitle={subtitle}
          breadcrumb={breadcrumb}
          description={description}
        />
        <div className="mt-10">
          {boardId ? (
            // EPIC-056: 이 페이지가 위에서 이미 Hero Module(PageHeaderContent)을
            // 그렸으므로, BoardModule 내부 Hero는 꺼서 중복 렌더링을 막는다.
            <BoardModule boardId={boardId} showHero={false} />
          ) : (
            <EmptyState
              title="게시글이 없습니다."
              description="아직 이 카테고리에 연결된 게시판이 없어요."
            />
          )}
        </div>
      </div>
    </main>
  );
}
