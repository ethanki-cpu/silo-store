// EPIC-053: Block Editor의 이미지/미디어 업로드를 위한 Supabase Storage 유틸리티.
// 기존 admin/navigation/settings의 uploadImage() 로직을 재사용하되, Block Editor
// 전용 버킷(post-images/gallery/attachments)을 사용한다. 이미지 URL뿐 아니라
// Storage Path도 함께 반환해 향후 썸네일 생성/삭제 등 경로 기반 작업이 가능하도록
// 설계한다.

import { supabase } from "./supabaseClient";

/** Block Editor 전용 Storage 버킷 — 필요시 Supabase Dashboard에서 생성 필요 */
export const STORAGE_BUCKETS = {
  /** 게시글 본문 이미지 (사진 1장/여러장/Grid) */
  POST_IMAGES: "post-images",
  /** Gallery/갤러리 확장용 이미지 */
  GALLERY: "gallery",
  /** PDF/오디오 등 첨부파일 */
  ATTACHMENTS: "attachments",
  /** EPIC-087-PHASE-F: 멤버십 팝오버 프로필 사진 */
  AVATARS: "avatars",
} as const;

export type StorageBucket = (typeof STORAGE_BUCKETS)[keyof typeof STORAGE_BUCKETS];

/** 업로드 결과 — public URL과 Storage Path를 함께 반환 */
export type UploadResult = {
  url: string;
  path: string;
  error: string | null;
};

/**
 * 파일을 Supabase Storage에 업로드하고 public URL + Storage Path를 반환한다.
 * @param file 업로드할 파일 (File 객체)
 * @param bucket 대상 버킷 (post-images | gallery | attachments)
 * @param subfolder 버킷 내 서브폴더 (예: "avatars", "covers", "slides")
 */
export async function uploadFile(
  file: File,
  bucket: StorageBucket,
  subfolder: string = "",
): Promise<UploadResult> {
  // 파일명 충돌 방지를 위해 타임스탬프 + UUID 접두사 사용
  const ext = file.name.split(".").pop() ?? "";
  const safeName = `${Date.now()}-${crypto.randomUUID()}.${ext}`;
  const path = subfolder ? `${subfolder}/${safeName}` : safeName;

  const { error: uploadError } = await supabase.storage
    .from(bucket)
    .upload(path, file);

  if (uploadError) {
    return { url: null as unknown as string, path, error: uploadError.message };
  }

  const { data } = supabase.storage.from(bucket).getPublicUrl(path);
  return { url: data.publicUrl, path, error: null };
}

/**
 * 이미지 파일을 post-images 버킷에 업로드한다.
 * Block Editor의 이미지 블록용 — 썸네일 생성 경로도 함께 반환한다.
 */
export async function uploadPostImage(file: File, subfolder: string = "general"): Promise<UploadResult> {
  return uploadFile(file, STORAGE_BUCKETS.POST_IMAGES, subfolder);
}

/**
 * Gallery 이미지를 gallery 버킷에 업로드한다.
 */
export async function uploadGalleryImage(file: File, subfolder: string = "general"): Promise<UploadResult> {
  return uploadFile(file, STORAGE_BUCKETS.GALLERY, subfolder);
}

/**
 * 첨부파일(PDF/오디오 등)을 attachments 버킷에 업로드한다.
 */
export async function uploadAttachment(file: File, subfolder: string = "general"): Promise<UploadResult> {
  return uploadFile(file, STORAGE_BUCKETS.ATTACHMENTS, subfolder);
}

/**
 * Storage Path를 이용해 파일을 삭제한다.
 * auto-save 임시 파일 정리나 사용자가 삭제한 이미지를 정리할 때 사용.
 */
export async function deleteFile(bucket: StorageBucket, path: string): Promise<string | null> {
  const { error } = await supabase.storage.from(bucket).remove([path]);
  return error ? error.message : null;
}

/**
 * 여러 파일을 동시에 업로드한다.
 * 이미지 여러 장 업로드(Grid)나 슬라이드 여러 개 업로드에 사용.
 */
export async function uploadMultipleFiles(
  files: File[],
  bucket: StorageBucket,
  subfolder: string = "general",
): Promise<UploadResult[]> {
  return Promise.all(files.map((file) => uploadFile(file, bucket, subfolder)));
}

/**
 * 클립보드에서 이미지 데이터를 추출해 업로드한다.
 * Ctrl+V 붙여넣기로 이미지를 업로드할 때 사용.
 * @param clipboardData ClipboardEvent.clipboardData
 * @param bucket 대상 버킷
 */
export async function uploadFromClipboard(
  clipboardData: DataTransfer | null,
  bucket: StorageBucket = STORAGE_BUCKETS.POST_IMAGES,
  subfolder: string = "paste",
): Promise<UploadResult[]> {
  if (!clipboardData) return [];

  const results: UploadResult[] = [];
  const items = Array.from(clipboardData.items);

  for (const item of items) {
    if (item.kind !== "file") continue;
    const type = item.type;
    if (!type.startsWith("image/")) continue;

    const file = item.getAsFile();
    if (!file) continue;

    const result = await uploadFile(file, bucket, subfolder);
    results.push(result);
  }

  return results.filter((r) => r.error === null);
}
