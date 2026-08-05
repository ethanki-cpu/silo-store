import { NextRequest, NextResponse } from "next/server";
import { getRequestMember } from "@/lib/serverAuth";

// EPIC-079-PHASE-5: "사이트 구성 관리"의 미분류 페이지 삭제 버튼이 눌러도
// 아무 일도 안 하던 문제 — 원인 조사 결과 이 페이지(page_builder 행) 삭제를
// 담당하는 API 자체가 존재하지 않았다(admin/boards/[id]의 DELETE와 대칭인
// 라우트가 여태 없었음, 버튼도 없었음). page_modules.page_id는
// `on delete cascade`(docs/sql/EPIC-060-page-builder.sql)라 이 페이지에 얹힌
// 위젯은 함께 정리된다. site_navigations는 href(텍스트)로만 페이지를
// 가리키고 real FK가 없어 이 삭제를 막지 않는다 — 삭제 후 그 메뉴 항목을
// 다시 열면 ensurePageForSlug가 새 페이지를 온디맨드로 만든다(기존 카테고리
// 생성 흐름과 동일).
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const requester = await getRequestMember(request);
  if (!requester || !requester.member.is_admin) {
    return NextResponse.json({ error: "관리자만 접근할 수 있어요." }, { status: 403 });
  }

  const { error } = await requester.scopedClient.from("page_builder").delete().eq("id", id);

  if (error) {
    return NextResponse.json(
      { error: "페이지 삭제에 실패했어요.", detail: error.message },
      { status: 500 },
    );
  }

  return NextResponse.json({ deleted: true });
}
