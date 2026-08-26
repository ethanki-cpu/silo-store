import { NextRequest, NextResponse } from "next/server";
import { getRequestMember } from "@/lib/serverAuth";
import { downloadBuffer, uploadBufferToR2 } from "@/lib/r2Server";
import { GRAPH_API_VERSION, resolveChildMediaUrl, type IgChild } from "@/lib/instagramGraph";

// EPIC-143(사용자 지시 — "Instagram Graph API 기반 네이티브 피드 렌더링"):
// 사일로 스토어 소유 Instagram 비즈니스 계정(_silo_store)의 게시물을 공식
// Graph API로 읽어와, 원본 CDN URL을 클라이언트에 절대 노출하지 않고 서버가
// 직접 다운로드해 Cloudflare R2에 재호스팅한 뒤 Supabase(`instagram_feeds`)에
// 캐싱한다 — 프론트엔드는 이 캐시만 읽으므로 항상 빠르고, Instagram CDN
// URL의 서명 만료(`oe=` 파라미터)와도 무관해진다(src/lib/instagramScraper.ts,
// EPIC-133의 "영구 캐싱하지 않는다"는 설계와는 반대 — 그건 비공식 스크래핑
// 결과라 만료된 서명 URL을 다시 쓸 수 없었던 것과 달리, 이건 공식 API로
// 얻은 우리 소유 계정 미디어를 R2에 우리 소유 사본으로 만드는 것이라 영구
// 보관이 정당하다).
//
// 관리자 전용 POST — Instagram API 호출량과 R2 업로드가 발생하는 무거운
// 작업이라 아무나 트리거할 수 없게 한다. 한 번 호출에 한 페이지(limit개)만
// 처리하고 다음 페이지 커서(nextCursor)를 돌려준다 — 412개 게시물을 한
// 요청으로 전부 처리하면 서버리스 함수 타임아웃 위험이 커서, 프론트(관리자
// 페이지)가 nextCursor가 null이 될 때까지 반복 호출하는 방식으로 나눈다.

// HOTFIX-147.4(사용자 재신고 — 바로크 Act 1: "캐러셀 첫번째는 영상이어야
// 하는데 사진만 나온다"): 실측 확인된 Graph API 버그 — `children{media_type,
// media_url,...}`처럼 자식 필드를 중첩으로 같이 요청하면 응답 순서가
// 실제 캐러셀 표시 순서와 달라진다(반복 재현 — VIDEO 항목이 매번 맨
// 뒤로 밀림, HOTFIX-143.5 복구 이후에도 동일 현상 재발). 반면 `children`을
// 아무 서브필드 없이 bare edge로 요청하면 그 `data: [{id}, ...]` 배열은
// 실제 표시 순서를 그대로 반환한다(Graph API 문서화되지 않은 동작이지만
// 이 계정 데이터로 일관되게 확인됨) — 그래서 순서 정보는 이 bare 목록에서만
// 가져오고, 각 자식의 실제 media_type/media_url은 resolveChildMediaUrl이
// 자식 id 하나하나를 개별 조회해서 채운다(이미 "media_url 누락" 복구용으로
// 있던 로직을 그대로 재사용 — 이제 캐러셀 자식은 항상 이 경로를 탄다).
const MEDIA_FIELDS =
  "id,caption,media_type,media_url,permalink,thumbnail_url,timestamp,children";
const PAGE_LIMIT = 12;

type IgMediaNode = {
  id: string;
  caption?: string;
  media_type: "IMAGE" | "VIDEO" | "CAROUSEL_ALBUM";
  media_url?: string;
  permalink?: string;
  thumbnail_url?: string;
  timestamp?: string;
  children?: { data: { id: string }[] };
};
type IgMediaListResponse = {
  data?: IgMediaNode[];
  paging?: { cursors?: { after?: string }; next?: string };
  error?: { message: string };
};

