import { NextRequest, NextResponse } from "next/server";
import { getRequestMember } from "@/lib/serverAuth";

// HOTFIX-156.4(사용자 지시 — "'배경패닝모션'의 설정을 전체 타임라인에
// 적용하는 기능과, '배경 자동전환간격', '배경 이미지 채우기 방식'을 모든
// 타임라인에 적용하는 기능을 만들어줘"): 관리자가 SiloTimelineEmbedBlock
// 편집 패널에서 지금 보고 있는 표지의 값을 사이트의 모든
// SiloTimelineEmbedBlock 인스턴스(표지 flat prop + eventOverlays의 모든
// 이벤트)에 한 번에 뿌리는 일괄 적용 — 페이지마다 손으로 맞추지 않아도
// 되게 한다. page_builder는 /admin/storage-cleanup과 동일하게 admin
// 게이팅 RLS만 있고 posts처럼 콘텐츠 보호 트리거가 없어(HOTFIX-152.21은
// posts 전용) scopedClient로 바로 update할 수 있다.

type PanMotionValues = {
  panDirection: string | null;
  panSpeedSeconds: number | null;
  panZoomPct: number | null;
  panDistancePct: number | null;
};

type AdvanceAndFitValues = {
  autoAdvanceSeconds: number;
  backgroundFit: "cover" | "contain" | null;
};

const PAN_MOTION_KEYS: (keyof PanMotionValues)[] = [
  "panDirection",
  "panSpeedSeconds",
  "panZoomPct",
  "panDistancePct",
];
const ADVANCE_AND_FIT_KEYS: (keyof AdvanceAndFitValues)[] = ["autoAdvanceSeconds", "backgroundFit"];

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function resolvedName(node: any): string | null {
  const t = node?.type;
  if (typeof t === "string") return t;
  if (t && typeof t === "object") return t.resolvedName ?? null;
  return null;
}

export async function POST(request: NextRequest) {
  const requester = await getRequestMember(request);
  if (!requester?.member.is_admin) {
    return NextResponse.json({ error: "관리자만 접근할 수 있어요." }, { status: 403 });
  }

  let body: { group?: string; values?: Record<string, unknown> };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "요청 본문이 올바르지 않아요." }, { status: 400 });
  }

  const { group, values } = body;
  if (group !== "panMotion" && group !== "advanceAndFit") {
    return NextResponse.json({ error: "group이 올바르지 않아요." }, { status: 400 });
  }
  if (!values || typeof values !== "object") {
    return NextResponse.json({ error: "values가 필요해요." }, { status: 400 });
  }
  const keys = group === "panMotion" ? PAN_MOTION_KEYS : ADVANCE_AND_FIT_KEYS;

  const { data: pages, error: fetchError } = await requester.scopedClient
    .from("page_builder")
    .select("id, craft_state")
    .eq("builder_type", "craft")
    .not("craft_state", "is", null);

  if (fetchError) {
    return NextResponse.json({ error: "페이지를 불러오지 못했어요.", detail: fetchError.message }, { status: 500 });
  }

  let pagesUpdated = 0;
  let timelinesUpdated = 0;
  const failed: string[] = [];

  for (const page of (pages ?? []) as { id: string; craft_state: unknown }[]) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let tree: Record<string, any>;
    try {
      tree = typeof page.craft_state === "string" ? JSON.parse(page.craft_state) : (page.craft_state as Record<string, unknown>);
    } catch {
      continue;
    }
    if (!tree || typeof tree !== "object") continue;

    let pageChanged = false;
    for (const node of Object.values(tree)) {
      if (resolvedName(node) !== "SiloTimelineEmbedBlock") continue;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const props = (node as any).props;
      if (!props || typeof props !== "object") continue;

      for (const key of keys) {
        props[`cover${capitalize(key)}`] = values[key];
      }
      const eventOverlays = props.eventOverlays;
      if (eventOverlays && typeof eventOverlays === "object") {
        for (const overlay of Object.values(eventOverlays)) {
          if (!overlay || typeof overlay !== "object") continue;
          for (const key of keys) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            (overlay as any)[key] = values[key];
          }
        }
      }
      timelinesUpdated += 1;
      pageChanged = true;
    }

    if (!pageChanged) continue;

    const { error: updateError } = await requester.scopedClient
      .from("page_builder")
      .update({ craft_state: JSON.stringify(tree) })
      .eq("id", page.id);

    if (updateError) failed.push(page.id);
    else pagesUpdated += 1;
  }

  return NextResponse.json({ pagesUpdated, timelinesUpdated, failed: failed.length });
}
