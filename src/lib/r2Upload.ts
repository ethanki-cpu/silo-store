// EPIC-083: 에디터가 실제로 EPIC-082 R2 Direct Upload 파이프라인을 쓰도록
// 배선하는 클라이언트 헬퍼 — media-architecture.md가 설계만 해두고
// 미구현이라 명시한 "1~4번 전체 흐름"(presigned 발급 → R2 PUT → 치수 읽기
// → media_library insert)을 함수 하나로 감싼다. src/lib/storage.ts(기존
// Supabase Storage 업로드)와 나란히 두고, 호출부(BlockEditor.tsx)가 어느
// 쪽을 쓸지 고른다 — 기존 게시글 데이터/경로는 이 헬퍼가 전혀 건드리지
// 않는다(하위 호환).

import { supabase } from "./supabaseClient";
import type { MediaAsset, PresignedUploadRequest, PresignedUploadResponse } from "./media";

export type R2UploadResult = { asset: MediaAsset | null; error: string | null };

function readImageDimensions(file: File): Promise<{ width: number | null; height: number | null }> {
  return new Promise((resolve) => {
    if (!file.type.startsWith("image/")) {
      resolve({ width: null, height: null });
      return;
    }
    const img = new Image();
    const objectUrl = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(objectUrl);
      resolve({ width: img.naturalWidth || null, height: img.naturalHeight || null });
    };
    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      resolve({ width: null, height: null });
    };
    img.src = objectUrl;
  });
}

function readVideoMeta(file: File): Promise<{ width: number | null; height: number | null; duration: number | null }> {
  return new Promise((resolve) => {
    if (!file.type.startsWith("video/")) {
      resolve({ width: null, height: null, duration: null });
      return;
    }
    const video = document.createElement("video");
    const objectUrl = URL.createObjectURL(file);
    video.preload = "metadata";
    video.onloadedmetadata = () => {
      URL.revokeObjectURL(objectUrl);
      resolve({
        width: video.videoWidth || null,
        height: video.videoHeight || null,
        duration: Number.isFinite(video.duration) ? Math.round(video.duration) : null,
      });
    };
    video.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      resolve({ width: null, height: null, duration: null });
    };
    video.src = objectUrl;
  });
}

/**
 * 파일 하나를 R2에 직접 업로드하고(pre-signed PUT), media_library에
 * 메타데이터 행을 만든 뒤 그 결과(MediaAsset)를 돌려준다. 로그인이 필요하다
 * (presigned 발급 자체가 인증을 요구 — src/app/api/media/presigned/route.ts).
 */
export async function uploadToR2Media(file: File, altText: string = ""): Promise<R2UploadResult> {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session) {
    return { asset: null, error: "로그인이 필요해요." };
  }
  const authHeader = { Authorization: `Bearer ${session.access_token}` };

  const presignedReq: PresignedUploadRequest = {
    fileName: file.name,
    fileType: file.type,
    fileSize: file.size,
  };

  const presignedRes = await fetch("/api/media/presigned", {
    method: "POST",
    headers: { "Content-Type": "application/json", ...authHeader },
    body: JSON.stringify(presignedReq),
  });
  if (!presignedRes.ok) {
    const data = await presignedRes.json().catch(() => ({}));
    return { asset: null, error: data.error ?? "업로드 URL을 받지 못했어요." };
  }
  const { uploadUrl, publicUrl }: PresignedUploadResponse = await presignedRes.json();

  const putRes = await fetch(uploadUrl, {
    method: "PUT",
    headers: { "Content-Type": file.type },
    body: file,
  });
  if (!putRes.ok) {
    return { asset: null, error: "R2 업로드에 실패했어요." };
  }

  const isVideo = file.type.startsWith("video/");
  let width: number | null = null;
  let height: number | null = null;
  let duration: number | null = null;
  if (isVideo) {
    const meta = await readVideoMeta(file);
    width = meta.width;
    height = meta.height;
    duration = meta.duration;
  } else {
    const meta = await readImageDimensions(file);
    width = meta.width;
    height = meta.height;
  }

  const createRes = await fetch("/api/media", {
    method: "POST",
    headers: { "Content-Type": "application/json", ...authHeader },
    body: JSON.stringify({
      fileUrl: publicUrl,
      fileName: file.name,
      mimeType: file.type,
      sizeBytes: file.size,
      width,
      height,
      duration,
      altText: altText || null,
    }),
  });
  if (!createRes.ok) {
    const data = await createRes.json().catch(() => ({}));
    return { asset: null, error: data.error ?? "미디어 정보를 저장하지 못했어요." };
  }
  const asset: MediaAsset = await createRes.json();
  return { asset, error: null };
}

/** 여러 파일을 순차적으로 uploadToR2Media한다(갤러리 다중 업로드용). */
export async function uploadMultipleToR2Media(files: File[]): Promise<R2UploadResult[]> {
  const results: R2UploadResult[] = [];
  for (const file of files) {
    results.push(await uploadToR2Media(file));
  }
  return results;
}

/**
 * 외부 URL의 이미지를 서버가 대신 내려받아 R2에 재호스팅한다(에디터
 * 클립보드 붙여넣기로 들어온 다른 사이트의 <img src> 처리용,
 * src/app/api/media/fetch-external/route.ts). 브라우저가 직접 fetch하면
 * 대부분 CORS에 막혀 바이트를 읽을 수 없어 uploadToR2Media(File)의
 * presigned PUT 흐름을 쓸 수 없다 — 서버가 대신 내려받는 이 경로가 필요한
 * 이유.
 */
export async function uploadExternalUrlToR2Media(url: string): Promise<R2UploadResult> {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session) {
    return { asset: null, error: "로그인이 필요해요." };
  }

  const res = await fetch("/api/media/fetch-external", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${session.access_token}`,
    },
    body: JSON.stringify({ url }),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    return { asset: null, error: data.error ?? "이미지를 가져오지 못했어요." };
  }
  const asset: MediaAsset = await res.json();
  return { asset, error: null };
}

export type R2FontUploadResult = { fileUrl: string | null; error: string | null };

/**
 * 폰트 파일(.woff2/.woff/.ttf/.otf)을 R2에 직접 업로드만 한다 —
 * media_library가 아니라 custom_fonts 테이블(EPIC-083, font_name/font_url/
 * file_format만 있으면 되는 훨씬 단순한 스키마)에 기록할 것이므로
 * uploadToR2Media처럼 media_library insert 단계를 거치지 않는다.
 */
export async function uploadFontToR2(file: File): Promise<R2FontUploadResult> {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session) {
    return { fileUrl: null, error: "로그인이 필요해요." };
  }
  const authHeader = { Authorization: `Bearer ${session.access_token}` };

  const presignedReq: PresignedUploadRequest = {
    fileName: file.name,
    fileType: file.type,
    fileSize: file.size,
  };

  const presignedRes = await fetch("/api/media/presigned", {
    method: "POST",
    headers: { "Content-Type": "application/json", ...authHeader },
    body: JSON.stringify(presignedReq),
  });
  if (!presignedRes.ok) {
    const data = await presignedRes.json().catch(() => ({}));
    return { fileUrl: null, error: data.error ?? "업로드 URL을 받지 못했어요." };
  }
  const { uploadUrl, publicUrl }: PresignedUploadResponse = await presignedRes.json();

  const putRes = await fetch(uploadUrl, {
    method: "PUT",
    headers: { "Content-Type": file.type },
    body: file,
  });
  if (!putRes.ok) {
    return { fileUrl: null, error: "R2 업로드에 실패했어요." };
  }

  return { fileUrl: publicUrl, error: null };
}
