// B1(홈페이지 설정 관리 Craft.js 전환): 원래 /admin/navigation/settings/
// page.tsx 안에만 있던 이미지 업로드/압축 유틸을 공용 lib로 추출 —
// 동작은 전혀 안 바꾸고(그대로 잘라 옮김), 새 Craft 블록의 설정 패널
// (ChromeLogoSettings 등)도 같은 업로드 경로를 쓸 수 있게 한다.
import { supabase } from "@/lib/supabaseClient";

const STORAGE_BUCKET = "public-assets";

// HOTFIX-141.3(사용자 신고 — "상단 사이드바 여닫이 트리거 아이콘...기본
// 이미지가 업로드가 안돼", 실제 alert로 확인된 원인: "Invalid key:
// top_sidebar_trigger/...ChatGPT Image 2026년 8월 22일 오전 03_59_23.webp"):
// 이 함수가 모든 업로드(로고/슬라이드/사이드바 아이콘/링크 이미지/폰트 등)의
// 저장 경로를 `file.name`을 그대로 이어붙여 만드는데, Supabase Storage는
// S3 호환 오브젝트 키라 한글·공백(특히 ChatGPT 내보내기가 쓰는 좁은
// 공백문자 등 비-ASCII 공백)이 섞인 파일명을 그대로 넣으면 "Invalid key"로
// 거부한다. 원본 파일명은 어디에도 노출되지 않는 내부 저장 키일 뿐이라,
// 사람이 매번 파일명을 영문으로 바꿔 재업로드하게 만드는 대신 여기서
// 한 번에 안전한 키로 정규화한다 — 확장자는 보존하고 나머지는 영숫자/
// -/_만 남긴다.
function sanitizeFileName(name: string): string {
  const dotIndex = name.lastIndexOf(".");
  const base = dotIndex > 0 ? name.slice(0, dotIndex) : name;
  const ext = dotIndex > 0 ? name.slice(dotIndex).replace(/[^a-zA-Z0-9.]/g, "") : "";
  const safeBase =
    base
      .replace(/[^a-zA-Z0-9-]+/g, "_")
      .replace(/_+/g, "_")
      .replace(/^_|_$/g, "") || "file";
  return `${safeBase}${ext}`;
}

export async function uploadImage(
  file: File,
  folder: string,
): Promise<{ url: string | null; error: string | null }> {
  const path = `${folder}/${Date.now()}-${sanitizeFileName(file.name)}`;
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
// HOTFIX-141.7(사용자 신고 — "상단 사이드바의 hover 이미지가 gif 파일인데
// 애니메이션이 작동 안되고 있어. pc와 모바일 둘다야"): HOTFIX-141.4에서
// 트리거 아이콘 업로드에 이 함수를 추가하면서(대용량 파일 타임아웃 방지
// 목적) 원인을 만들었다 — canvas에 그려서 재인코딩하는 방식은
// createImageBitmap이 애니메이션 GIF의 첫 프레임만 캡처하기 때문에
// 결과물이 항상 정지 이미지가 된다. GIF는 압축해도 얻는 이득보다
// 애니메이션을 잃는 손해가 훨씬 크므로, 원본 그대로 통과시킨다 — 이
// 함수를 쓰는 모든 호출부(현재/향후)에 한 번에 적용된다.
export async function compressImage(file: File, quality: number): Promise<File> {
  if (quality >= 100 || file.type === "image/gif") return file;

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
