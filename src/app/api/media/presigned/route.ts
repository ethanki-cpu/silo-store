import { NextRequest, NextResponse } from "next/server";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { getRequestMember } from "@/lib/serverAuth";
import type { PresignedUploadRequest, PresignedUploadResponse } from "@/lib/media";

// EPIC-082: Cloudflare R2 Direct Upload — 브라우저가 서버를 거치지 않고
// R2에 직접 PUT 업로드할 수 있는 pre-signed URL을 발급한다(EPIC-081
// "Data Decoupling & R2 Storage" 전략의 첫 구현). R2는 S3 호환 API를
// 제공하므로 AWS S3 SDK를 그대로 쓰되 endpoint만 R2 계정 엔드포인트로
// 바꾼다 — 실제 파일 바이트는 이 Route Handler를 통과하지 않는다(기존
// src/lib/storage.ts의 Supabase Storage 업로드와 달리, 서버는 URL
// 발급자 역할만 한다).
//
// 이 라우트는 pre-signed URL만 만들 뿐 media_library에 행을 insert하지
// 않는다 — 실제 업로드가 끝났는지 서버가 확인할 방법이 없는 구조적
// 한계(R2가 업로드 완료를 이 서버에 통지하지 않음)라, "업로드 완료 후
// 클라이언트가 결과(publicUrl 등)를 가지고 별도로 media_library에 행을
// 만드는" 다음 단계가 필요하다 — UI 연동과 함께 EPIC-083 범위.

const MAX_FILE_SIZE_BYTES = 100 * 1024 * 1024; // 100MB
const ALLOWED_MIME_PREFIXES = ["image/", "video/", "audio/"];
const PRESIGNED_URL_TTL_SECONDS = 300; // 5분

function sanitizeExtension(fileName: string): string {
  const ext = fileName.split(".").pop() ?? "";
  // R2 객체 키에 안전하지 않은 문자를 걸러낸다 — 확장자만 남기고 나머지는
  // 서버가 생성한 타임스탬프+UUID로 대체(경로 조작/충돌 방지, storage.ts와
  // 동일한 접근).
  return /^[a-zA-Z0-9]{1,10}$/.test(ext) ? ext.toLowerCase() : "";
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

export async function POST(request: NextRequest) {
  // 업로드 URL 발급 자체를 아무나 못 하도록 로그인을 요구한다 — 실제
  // media_library 행 소유권(user_id)도 이 신원을 기준으로 나중에
  // 기록된다(EPIC-083에서 실제 insert 연동 시).
  const requester = await getRequestMember(request);
  if (!requester) {
    return NextResponse.json({ error: "로그인이 필요해요." }, { status: 401 });
  }

  const bucketName = process.env.R2_BUCKET_NAME;
  const publicUrlBase = process.env.R2_PUBLIC_URL;
  if (!bucketName || !publicUrlBase) {
    return NextResponse.json(
      { error: "R2 환경 변수가 설정되지 않았어요." },
      { status: 500 },
    );
  }

  let body: PresignedUploadRequest;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "요청 본문이 올바르지 않아요." }, { status: 400 });
  }

  const { fileName, fileType, fileSize } = body;

  if (!fileName || typeof fileName !== "string") {
    return NextResponse.json({ error: "fileName이 필요해요." }, { status: 400 });
  }
  if (!fileType || typeof fileType !== "string") {
    return NextResponse.json({ error: "fileType이 필요해요." }, { status: 400 });
  }
  if (typeof fileSize !== "number" || fileSize <= 0) {
    return NextResponse.json({ error: "fileSize가 올바르지 않아요." }, { status: 400 });
  }
  if (fileSize > MAX_FILE_SIZE_BYTES) {
    return NextResponse.json(
      { error: `파일 크기는 ${MAX_FILE_SIZE_BYTES / (1024 * 1024)}MB를 넘을 수 없어요.` },
      { status: 400 },
    );
  }
  if (!ALLOWED_MIME_PREFIXES.some((prefix) => fileType.startsWith(prefix))) {
    return NextResponse.json({ error: "지원하지 않는 파일 형식이에요." }, { status: 400 });
  }

  const ext = sanitizeExtension(fileName);
  const uniqueKey = `media/${requester.userId}/${Date.now()}-${crypto.randomUUID()}${ext ? `.${ext}` : ""}`;

  let uploadUrl: string;
  try {
    const client = getR2Client();
    const command = new PutObjectCommand({
      Bucket: bucketName,
      Key: uniqueKey,
      ContentType: fileType,
      ContentLength: fileSize,
    });
    uploadUrl = await getSignedUrl(client, command, { expiresIn: PRESIGNED_URL_TTL_SECONDS });
  } catch (err) {
    console.error("R2 pre-signed URL 생성 실패:", err);
    return NextResponse.json({ error: "업로드 URL을 만들지 못했어요." }, { status: 500 });
  }

  const publicUrl = `${publicUrlBase.replace(/\/$/, "")}/${uniqueKey}`;

  const response: PresignedUploadResponse = { uploadUrl, publicUrl, fileKey: uniqueKey };
  return NextResponse.json(response);
}
