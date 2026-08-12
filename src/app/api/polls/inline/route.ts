import { NextRequest, NextResponse } from "next/server";
import { getRequestMember } from "@/lib/serverAuth";

// EPIC-096(요구사항 3.2): 에디터 슬래시 메뉴에서 "설문(Poll)"을 선택했을 때
// 쓰는 생성 경로 — 기존 POST /api/polls(is_admin 전용, "설문 [우리들 맴]"
// 커뮤니티 공식 설문 기능)와는 의도적으로 분리했다. 이건 어떤 로그인
// 회원이든 자기 글 본문 안에 즉석 투표를 심는 것이라(글쓰기 재미 요구사항
// 원문), 관리자 전용으로 막을 이유가 없다 — 같은 polls/poll_options 테이블에
// 그대로 insert하고, 결과 집계(poll_option_counts)/투표(POST .../votes)는
// 기존 인프라를 100% 그대로 재사용한다(새 테이블 없음).
export async function POST(request: NextRequest) {
  const requester = await getRequestMember(request);
  if (!requester) {
    return NextResponse.json({ error: "로그인이 필요해요." }, { status: 401 });
  }

  const body = await request.json();
  const question = typeof body?.question === "string" ? body.question.trim() : "";
  const options = Array.isArray(body?.options)
    ? (body.options as unknown[]).filter((o): o is string => typeof o === "string" && o.trim().length > 0)
    : [];

  if (!question || options.length < 2) {
    return NextResponse.json({ error: "질문과 선택지 2개 이상을 입력해주세요." }, { status: 400 });
  }
  if (options.length > 8) {
    return NextResponse.json({ error: "선택지는 최대 8개까지예요." }, { status: 400 });
  }

  const { data: poll, error: pollError } = await requester.scopedClient
    .from("polls")
    .insert({ question, created_by: requester.member.id })
    .select("id")
    .single();

  if (pollError || !poll) {
    return NextResponse.json({ error: "설문 생성에 실패했어요.", detail: pollError?.message }, { status: 500 });
  }

  const { error: optionsError } = await requester.scopedClient.from("poll_options").insert(
    options.map((label, idx) => ({ poll_id: poll.id, label: label.trim(), sort_order: idx })),
  );

  if (optionsError) {
    return NextResponse.json(
      { error: "선택지 생성에 실패했어요.", detail: optionsError.message },
      { status: 500 },
    );
  }

  return NextResponse.json({ id: poll.id });
}
