import { NextRequest, NextResponse } from "next/server";
import { getRequestMember } from "@/lib/serverAuth";
import { hrefToSlug } from "@/lib/pageTemplates";

// EPIC-079-PHASE-5: "사이트 구성 관리"의 미분류 페이지 삭제 버튼이 눌러도
// 아무 일도 안 하던 문제 — 원인 조사 결과 이 페이지(page_builder 행) 삭제를
// 담당하는 API 자체가 존재하지 않았다(admin/boards/[id]의 DELETE와 대칭인
// 라우트가 여태 없었음, 버튼도 없었음). page_modules.page_id는
// `on delete cascade`(docs/sql/EPIC-060-page-builder.sql)라 이 페이지에 얹힌
// 위젯은 함께 정리된다. site_navigations는 href(텍스트)로만 페이지를
// 가리키고 real FK가 없어 이 삭제를 막지 않는다 — 삭제 후 그 메뉴 항목을
// 다시 열면 ensurePageForSlug가 새 페이지를 온디맨드로 만든다(기존 카테고리
// 생성 흐름과 동일).
//
// HOTFIX-152.21(사용자 신고 — "'제국~군주'/'혁명~식민지' 페이지에 왜
// 타임라인이 없냐" → 실제로는 그 두 페이지의 page_builder 행 자체가
// 통째로 삭제돼 있었다): 근본 원인을 추적한 결과 —
// (1) "미분류 페이지" 자동 감지(CategoryTreeManager.tsx의
//     ensureUnassignedPagesInTree)는 href↔slug 문자열 매칭이 일시적으로
//     어긋나는 순간(예: 관리자가 href를 수정하던 중, HOTFIX-152.16 이전엔
//     실제로 이런 순간이 있었다)에 이미 정상적으로 메뉴에 연결된 진짜
//     Craft 페이지를 "미분류"로 오판해 "미분류 페이지" 버킷 아래에
//     유령 중복 링크를 만들어 넣을 수 있다.
// (2) 그 유령 중복 링크를 "정리하려고" 삭제하면, 이 API가 href↔slug가
//     지금은 실제로 일치하는지 전혀 확인하지 않고 곧바로 page_builder를
//     지워버려 — 실제로 활발히 쓰이던 페이지의 진짜 콘텐츠(타임라인
//     설정 등)가 통째로 사라지는 대참사로 이어졌다.
// (1)의 오판 자체를 완전히 막기는 어렵지만(문자열 매칭 기반 시스템의
// 구조적 한계), (2)의 파괴적 결과는 여기 한 곳만 고치면 막을 수 있다 —
// 삭제 직전에 "지금 이 순간" 실제로 이 slug를 가리키는 활성 메뉴 항목이
// 있는지 다시 확인해서, 있으면(=더 이상 미분류가 아니게 됐으면) 삭제를
// 거부한다. 프론트(CategoryTreeManager.tsx)는 이 응답을 받으면 실제
// 페이지는 그대로 두고 유령 링크(site_navigations 행)만 지운다.
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const requester = await getRequestMember(request);
  if (!requester || !requester.member.is_admin) {
    return NextResponse.json({ error: "관리자만 접근할 수 있어요." }, { status: 403 });
  }

  const { data: page, error: pageError } = await requester.scopedClient
    .from("page_builder")
    .select("slug")
    .eq("id", id)
    .maybeSingle();
  if (pageError) {
    return NextResponse.json(
      { error: "페이지 조회에 실패했어요.", detail: pageError.message },
      { status: 500 },
    );
  }
  if (page) {
    const { data: activeLinks, error: linksError } = await requester.scopedClient
      .from("site_navigations")
      .select("href")
      .eq("is_active", true)
      .not("href", "is", null);
    if (linksError) {
      return NextResponse.json(
        { error: "메뉴 연결 여부 확인에 실패했어요.", detail: linksError.message },
        { status: 500 },
      );
    }
    const stillLinked = ((activeLinks ?? []) as { href: string | null }[]).some(
      (l) => l.href && hrefToSlug(l.href) === (page as { slug: string }).slug,
    );
    if (stillLinked) {
      return NextResponse.json(
        {
          error: "이 페이지는 실제로 다른 메뉴 항목에 연결돼 있어 삭제할 수 없어요 — 진짜 미분류 항목이 아니에요.",
          stillLinked: true,
        },
        { status: 409 },
      );
    }
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
