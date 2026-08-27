"use client";

import { useRef, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { ALLOWED_FONT_EXTENSIONS, FONT_PREVIEW_TEXT, deriveFontNameFromFilename } from "@/lib/media";
import { uploadFontToR2 } from "@/lib/r2Upload";
import { useCustomFonts } from "@/lib/useCustomFonts";
import { LazyFontPreview } from "@/components/admin/LazyFontPreview";

// EPIC-083: Admin 전용 커스텀 폰트 업로드/관리 화면 — 에디터 툴바의
// 폰트 드롭다운(src/lib/useCustomFonts.ts가 여기서 만든 목록을 그대로
// 읽어 @font-face로 주입)에 실시간 반영되는 유일한 등록 경로다.
//
// HOTFIX(사용자 지시 — "이 silo 플랫폼에서 사용할 폰트를 그냥 일괄적으로
// 올리고 싶어, 모든 폰트는 프리뷰가 나오게 되어야해"): 지금까지 "이름
// 입력 → 파일 1개 선택"만 가능해 여러 폰트를 한 번에 등록하려면 파일마다
// 이 과정을 반복해야 했다 — 파일을 여러 개 한 번에 고르면(input multiple)
// 각 파일명에서 자동으로 이름을 만들어(deriveFontNameFromFilename) 한
// 번에 전부 등록한다. 목록의 미리보기도 지금까지는 폰트 이름 자체를
// 그 폰트로 렌더링할 뿐이었는데(영문 이름이 많아 한글 지원 여부를 못
// 보여줌), 한글/영문/숫자가 섞인 공용 샘플 문구(FontPicker.tsx와 동일,
// FONT_PREVIEW_TEXT)로 바꿔 모든 폰트가 실제로 어떻게 보이는지 한눈에
// 비교할 수 있게 했다.
export default function AdminFontsPage() {
  // HOTFIX(사용자 신고 — "'등록된 폰트'에 폰트 미리보기가 전혀 안 되는데
  // 새로 올린것들이"): 이 페이지가 지금까지 자체 supabase 쿼리로만 목록을
  // 채웠을 뿐, @font-face 규칙을 문서에 주입하는 건 전혀 하지 않았다 —
  // 그동안 미리보기가 보였던 건 순전히 다른 곳(Navbar 등 useCustomFonts()를
  // 부르는 전역 컴포넌트)이 페이지 로드 시점에 이미 있던 폰트들을 먼저
  // 주입해준 덕분이었다. 그래서 "그 시점 이후 새로 올린 폰트"는 목록에는
  // 뜨지만 실제 @font-face가 없어 미리보기가 항상 기본 글꼴로만 보였다 —
  // useCustomFonts()(다른 화면들과 동일한 유일한 주입 경로)를 그대로
  // 써서 업로드 직후 refetch()가 새 폰트까지 포함해 <style> 태그를
  // 다시 써주게 한다.
  const { fonts, loading, refetch } = useCustomFonts();
  const [uploading, setUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // useCustomFonts()는 폰트 드롭다운(FontPicker) 용으로 이름 오름차순
  // 정렬인데, 이 관리 화면은 방금 올린 폰트를 바로 확인하기 편하도록
  // 기존처럼 최신순으로 보여준다 — 정렬만 이 화면 안에서 다시 한다.
  const sortedFonts = [...fonts].sort((a, b) => b.createdAt.localeCompare(a.createdAt));

  async function handleUploadFiles(files: FileList) {
    setError(null);
    setUploading(true);
    const succeeded: string[] = [];
    const failed: string[] = [];

    for (const [i, file] of Array.from(files).entries()) {
      setUploadStatus(`${i + 1}/${files.length}개 처리 중... (${file.name})`);
      const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
      if (!ALLOWED_FONT_EXTENSIONS.includes(ext)) {
        failed.push(`${file.name}(지원 안 하는 형식 — ${ALLOWED_FONT_EXTENSIONS.join("/")}만 가능)`);
        continue;
      }
      const name = deriveFontNameFromFilename(file.name);
      if (!name) {
        failed.push(`${file.name}(파일명에서 이름을 만들 수 없음)`);
        continue;
      }

      const { fileUrl, error: uploadError } = await uploadFontToR2(file);
      if (uploadError || !fileUrl) {
        failed.push(`${file.name}(${uploadError ?? "업로드 실패"})`);
        continue;
      }

      const { error: insertError } = await supabase.from("custom_fonts").insert({
        font_name: name,
        font_url: fileUrl,
        file_format: ext,
      });
      if (insertError) {
        failed.push(`${file.name}(${insertError.message.includes("duplicate") ? "이미 같은 이름의 폰트가 있어요" : "저장 실패"})`);
        continue;
      }
      succeeded.push(name);
    }

    setUploading(false);
    setUploadStatus(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
    if (failed.length > 0) {
      setError(
        `${succeeded.length}개 성공, ${failed.length}개 실패 — ${failed.join(", ")}`,
      );
    }
    await refetch();
  }

  async function handleDelete(id: string) {
    if (!window.confirm("이 폰트를 삭제할까요? 이미 이 폰트를 쓰는 게시글은 기본 폰트로 대체돼요.")) return;
    await supabase.from("custom_fonts").delete().eq("id", id);
    await refetch();
  }

  return (
    <main className="flex-1 px-8 pb-8 max-w-3xl mx-auto w-full">
      <h1 className="text-2xl font-bold mb-6 pt-2">커스텀 폰트 관리</h1>

      <div className="border border-gray-200 rounded-md p-4 mb-6">
        <h2 className="text-sm font-medium mb-3">새 폰트 업로드</h2>
        <p className="text-xs text-gray-500 mb-2">
          여러 파일을 한 번에 선택하면 전부 일괄 등록돼요 — 이름은 파일명에서 자동으로 만들어요(예: <code>MyBrand-Bold.woff2</code> → <code>MyBrand Bold</code>).
        </p>
        <div className="flex flex-col gap-2">
          <input
            ref={fileInputRef}
            type="file"
            accept=".woff2,.woff,.ttf,.otf"
            multiple
            disabled={uploading}
            onChange={(e) => {
              const files = e.target.files;
              if (files && files.length > 0) handleUploadFiles(files);
            }}
            className="text-sm"
          />
          {uploading && <p className="text-xs text-gray-400">{uploadStatus ?? "업로드 중..."}</p>}
          {error && <p className="text-xs text-red-600">{error}</p>}
        </div>
      </div>

      <h2 className="text-sm font-medium mb-3">등록된 폰트 ({sortedFonts.length}개)</h2>
      {loading ? (
        <p className="text-sm text-gray-400">불러오는 중...</p>
      ) : sortedFonts.length === 0 ? (
        <p className="text-sm text-gray-400">아직 등록된 폰트가 없어요.</p>
      ) : (
        <ul className="divide-y divide-gray-100 border border-gray-200 rounded-md">
          {sortedFonts.map((font) => (
            <li key={font.id} className="flex items-center justify-between gap-4 px-4 py-3">
              <div className="min-w-0 flex-1">
                <p className="text-xs font-medium text-gray-500">
                  {font.fontName} <span className="text-gray-300 uppercase">· {font.fileFormat}</span>
                </p>
                <LazyFontPreview
                  fontFamily={font.fontName}
                  text={FONT_PREVIEW_TEXT}
                  className="mt-1 block truncate text-lg"
                />
              </div>
              <button
                type="button"
                onClick={() => handleDelete(font.id)}
                className="shrink-0 text-xs text-red-600 hover:underline"
              >
                삭제
              </button>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
