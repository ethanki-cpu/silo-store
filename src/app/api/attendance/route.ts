import { NextRequest, NextResponse } from "next/server";
import { getRequestMember } from "@/lib/serverAuth";

function todayDateString(): string {
  return new Date().toISOString().slice(0, 10);
}

export async function GET(request: NextRequest) {
  const requester = await getRequestMember(request);
  if (!requester) {
    return NextResponse.json({ error: "로그인이 필요해요." }, { status: 401 });
  }

  const { data, error } = await requester.scopedClient
    .from("daily_checkins")
    .select("checkin_date")
    .eq("member_id", requester.member.id)
    .order("checkin_date", { ascending: false });

  if (error) {
    return NextResponse.json(
      { error: "출석 기록을 불러오지 못했어요." },
      { status: 500 },
    );
  }

  const dates = (data ?? []).map((row) => row.checkin_date as string);
  const today = todayDateString();

  return NextResponse.json({
    dates,
    checkedInToday: dates.includes(today),
  });
}

export async function POST(request: NextRequest) {
  const requester = await getRequestMember(request);
  if (!requester) {
    return NextResponse.json({ error: "로그인이 필요해요." }, { status: 401 });
  }

  const today = todayDateString();

  const { data: checkin, error: insertError } = await requester.scopedClient
    .from("daily_checkins")
    .insert({ member_id: requester.member.id, checkin_date: today })
    .select()
    .single();

  if (insertError) {
    if (insertError.code === "23505") {
      return NextResponse.json(
        { error: "오늘은 이미 출석하셨어요." },
        { status: 409 },
      );
    }
    return NextResponse.json(
      { error: "출석 처리에 실패했어요.", detail: insertError.message },
      { status: 500 },
    );
  }

  await requester.scopedClient.from("points_ledger").insert({
    member_id: requester.member.id,
    reason: "attendance",
    points: 2,
    related_id: checkin.id,
  });

  return NextResponse.json({ checkin_date: today, point_earned: 2 });
}
