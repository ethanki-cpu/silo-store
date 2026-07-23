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

  return NextResponse.json({
    id: item.id,
    name: item.name,
    photo_url: item.photo_url,
    price: item.price,
    rental_price_per_day: item.rental_price_per_day,
    category: item.category,
    status: item.status,
    curation: {
      era_info: buildField(item.era_info, true),
      era_context: buildField(item.era_context, rank >= 1, RANK_LABELS[1]),
      maker_info: buildField(item.maker_info, rank >= 2, RANK_LABELS[2]),
      previous_owner_story: buildField(
        item.previous_owner_story,
        rank >= 3,
        RANK_LABELS[3],
        persona,
      ),
    },
  });
}
