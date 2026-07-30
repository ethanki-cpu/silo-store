import { NextRequest, NextResponse } from "next/server";
import { getRequestMember } from "@/lib/serverAuth";

// EPIC-071: 관리자 회원 관리(/admin/members) — 전체 회원 목록 조회.
// members 테이블의 admin-bypass RLS 정책(docs/sql/EPIC-071-member-admin.sql)에
// 의존하므로, 그 SQL이 실행되지 않은 환경에서는 own-row만 보여 사실상
// 빈 목록(또는 본인 행 1개)이 반환된다 — 에러는 아니고 데이터 부족.
export async function GET(request: NextRequest) {
  const requester = await getRequestMember(request);
  if (!requester || !requester.member.is_admin) {
    return NextResponse.json(
      { error: "관리자만 접근할 수 있어요." },
      { status: 403 },
    );
  }

  const q = request.nextUrl.searchParams.get("q")?.trim().toLowerCase() ?? "";

  const { data: members, error } = await requester.scopedClient
    .from("members")
    .select("id, name, email, membership_rank, is_admin, joined_at, membership_started_at")
    .order("joined_at", { ascending: false });

  if (error) {
    return NextResponse.json(
      { error: "회원 목록을 불러오지 못했어요." },
      { status: 500 },
    );
  }

  const filtered = q
    ? (members ?? []).filter(
        (m) =>
          m.name?.toLowerCase().includes(q) ||
          m.email?.toLowerCase().includes(q),
      )
    : (members ?? []);

  return NextResponse.json(filtered);
}
