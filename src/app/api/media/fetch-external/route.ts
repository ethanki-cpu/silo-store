import { NextRequest, NextResponse } from "next/server";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { getRequestMember } from "@/lib/serverAuth";
import type { MediaAsset, MediaLibraryRow } from "@/lib/media";
import { mediaAssetFromRow } from "@/lib/media";

// EPIC-084: 다른 웹사이트에서 여러 이미지를 드래그 선택해 복사한 뒤 에디터에
// 붙여넣으면(Paste Event) 클립보드 HTML에 원본 사이트 도메인의 <img src>가
// 그대로 들어있다 — 지금까지는 그 외부 URL을 그대로 hotlink했다(원본이
// 지워지거나 hotlink 차단되면 깨짐, Archive First 원칙과도 어긋남). 이
// 라우트는 그 외부 이미지를 서버가 대신 내려받아 R2에 재호스팅한다.
// 브라우저에서 직접 fetch하면 대부분의 사이트가 CORS를 막아 바이트 자체를
// 읽을 수 없어(요청 자체는 가지만 opaque 응답), presigned PUT 클라이언트
// 흐름(r2Upload.ts)과 달리 서버가 직접 내려받아 PutObjectCommand로 올린다.
const MAX_FETCH_BYTES = 25 * 1024 * 1024; // 25MB
const FETCH_TIMEOUT_MS = 15_000;

function isBlockedHostname(hostname: string): boolean {
  const lower = hostname.toLowerCase();
  if (lower === "localhost" || lower.endsWith(".localhost")) return true;
  // 사설/루프백 IP 리터럴만 걸러낸다(도메인 뒤에서 사설 IP로 리졸브되는
  // DNS 리바인딩까지는 막지 못하지만, 로그인한 사용자만 호출 가능한 저위험
  // 경로에 대한 최소한의 방어선).
  if (/^127\./.test(lower) || lower === "0.0.0.0" || lower === "::1") return true;
  if (/^10\./.test(lower) || /^192\.168\./.test(lower)) return true;
  if (/^172\.(1[6-9]|2\d|3[0-1])\./.test(lower)) return true;
  return false;
}

function getR2Client(): S3Client {
  const accountId = process.env.R2_ACCOUNT_ID;
  const accessKeyId = process.env.R2_ACCESS_KEY_ID;
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;
  if (!accountId || !accessKeyId || !secretAccessKey) {
    throw new Error("R2 환경 변수가 설정되지 않았어요.");
  }
  return new S3Client({
    region: "auto",
    endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
    credentials: { accessKeyId, secretAccessKey },
  });
}

function extensionFromMime(mime: string): string {
  const map: Record<string, string> = {
    "image/jpeg": "jpg",
    "image/png": "png",
    "image/gif": "gif",
    "image/webp": "webp",
    "image/svg+xml": "svg",
    "image/avif": "avif",
  };
  return map[mime] ?? "jpg";
}

export async function POST(request: NextRequest) {
  const requester = await getRequestMember(request);
  if (!requester) {
    return NextResponse.json({ error: "로그인이 필요해요." }, { status: 401 });
  }

  const bucketName = process.env.R2_BUCKET_NAME;
  const publicUrlBase = process.env.R2_PUBLIC_URL;
  if (!bucketName || !publicUrlBase) {
    return NextResponse.json({ error: "R2 환경 변수가 설정되지 않았어요." }, { status: 500 });
  }

  let body: { url?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "요청 본문이 올바르지 않아요." }, { status: 400 });
  }

  const sourceUrl = body.url;
  if (!sourceUrl || typeof sourceUrl !== "string") {
    return NextResponse.json({ error: "url이 필요해요." }, { status: 400 });
  }

  let parsed: URL;
  try {
    parsed = new URL(sourceUrl);
  } catch {
    return NextResponse.json({ error: "올바른 URL이 아니에요." }, { status: 400 });
  }
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    return NextResponse.json({ error: "http/https URL만 지원해요." }, { status: 400 });
  }
  if (isBlockedHostname(parsed.hostname)) {
    return NextResponse.json({ error: "이 주소는 가져올 수 없어요." }, { status: 400 });
  }

  let upstream: Response;
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
    upstream = await fetch(parsed.toString(), { signal: controller.signal });
    clearTimeout(timeout);
  } catch {
    return NextResponse.json({ error: "이미지를 가져오지 못했어요." }, { status: 502 });
  }

  if (!upstream.ok) {
    return NextResponse.json({ error: "이미지를 가져오지 못했어요." }, { status: 502 });
  }

  const mimeType = upstream.headers.get("content-type")?.split(";")[0]?.trim() ?? "";
  if (!mimeType.startsWith("image/")) {
    return NextResponse.json({ error: "이미지 URL이 아니에요." }, { status: 400 });
  }

  const buffer = Buffer.from(await upstream.arrayBuffer());
  if (buffer.byteLength === 0) {
    return NextResponse.json({ error: "빈 파일이에요." }, { status: 400 });
  }
  if (buffer.byteLength > MAX_FETCH_BYTES) {
    return NextResponse.json(
      { error: `이미지 크기는 ${MAX_FETCH_BYTES / (1024 * 1024)}MB를 넘을 수 없어요.` },
      { status: 400 },
    );
  }

  const ext = extensionFromMime(mimeType);
  const fileName = parsed.pathname.split("/").pop() || `image.${ext}`;
  const uniqueKey = `media/${requester.userId}/${Date.now()}-${crypto.randomUUID()}.${ext}`;

  try {
    const client = getR2Client();
    await client.send(
      new PutObjectCommand({
        Bucket: bucketName,
        Key: uniqueKey,
        Body: buffer,
        ContentType: mimeType,
      }),
    );
  } catch (err) {
    console.error("R2 업로드 실패(외부 이미지 재호스팅):", err);
    return NextResponse.json({ error: "이미지를 저장하지 못했어요." }, { status: 500 });
  }

  const publicUrl = `${publicUrlBase.replace(/\/$/, "")}/${uniqueKey}`;

  const { data, error } = await requester.scopedClient
    .from("media_library")
    .insert({
      user_id: requester.userId,
      file_url: publicUrl,
      file_name: fileName,
      mime_type: mimeType,
      size_bytes: buffer.byteLength,
      width: null,
      height: null,
      duration: null,
      alt_text: null,
    })
    .select()
    .single<MediaLibraryRow>();

  if (error || !data) {
    console.error("media_library insert 실패(외부 이미지 재호스팅):", error);
    return NextResponse.json({ error: "미디어 정보를 저장하지 못했어요." }, { status: 500 });
  }

  const asset: MediaAsset = mediaAssetFromRow(data);
  return NextResponse.json(asset);
}
