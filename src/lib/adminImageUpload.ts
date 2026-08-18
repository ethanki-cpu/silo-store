// B1(홈페이지 설정 관리 Craft.js 전환): 원래 /admin/navigation/settings/
// page.tsx 안에만 있던 이미지 업로드/압축 유틸을 공용 lib로 추출 —
// 동작은 전혀 안 바꾸고(그대로 잘라 옮김), 새 Craft 블록의 설정 패널
// (ChromeLogoSettings 등)도 같은 업로드 경로를 쓸 수 있게 한다.
import { supabase } from "@/lib/supabaseClient";

const STORAGE_BUCKET = "public-assets";

export async function uploadImage(
  file: File,
  folder: string,
): Promise<{ url: string | null; error: string | null }> {
  const path = `${folder}/${Date.now()}-${file.name}`;
  const { error: uploadError } = await supabase.storage
    .from(STORAGE_BUCKET)
    .upload(path, file);

  if (uploadError) {
    return { url: null, error: uploadError.message };
  }

  const { data } = supabase.storage.from(STORAGE_BUCKET).getPublicUrl(path);
  return { url: data.publicUrl, error: null };
}

// EPIC-078 후속: 여백 배경 이미지를 원본 대비 quality%(1~100)로 재인코딩한다
// — 캔버스에 원본 해상도 그대로 그린 뒤 압축(리사이즈는 하지 않음, 오직
// 압축률만 조절). 100이면 원본을 그대로 둔다(불필요한 손실 재인코딩 방지).
// 외부 서비스 없이 브라우저 canvas만으로 동작한다.
//
// EPIC-079-PHASE-2 버그 픽스: 이전엔 항상 image/jpeg로 인코딩했는데, JPEG는
// 알파 채널이 없어 투명 PNG를 업로드하면 캔버스의 투명 영역이 검정으로
// 합성(flatten)되어 저장됐다 — "여백 배경 이미지가 검정색으로 나온다"는
// 증상의 원인. 알파를 보존하는 image/webp로 인코딩해 투명 영역이 실제로
// 투명하게 저장되도록 한다.
export async function compressImage(file: File, quality: number): Promise<File> {
  if (quality >= 100) return file;

  const bitmap = await createImageBitmap(file);
  const canvas = document.createElement("canvas");
  canvas.width = bitmap.width;
  canvas.height = bitmap.height;
  const ctx = canvas.getContext("2d");
  if (!ctx) return file;
  ctx.drawImage(bitmap, 0, 0);

  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, "image/webp", Math.max(1, Math.min(100, quality)) / 100),
  );
  if (!blob) return file;

  const newName = file.name.replace(/\.[^.]+$/, "") + ".webp";
  return new File([blob], newName, { type: "image/webp" });
}
