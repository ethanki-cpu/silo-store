import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabaseClient";
import { getRequestMember } from "@/lib/serverAuth";

// EPIC-096(요구사항 3.2): 에디터에 인라인으로 심은 투표 블록(pollEmbed
// 노드, data-poll-id)이 단일 poll 하나만 조회할 때 쓴다 — 기존
// GET /api/polls(전체 목록)와 동일한 집계 로직을 poll 하나로 좁힌 버전.
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  const { data: poll, error } = await supabase
    .from("polls")
    .select("id, question, is_active, created_at, poll_options(id, label, sort_order)")
    .eq("id", id)
    .single();

  if (error || !poll) {
    return NextResponse.json({ error: "설문을 찾을 수 없어요." }, { status: 404 });
  }

  const { data: counts } = await supabase
    .from("poll_option_counts")
    .select("option_id, vote_count")
    .eq("poll_id", id);
  const countByOption = new Map((counts ?? []).map((c) => [c.option_id, c.vote_count]));

  const requester = await getRequestMember(request);
  let myVoteOptionId: string | null = null;
  if (requester) {
    const { data: myVote } = await requester.scopedClient
      .from("poll_votes")
      .select("option_id")
      .eq("poll_id", id)
      .eq("member_id", requester.member.id)
      .maybeSingle();
    myVoteOptionId = myVote?.option_id ?? null;
  }

  const options = (
    poll.poll_options as unknown as { id: string; label: string; sort_order: number }[]
  )
    .slice()
    .sort((a, b) => a.sort_order - b.sort_order)
    .map((opt) => ({ id: opt.id, label: opt.label, vote_count: countByOption.get(opt.id) ?? 0 }));

  return NextResponse.json({
    id: poll.id,
    question: poll.question,
    is_active: poll.is_active,
    options,
    total_votes: options.reduce((sum, o) => sum + o.vote_count, 0),
    my_vote_option_id: myVoteOptionId,
  });
}
