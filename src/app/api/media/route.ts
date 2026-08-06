import { NextRequest, NextResponse } from "next/server";
import { getRequestMember } from "@/lib/serverAuth";
import type { CreateMediaAssetRequest, MediaAsset, MediaLibraryRow } from "@/lib/media";
import { mediaAssetFromRow } from "@/lib/media";

// EPIC-083: media-architecture.md "6. EPIC-083을 위한 마이그레이션 메모 §1"이
// 말하는 "업로드 완료 확인 API" — POST /api/media/presigned가 발급한
// pre-signed URL로 브라우저가 R2에 직접 PUT한 *뒤에*, 그 결과(publicUrl 등)를
// 가지고 media_library에 메타데이터 행을 만드는 두 번째 단계. R2 업로드
// 성공 여부를 서버가 직접 알 방법이 없는 구조적 한계상(presigned route.ts
// 주석 참고), 이 라우트는 클라이언트가 "업로드가 실제로 끝났다"고 보고하는
// 것을 그대로 신뢰한다 — fileUrl은 어차피 클라이언트가 R2에 실제로 PUT한
// 그 키를 그대로 넘길 뿐이라(presigned URL 자체가 그 키에 서명돼 있으므로
// 다른 키로 위조 업로드는 안 됨), 신뢰 경계 확장은 아니다.
export async function POST(request: NextRequest) {
  const requester = await getRequestMember(request);
  if (!requester) {
    return NextResponse.json({ error: "로그인이 필요해요." }, { status: 401 });
  }

  let body: CreateMediaAssetRequest;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "요청 본문이 올바르지 않아요." }, { status: 400 });
  }

  const { fileUrl, fileName, mimeType, sizeBytes, width, height, duration, altText } = body;

  if (!fileUrl || typeof fileUrl !== "string") {
    return NextResponse.json({ error: "fileUrl이 필요해요." }, { status: 400 });
  }
  if (!fileName || typeof fileName !== "string") {
    return NextResponse.json({ error: "fileName이 필요해요." }, { status: 400 });
  }
  if (!mimeType || typeof mimeType !== "string") {
    return NextResponse.json({ error: "mimeType이 필요해요." }, { status: 400 });
  }
  if (typeof sizeBytes !== "number" || sizeBytes <= 0) {
    return NextResponse.json({ error: "sizeBytes가 올바르지 않아요." }, { status: 400 });
  }

  // 본인 소유로만 기록한다(scopedClient의 RLS insert 정책도 동일하게
  // auth.uid() = user_id를 요구 — 여기서 requester.userId를 강제하는 건
  // 클라이언트가 다른 user_id를 보내는 것 자체를 원천 차단하기 위함).
  const { data, error } = await requester.scopedClient
    .from("media_library")
    .insert({
      user_id: requester.userId,
      file_url: fileUrl,
      file_name: fileName,
      mime_type: mimeType,
      size_bytes: sizeBytes,
      width: width ?? null,
      height: height ?? null,
      duration: duration ?? null,
      alt_text: altText ?? null,
    })
    .select()
    .single<MediaLibraryRow>();

  if (error || !data) {
    console.error("media_library insert 실패:", error);
    return NextResponse.json({ error: "미디어 정보를 저장하지 못했어요." }, { status: 500 });
  }

  const asset: MediaAsset = mediaAssetFromRow(data);
  return NextResponse.json(asset);
}
