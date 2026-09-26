import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabaseClient";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

const RANK_LABELS: Record<number, string> = {
  0: "Silo Angel",
  1: "Alice",
  2: "Great Gatsby",
  3: "Patron",
  4: "Lautrec",
  99: "Artist",
  100: "Owner",
};

type Persona = { id: string; name: string; type: "grandma" | "grandpa"; photo_url: string | null };

type CurationField =
  | { locked: false; value: string | null; persona?: Persona | null }
  | { locked: true; message: string };

function buildField(
  value: string | null,
  unlocked: boolean,
  requiredRankLabel?: string,
  persona?: Persona | null,
): CurationField {
  if (unlocked) return { locked: false, value, ...(persona !== undefined ? { persona } : {}) };
  return { locked: true, message: `${requiredRankLabel} 등급부터 열람 가능` };
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  const authHeader = request.headers.get("authorization");
  const accessToken = authHeader?.replace(/^Bearer\s+/i, "");

  let rank = -1; // 비로그인 기본값 (제작 시기만 열람)

  if (accessToken) {
    const { data: userData, error: userError } =
      await supabase.auth.getUser(accessToken);

    if (!userError && userData.user) {
      const scopedClient = createClient(supabaseUrl, supabaseAnonKey, {
        global: { headers: { Authorization: `Bearer ${accessToken}` } },
      });

      const { data: memberData } = await scopedClient
        .from("members")
        .select("membership_rank")
        .eq("auth_user_id", userData.user.id)
        .single();

      if (memberData) {
        rank = memberData.membership_rank;
      }
    }
  }

  const { data: item, error } = await supabase
    .from("items")
    .select(
      "id, name, photo_url, price, rental_price_per_day, category, status, era_info, era_context, maker_info, previous_owner_story, item_personas(id, name, type, photo_url)",
    )
    .eq("id", id)
    .single();

  if (error || !item) {
    return NextResponse.json(
      { error: "물품을 찾을 수 없어요." },
      { status: 404 },
    );
  }

  const persona = (
    item as unknown as { item_personas: Persona | null }
  ).item_personas;

  // EPIC-161 Phase 3(사용자 확인 — "silo angel에게 가격 표시한다고 했잖아"):
  // 가격은 Silo Angel(무료 가입) 등급부터 공개, 비회원은 가입을 유도하는
  // 잠금 상태로 본다. 이 API가 실제 상점(/shop/[id]) 구매 페이지에도 쓰이지만
  // 사용자가 이 방향을 명시적으로 재확인했으므로 그대로 적용한다.
  const priceUnlocked = rank >= 0;

  return NextResponse.json({
    id: item.id,
    name: item.name,
    photo_url: item.photo_url,
    price: priceUnlocked ? item.price : null,
    rental_price_per_day: priceUnlocked ? item.rental_price_per_day : null,
    price_locked: !priceUnlocked,
    category: item.category,
    status: item.status,
    curation: {
      // EPIC-161 Phase 2(사용자 스펙 "사일로 보물들" 단계적 공개): era_info(제작 시기)를
      // era_context(시대적 배경)와 함께 Alice 등급으로 묶었다 — 이전엔 era_info만
      // 항상 공개였다. maker_info(Great Gatsby)/previous_owner_story(Patron)는
      // 스펙과 이미 일치해 그대로 둔다.
      era_info: buildField(item.era_info, rank >= 1, RANK_LABELS[1]),
      era_context: buildField(item.era_context, rank >= 1, RANK_LABELS[1]),
      maker_info: buildField(item.maker_info, rank >= 2, RANK_LABELS[2]),
      previous_owner_story: buildField(
        item.previous_owner_story,
        rank >= 3,
        RANK_LABELS[3],
        persona,
      ),
      // Lautrec 전용 — "프라이빗 도슨트 신청" 자격 여부만 내려준다(다른 curation
      // 필드와 동일한 {locked,value} 모양이라 프론트가 그대로 재사용 가능). 실제
      // 신청 접수는 이미 있는 "비밀의 방 도슨트" 게시판(secret-room-docent)으로 안내.
      private_docent: buildField("프라이빗 도슨트 신청 가능", rank >= 4, RANK_LABELS[4]),
    },
  });
}
