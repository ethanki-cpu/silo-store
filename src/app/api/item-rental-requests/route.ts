import { NextRequest, NextResponse } from "next/server";
import { getRequestMember } from "@/lib/serverAuth";

// EPIC-087-PHASE-E: "물품 대여" 신청 제출 — reservations/route.ts와 동일한
// getRequestMember + scopedClient 패턴(캐스케이드 가격 계산이 없는 단순
// 신청이라 그 라우트보다 훨씬 짧다). 목록 조회(관리자용)는 admin-bypass
// select RLS가 있어 /admin/rentals 화면이 scopedClient로 직접 읽는다(별도
// GET 라우트 불필요).
export async function POST(request: NextRequest) {
  const requester = await getRequestMember(request);
  if (!requester) {
    return NextResponse.json({ error: "로그인이 필요해요." }, { status: 401 });
  }

  const body = await request.json();
  const itemDescription = (body?.itemDescription as string | undefined)?.trim();
  const desiredStartDate = (body?.desiredStartDate as string | undefined) || null;
  const desiredEndDate = (body?.desiredEndDate as string | undefined) || null;
  const contactNote = (body?.contactNote as string | undefined)?.trim() || null;

  if (!itemDescription) {
    return NextResponse.json({ error: "대여하고 싶은 물품을 입력해주세요." }, { status: 400 });
  }

  const { data: inserted, error: insertError } = await requester.scopedClient
    .from("item_rental_requests")
    .insert({
      member_id: requester.member.id,
      item_description: itemDescription,
      desired_start_date: desiredStartDate,
      desired_end_date: desiredEndDate,
      contact_note: contactNote,
    })
    .select()
    .single();

  if (insertError || !inserted) {
    return NextResponse.json(
      { error: "신청 저장에 실패했어요.", detail: insertError?.message },
      { status: 500 },
    );
  }

  return NextResponse.json(inserted);
}