export async function POST(request: NextRequest) {
  const requester = await getRequestMember(request);
  if (!requester || !requester.member.is_admin) {
    return NextResponse.json({ error: "관리자만 실행할 수 있어요." }, { status: 403 });
  }

  const accessToken = process.env.IG_ACCESS_TOKEN;
  const igUserId = process.env.IG_USER_ID;
  const bucketName = process.env.R2_BUCKET_NAME;
  const publicUrlBase = process.env.R2_PUBLIC_URL;
  if (!accessToken || !igUserId || !bucketName || !publicUrlBase) {
    return NextResponse.json({ error: "Instagram/R2 환경 변수가 설정되지 않았어요." }, { status: 500 });
  }

  let body: { after?: string } = {};
  try {
    body = await request.json();
  } catch {
    // 본문 없이 호출(첫 페이지)도 허용.
  }

  const { data: existingRows, error: existingError } = await requester.scopedClient
    .from("instagram_feeds")
    .select("ig_media_id");
  if (existingError) {
    return NextResponse.json({ error: `기존 데이터 조회 실패: ${existingError.message}` }, { status: 500 });
  }
  const existingIds = new Set((existingRows ?? []).map((r) => r.ig_media_id as string));

  const params = new URLSearchParams({
    fields: MEDIA_FIELDS,
    limit: String(PAGE_LIMIT),
    access_token: accessToken,
  });
  if (body.after) params.set("after", body.after);
  const graphUrl = `https://graph.facebook.com/${GRAPH_API_VERSION}/${igUserId}/media?${params.toString()}`;

  let payload: IgMediaListResponse;
  try {
    const res = await fetch(graphUrl);
    payload = await res.json();
    if (!res.ok) {
      return NextResponse.json(
        { error: payload?.error?.message ?? "Instagram API 호출에 실패했어요." },
        { status: 502 },
      );
    }
  } catch {
    return NextResponse.json({ error: "Instagram API 호출 중 오류가 발생했어요." }, { status: 502 });
  }

  const mediaList = payload.data ?? [];
  let synced = 0;
  let skipped = 0;
  const errors: string[] = [];

  for (const node of mediaList) {
    if (existingIds.has(node.id)) {
      skipped += 1;
      continue;
    }

    // HOTFIX-143.5/147.4: 캐러셀 자식은 항상 id만 넘기고(bare children 목록의
    // 순서를 그대로 보존) media_type/media_url은 resolveChildMediaUrl이
    // 자식별로 개별 조회해서 채운다 — 위 주석 참고.
    const childSources: IgChild[] =
      node.media_type === "CAROUSEL_ALBUM"
        ? (node.children?.data ?? []).map((c) => ({ id: c.id, media_type: "IMAGE" as const, media_url: undefined }))
        : [{ id: node.id, media_type: node.media_type === "VIDEO" ? "VIDEO" : "IMAGE", media_url: node.media_url }];

    const mediaUrls: string[] = [];
    const mediaItemTypes: string[] = [];
    for (const child of childSources) {
      const resolved = await resolveChildMediaUrl(child, accessToken);
      if (!resolved) {
        errors.push(`${node.id}: 캐러셀 항목(${child.id}) 미디어를 찾지 못해 건너뛰었어요.`);
        continue;
      }
      const downloaded = await downloadBuffer(resolved.media_url);
      if (!downloaded) {
        errors.push(`${node.id}: 캐러셀 항목(${child.id}) 다운로드에 실패했어요.`);
        continue;
      }
      const uploaded = await uploadBufferToR2(
        downloaded.buffer,
        downloaded.contentType,
        resolved.media_type === "VIDEO",
        `instagram/${node.id}`,
      );
      if (!uploaded) continue;
      mediaUrls.push(uploaded);
      mediaItemTypes.push(resolved.media_type);
    }

    let thumbnailR2Url: string | null = null;
    if (node.thumbnail_url) {
      const thumbDownload = await downloadBuffer(node.thumbnail_url);
      if (thumbDownload) {
        thumbnailR2Url = await uploadBufferToR2(
          thumbDownload.buffer,
          thumbDownload.contentType,
          false,
          `instagram/${node.id}-thumb`,
        );
      }
    }

    if (mediaUrls.length === 0 && !thumbnailR2Url) {
      errors.push(`${node.id}: 다운로드 가능한 미디어가 없었어요.`);
      continue;
    }

    const { error: insertError } = await requester.scopedClient.from("instagram_feeds").insert({
      ig_media_id: node.id,
      media_type: node.media_type,
      caption: node.caption ?? null,
      permalink: node.permalink ?? null,
      posted_at: node.timestamp ?? null,
      media_urls: mediaUrls,
      media_item_types: mediaItemTypes,
      thumbnail_url: thumbnailR2Url,
    });
    if (insertError) {
      errors.push(`${node.id}: ${insertError.message}`);
      continue;
    }
    synced += 1;
  }

  return NextResponse.json({
    synced,
    skipped,
    errors,
    fetched: mediaList.length,
    nextCursor: payload.paging?.cursors?.after ?? null,
    hasMore: !!payload.paging?.next,
  });
}
