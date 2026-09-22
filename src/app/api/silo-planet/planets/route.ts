import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabaseClient";
import { getRequestMember, getTier } from "@/lib/serverAuth";

// EPIC-161 Phase 2: 회원별 행성 목록 — Alice(rank>=1) 미만은 자기 행성만 보인다
// (다른 회원 행성 열람이 등급 혜택이라는 사용자 스펙을 반영). 좋아요 수는 항상
// 공개(장식적 정보라 굳이 가릴 이유 없음).
export async function GET(request: NextRequest) {
  const requester = await getRequestMember(request);
  const tier = requester ? await getTier(requester.member.membership_rank) : null;
  const canViewOthers = (tier?.rank ?? -1) >= 1;

  let query = supabase.from("member_planets").select("id, member_id, glb_url, created_at");
  if (!canViewOthers && requester) {
    query = query.eq("member_id", requester.member.id);
  } else if (!canViewOthers) {
    return NextResponse.json({ planets: [], canViewOthers: false });
  }

  const { data: planets, error } = await query;
  if (error) {
    return NextResponse.json({ error: "행성 목록을 불러오지 못했어요." }, { status: 500 });
  }

  const memberIds = (planets ?? []).map((p) => p.member_id);
  const [{ data: profiles }, { data: likes }] = await Promise.all([
    memberIds.length > 0
      ? supabase.from("public_profiles").select("id, name").in("id", memberIds)
      : Promise.resolve({ data: [] as { id: string; name: string }[] }),
    memberIds.length > 0
      ? supabase.from("planet_likes").select("planet_member_id, member_id").in("planet_member_id", memberIds)
      : Promise.resolve({ data: [] as { planet_member_id: string; member_id: string }[] }),
  ]);

  const nameById = new Map((profiles ?? []).map((p) => [p.id, p.name]));
  const likeCountByMember = new Map<string, number>();
  const likedByMe = new Set<string>();
  for (const like of likes ?? []) {
    likeCountByMember.set(like.planet_member_id, (likeCountByMember.get(like.planet_member_id) ?? 0) + 1);
    if (requester && like.member_id === requester.member.id) likedByMe.add(like.planet_member_id);
  }

  return NextResponse.json({
    canViewOthers,
    planets: (planets ?? []).map((p) => ({
      ...p,
      member_name: nameById.get(p.member_id) ?? "알 수 없음",
      like_count: likeCountByMember.get(p.member_id) ?? 0,
      liked_by_me: likedByMe.has(p.member_id),
      is_mine: requester?.member.id === p.member_id,
    })),
  });
}

// EPIC-161 Phase 2: 자기 행성에 .glb 업로드 — Patron(rank>=3)부터. 파일 자체는
// 클라이언트가 이미 R2에 업로드한 뒤 그 URL만 여기로 보낸다(다른 업로드 플로우와
// 동일한 패턴, 이 라우트는 권한 체크 + upsert만 담당).
export async function POST(request: NextRequest) {
  const requester = await getRequestMember(request);
  if (!requester) {
    return NextResponse.json({ error: "로그인이 필요해요." }, { status: 401 });
  }

  const tier = await getTier(requester.member.membership_rank);
  if (!requester.member.is_admin && (tier?.rank ?? -1) < 3) {
    return NextResponse.json(
      { error: "자기 행성 꾸미기는 Patron 등급부터 가능해요. 멤버십 가입 안내에서 등급을 올릴 수 있어요." },
      { status: 403 },
    );
  }

  const body = await request.json();
  const glbUrl = body?.glbUrl as string | undefined;
  const glbPath = body?.glbPath as string | undefined;
  if (!glbUrl) {
    return NextResponse.json({ error: "업로드된 파일 URL이 필요해요." }, { status: 400 });
  }

  const { data: planet, error } = await requester.scopedClient
    .from("member_planets")
    .upsert(
      { member_id: requester.member.id, glb_url: glbUrl, glb_path: glbPath ?? null, updated_at: new Date().toISOString() },
      { onConflict: "member_id" },
    )
    .select()
    .single();

  if (error || !planet) {
    return NextResponse.json({ error: "행성 저장에 실패했어요.", detail: error?.message }, { status: 500 });
  }

  return NextResponse.json(planet);
}
