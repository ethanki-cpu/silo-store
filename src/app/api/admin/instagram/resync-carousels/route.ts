import { NextRequest, NextResponse } from "next/server";
import { getRequestMember } from "@/lib/serverAuth";
import { downloadBuffer, uploadBufferToR2 } from "@/lib/r2Server";
import { GRAPH_API_VERSION, resolveChildMediaUrl, type IgChild } from "@/lib/instagramGraph";

// HOTFIX-143.5(사용자 신고 — 바로크 Act 1/2, 아르데코 Gertrude Lawrence 게시글
// 캐러셀에서 일부 사진/영상이 통째로 사라짐): src/app/api/instagram/fetch/
// route.ts는 "새 게시물 최초 동기화"만 처리해 이미 instagram_feeds에 저장된
// (당시 버그로 일부 항목이 누락된) 기존 캐러셀 행은 다시 건드리지 않는다 —
// 이 라우트는 그 기존 CAROUSEL_ALBUM 행들만 골라 Graph API에서 children을
// 통째로 다시 받아와(누락 복구 로직 포함) media_urls/media_item_types를
// 완전히 재구성하고 덮어쓴다. 이미 정상인 행도 다시 받지만(멱등하지만 R2에
// 새 파일이 또 올라감 — 일회성 복구이므로 감수) 어떤 행이 몇 개 누락됐었는지
// 미리 알 방법이 없어 CAROUSEL_ALBUM 전체를 대상으로 한다.
const PAGE_LIMIT = 5; // 캐러셀 1개당 다운로드+업로드가 여러 번이라 적게 묶는다.

export async function POST(request: NextRequest) {
  const requester = await getRequestMember(request);
  if (!requester || !requester.member.is_admin) {
    return NextResponse.json({ error: "관리자만 실행할 수 있어요." }, { status: 403 });
  }

  const accessToken = process.env.IG_ACCESS_TOKEN;
  if (!accessToken) {
    return NextResponse.json({ error: "Instagram 환경 변수가 설정되지 않았어요." }, { status: 500 });
  }

  let body: { after?: string } = {};
  try {
    body = await request.json();
  } catch {
    // 본문 없이 호출(첫 페이지)도 허용.
  }

  let query = requester.scopedClient
    .from("instagram_feeds")
    .select("id, ig_media_id")
    .eq("media_type", "CAROUSEL_ALBUM")
    .order("id", { ascending: true })
    .limit(PAGE_LIMIT);
  if (body.after) {
    query = query.gt("id", body.after);
  }

  const { data: rows, error: fetchError } = await query;
  if (fetchError) {
    return NextResponse.json({ error: `게시물 조회 실패: ${fetchError.message}` }, { status: 500 });
  }

  let updated = 0;
  let unchanged = 0;
  const errors: string[] = [];

  for (const row of rows ?? []) {
    try {
      const res = await fetch(
        `https://graph.facebook.com/${GRAPH_API_VERSION}/${row.ig_media_id}?fields=children{id,media_type,media_url,thumbnail_url}&access_token=${accessToken}`,
      );
      const data = (await res.json()) as { children?: { data: IgChild[] }; error?: { message: string } };
      if (!res.ok) {
        errors.push(`${row.ig_media_id}: ${data.error?.message ?? "Graph API 호출 실패"}`);
        continue;
      }

      const children = data.children?.data ?? [];
      const mediaUrls: string[] = [];
      const mediaItemTypes: string[] = [];
      for (const child of children) {
        const resolved = await resolveChildMediaUrl(child, accessToken);
        if (!resolved) {
          errors.push(`${row.ig_media_id}: 캐러셀 항목(${child.id}) 미디어를 찾지 못해 건너뛰었어요.`);
          continue;
        }
        const downloaded = await downloadBuffer(resolved.media_url);
        if (!downloaded) {
          errors.push(`${row.ig_media_id}: 캐러셀 항목(${child.id}) 다운로드에 실패했어요.`);
          continue;
        }
        const uploaded = await uploadBufferToR2(
          downloaded.buffer,
          downloaded.contentType,
          resolved.media_type === "VIDEO",
          `instagram/${row.ig_media_id}`,
        );
        if (!uploaded) continue;
        mediaUrls.push(uploaded);
        mediaItemTypes.push(resolved.media_type);
      }

      if (mediaUrls.length === 0) {
        errors.push(`${row.ig_media_id}: 복구 가능한 미디어가 없었어요.`);
        continue;
      }

      const { error: updateError } = await requester.scopedClient
        .from("instagram_feeds")
        .update({ media_urls: mediaUrls, media_item_types: mediaItemTypes })
        .eq("id", row.id);
      if (updateError) {
        errors.push(`${row.ig_media_id}: ${updateError.message}`);
        continue;
      }
      updated += 1;
    } catch (e) {
      errors.push(`${row.ig_media_id}: ${e instanceof Error ? e.message : "알 수 없는 오류"}`);
    }
  }

  unchanged = (rows?.length ?? 0) - updated - errors.length;

  const processed = rows?.length ?? 0;
  const nextCursor = processed === PAGE_LIMIT ? rows![processed - 1].id : null;

  return NextResponse.json({
    processed,
    updated,
    unchanged: Math.max(unchanged, 0),
    errors,
    nextCursor,
    hasMore: nextCursor !== null,
  });
}
