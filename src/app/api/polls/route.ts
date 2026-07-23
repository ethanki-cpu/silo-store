import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabaseClient";
import { getRequestMember } from "@/lib/serverAuth";

export async function GET(request: NextRequest) {
  const { data: polls, error } = await supabase
    .from("polls")
    .select("id, question, is_active, created_at, poll_options(id, label, sort_order)")
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json(
      { error: "설문 목록을 불러오지 못했어요." },
      { status: 500 },
    );
  }

  const pollIds = (polls ?? []).map((p) => p.id);
  const { data: counts } = await supabase
    .from("poll_option_counts")
    .select("poll_id, option_id, vote_count")
    .in("poll_id", pollIds.length > 0 ? pollIds : ["00000000-0000-0000-0000-000000000000"]);

  const countByOption = new Map(
    (counts ?? []).map((c) => [c.option_id, c.vote_count]),
  );

  const requester = await getRequestMember(request);
  let myVotesByPoll = new Map<string, string>();

  if (requester) {
    const { data: myVotes } = await requester.scopedClient
      .from("poll_votes")
      .select("poll_id, option_id")
      .eq("member_id", requester.member.id);
    myVotesByPoll = new Map((myVotes ?? []).map((v) => [v.poll_id, v.option_id]));
  }

  const result = (polls ?? []).map((poll) => {
    const options = (
      poll.poll_options as unknown as {
        id: string;
        label: string;
        sort_order: number;
      }[]
    )
      .slice()
      .sort((a, b) => a.sort_order - b.sort_order)
      .map((opt) => ({
        id: opt.id,
        label: opt.label,
        vote_count: countByOption.get(opt.id) ?? 0,
      }));

    const totalVotes = options.reduce((sum, o) => sum + o.vote_count, 0);

    return {
      id: poll.id,
      question: poll.question,
      is_active: poll.is_active,
      created_at: poll.created_at,
      options,
      total_votes: totalVotes,
      my_vote_option_id: myVotesByPoll.get(poll.id) ?? null,
    };
  });

  return NextResponse.json(result);
}

export async function POST(request: NextRequest) {
  const requester = await getRequestMember(request);
  if (!requester) {
    return NextResponse.json({ error: "로그인이 필요해요." }, { status: 401 });
  }

  if (!requester.member.is_admin) {
    return NextResponse.json(
      { error: "관리자만 설문을 만들 수 있어요." },
      { status: 403 },
    );
  }

  const body = await request.json();
  const question = body?.question as string | undefined;
  const options = body?.options as string[] | undefined;

  if (!question || !options || options.filter((o) => o.trim()).length < 2) {
    return NextResponse.json(
      { error: "질문과 선택지 2개 이상을 입력해주세요." },
      { status: 400 },
    );
  }

  const { data: poll, error: pollError } = await requester.scopedClient
    .from("polls")
    .insert({ question, created_by: requester.member.id })
    .select()
    .single();

  if (pollError || !poll) {
    return NextResponse.json(
      { error: "설문 생성에 실패했어요.", detail: pollError?.message },
      { status: 500 },
    );
  }

  const validOptions = options.filter((o) => o.trim());
  const { error: optionsError } = await requester.scopedClient
    .from("poll_options")
    .insert(
      validOptions.map((label, idx) => ({
        poll_id: poll.id,
        label: label.trim(),
        sort_order: idx,
      })),
    );

  if (optionsError) {
    return NextResponse.json(
      { error: "선택지 생성에 실패했어요.", detail: optionsError.message },
      { status: 500 },
    );
  }

  return NextResponse.json(poll);
}
