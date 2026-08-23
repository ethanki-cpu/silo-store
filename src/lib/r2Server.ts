import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";

// EPIC-143-후속: 서버 사이드에서 "외부 URL을 다운로드해 R2에 재호스팅"하는
// 로직이 src/app/api/instagram/fetch/route.ts와 src/lib/embedThumbnail.ts
// (인스타그램 썸네일)에서 둘 다 필요해져 공용 헬퍼로 뽑았다 — 원래
// fetch-external/route.ts에도 같은 getR2Client 패턴이 있었지만 그건
// presigned PUT 흐름 전용이라 여긴 그대로 두고 새로 만든다.
const FETCH_TIMEOUT_MS = 20_000;
const MAX_DOWNLOAD_BYTES = 60 * 1024 * 1024; // 60MB — 릴스 영상 대비 여유 있게.

export function getR2Client(): S3Client {
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

function extFromContentType(ct: string, isVideo: boolean): string {
  const map: Record<string, string> = {
    "image/jpeg": "jpg",
    "image/png": "png",
    "image/webp": "webp",
    "image/heic": "heic",
    "video/mp4": "mp4",
  };
  return map[ct] ?? (isVideo ? "mp4" : "jpg");
}

export async function downloadBuffer(url: string): Promise<{ buffer: Buffer; contentType: string } | null> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(timeout);
    if (!res.ok) return null;
    const contentType = res.headers.get("content-type")?.split(";")[0]?.trim() || "application/octet-stream";
    const buffer = Buffer.from(await res.arrayBuffer());
    if (buffer.byteLength === 0 || buffer.byteLength > MAX_DOWNLOAD_BYTES) return null;
    return { buffer, contentType };
  } catch {
    return null;
  }
}

/** 다운로드한 버퍼를 R2에 올리고 공개 URL을 돌려준다. 실패하면 null. */
export async function uploadBufferToR2(
  buffer: Buffer,
  contentType: string,
  isVideo: boolean,
  keyPrefix: string,
): Promise<string | null> {
  try {
    const bucketName = process.env.R2_BUCKET_NAME;
    const publicUrlBase = process.env.R2_PUBLIC_URL;
    if (!bucketName || !publicUrlBase) return null;
    const ext = extFromContentType(contentType, isVideo);
    const key = `${keyPrefix}-${crypto.randomUUID()}.${ext}`;
    await getR2Client().send(
      new PutObjectCommand({ Bucket: bucketName, Key: key, Body: buffer, ContentType: contentType }),
    );
    return `${publicUrlBase.replace(/\/$/, "")}/${key}`;
  } catch (err) {
    console.error("R2 업로드 실패:", err);
    return null;
  }
}

/** url을 다운로드해 즉시 R2에 재호스팅한다(다운로드+업로드 한 번에). 실패하면 null. */
export async function rehostUrlToR2(url: string, isVideo: boolean, keyPrefix: string): Promise<string | null> {
  const downloaded = await downloadBuffer(url);
  if (!downloaded) return null;
  return uploadBufferToR2(downloaded.buffer, downloaded.contentType, isVideo, keyPrefix);
}
