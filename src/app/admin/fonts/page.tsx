"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { customFontFromRow, type CustomFont, type CustomFontRow } from "@/lib/media";
import { uploadFontToR2 } from "@/lib/r2Upload";

const ALLOWED_EXTENSIONS = ["woff2", "woff", "ttf", "otf"];

function extensionOf(fileName: string): string {
  return fileName.split(".").pop()?.toLowerCase() ?? "";
}

// EPIC-083: Admin 전용 커스텀 폰트 업로드/관리 화면 — 에디터 툴바의
// 폰트 드롭다운(src/lib/useCustomFonts.ts가 여기서 만든 목록을 그대로
// 읽어 @font-face로 주입)에 실시간 반영되는 유일한 등록 경로다.
export default function AdminFontsPage() {
  const [fonts, setFonts] = useState<CustomFont[]>([]);
  const [loading, setLoading] = useState(true);
  const [fontName, setFontName] = useState("");
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const loadFonts = useCallback(async () => {
    setLoading(true);
    const { data, error: fetchError } = await supabase
      .from("custom_fonts")
      .select("*")
      .order("created_at", { ascending: false })
      .returns<CustomFontRow[]>();
    if (!fetchError && data) {
      setFonts(data.map(customFontFromRow));
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    loadFonts();
  }, [loadFonts]);

  async function handleUpload(file: File) {
    setError(null);
    const ext = extensionOf(file.name);
    if (!ALLOWED_EXTENSIONS.includes(ext)) {
      setError(`지원하지 않는 파일 형식이에요 — ${ALLOWED_EXTENSIONS.join("/")}만 가능해요.`);
      return;
    }
    const name = fontName.trim();
    if (!name) {
      setError("폰트 이름을 먼저 입력해주세요.");
      return;
    }

    setUploading(true);
    const { fileUrl, error: uploadError } = await uploadFontToR2(file);
    if (uploadError || !fileUrl) {
      setError(uploadError ?? "업로드에 실패했어요.");
      setUploading(false);
      return;
    }

    const { error: insertError } = await supabase.from("custom_fonts").insert({
      font_name: name,
      font_url: fileUrl,
      file_format: ext,
    });
    setUploading(false);

    if (insertError) {
      setError(
        insertError.message.includes("duplicate")
          ? "이미 같은 이름의 폰트가 있어요 — 다른 이름을 써주세요."
          : "폰트 정보를 저장하지 못했어요.",
      );
      return;
    }

    setFontName("");
    if (fileInputRef.current) fileInputRef.current.value = "";
    await loadFonts();
  }

  async function handleDelete(id: string) {
    if (!window.confirm("이 폰트를 삭제할까요? 이미 이 폰트를 쓰는 게시글은 기본 폰트로 대체돼요.")) return;
    await supabase.from("custom_fonts").delete().eq("id", id);
    await loadFonts();
  }

  return (
    <main className="flex-1 px-8 pb-8 max-w-3xl mx-auto w-full">
      <h1 className="text-2xl font-bold mb-6 pt-2">커스텀 폰트 관리</h1>

      <div className="border border-gray-200 rounded-md p-4 mb-6">
        <h2 className="text-sm font-medium mb-3">새 폰트 업로드</h2>
        <div className="flex flex-col gap-2">
          <input
            type="text"
            value={fontName}
            onChange={(e) => setFontName(e.target.value)}
            placeholder="폰트 이름 (예: MyBrandFont)"
            className="text-sm border border-gray-300 rounded px-3 py-2"
            disabled={uploading}
          />
          <input
            ref={fileInputRef}
            type="file"
            accept=".woff2,.woff,.ttf,.otf"
            disabled={uploading}
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleUpload(file);
            }}
            className="text-sm"
          />
          {uploading && <p className="text-xs text-gray-400">업로드 중...</p>}
          {error && <p className="text-xs text-red-600">{error}</p>}
        </div>
      </div>

      <h2 className="text-sm font-medium mb-3">등록된 폰트 ({fonts.length}개)</h2>
      {loading ? (
        <p className="text-sm text-gray-400">불러오는 중...</p>
      ) : fonts.length === 0 ? (
        <p className="text-sm text-gray-400">아직 등록된 폰트가 없어요.</p>
      ) : (
        <ul className="divide-y divide-gray-100 border border-gray-200 rounded-md">
          {fonts.map((font) => (
            <li key={font.id} className="flex items-center justify-between px-4 py-3">
              <div>
                <p className="text-sm font-medium" style={{ fontFamily: font.fontName }}>
                  {font.fontName}
                </p>
                <p className="text-xs text-gray-400 uppercase">{font.fileFormat}</p>
              </div>
              <button
                type="button"
                onClick={() => handleDelete(font.id)}
                className="text-xs text-red-600 hover:underline"
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
