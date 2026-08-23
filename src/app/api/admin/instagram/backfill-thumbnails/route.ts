import { NextRequest, NextResponse } from "next/server";
import { getRequestMember } from "@/lib/serverAuth";
import { resolveFallbackEmbedThumbnail } from "@/lib/embedThumbnail";
import type { JSONContent } from "@/lib/blockEditorCore";

// EPIC-143-후속(사용자 지시 — "게시판이 존재하는 모든 페이지의 글들도 다
// 확인해... thumbnail 다 작동안돼"): embedThumbnail.ts가 이제 Instagram
// og:image를 R2에 재호스팅하지만, 그건 앞으로 저장되는 글에만 적용된다.
// 이미 저장된 posts.featured_image_url이 scontent-*.cdninstagram.com /
// *.fbcdn.net 직링크인 기존 글(약 285개 중 248개, 전체 게시판 공통)은
// 그대로 깨진 채로 남아있어 별도로 다시 계산해 덮어써야 한다 — 이 라우트가
// 그 일회성 백필을 담당한다.
//
// 관리자 전용 + 페이지네이션(게시물 하나당 og:image 스크래핑 1회 + R2
// 업로드 1회 = 네트워크 왕복 2번이라, 한 번 호출에 다수를 처리하면 서버리스
// 타임아웃 위험이 커서 /api/instagram/fetch와 동일하게 커서 기반으로
// 나눈다 — 관리자 페이지가 nextCursor가 null이 될 때까지 반복 호출한다.
const PAGE_LIMIT = 10;
const BROKEN_THUMBNAIL_PATTERNS = ["cdninstagram.com", "fbcdn.net"];

export async function POST(request: NextRequest) {
  const requester = await getRequestMember(request);
  if (!requester || !requester.member.is_admin) {
    return NextResponse.json({ error: "관리자만 실행할 수 있어요." }, { status: 403 });
  }

  let body: { after?: string } = {};
  try {
    body = await request.json();
  } catch {
    // 본문 없이 호출(첫 페이지)도 허용.
  }

  // PostgREST는 OR 안에서 여러 ilike를 한 번에 걸 수 있다 — cdninstagram.com
  // 과 fbcdn.net 둘 다 걸린 것들을 한 쿼리로 찾는다.
  const orFilter = BROKEN_THUMBNAIL_PATTERNS.map((p) => `featured_image_url.ilike.%${p}%`).join(",");

  let query = requester.scopedClient
    .from("posts")
    .select("id, body_json, featured_image_url")
    .or(orFilter)
    .order("id", { ascending: true })
    .limit(PAGE_LIMIT);
  if (body.after) {
    query = query.gt("id", body.after);
  }

  const { data: posts, error: fetchError } = await query;
  if (fetchError) {
    return NextResponse.json({ error: `게시글 조회 실패: ${fetchError.message}` }, { status: 500 });
  }

  let updated = 0;
  let unresolved = 0;
  const errors: string[] = [];

  for (const post of posts ?? []) {
    try {
      const newUrl = await resolveFallbackEmbedThumbnail(post.body_json as JSONContent | null);
      if (!newUrl || newUrl === post.featured_image_url) {
        unresolved += 1;
        continue;
      }
      const { error: updateError } = await requester.scopedClient
        .from("posts")
        .update({ featured_image_url: newUrl })
        .eq("id", post.id);
      if (updateError) {
        errors.push(`${post.id}: ${updateError.message}`);
        continue;
      }
      updated += 1;
    } catch (e) {
      errors.push(`${post.id}: ${e instanceof Error ? e.message : "알 수 없는 오류"}`);
    }
  }

  const processed = posts?.length ?? 0;
  const nextCursor = processed === PAGE_LIMIT ? posts![processed - 1].id : null;

  return NextResponse.json({
    processed,
    updated,
    unresolved,
    errors,
    nextCursor,
    hasMore: nextCursor !== null,
  });
}
