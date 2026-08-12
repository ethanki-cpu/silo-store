"use client";

import { useState } from "react";
import { useCustomFonts } from "@/lib/useCustomFonts";
import { uploadFontToR2 } from "@/lib/r2Upload";
import { supabase } from "@/lib/supabaseClient";

const ALLOWED_EXTENSIONS = ["woff2", "woff", "ttf", "otf"];

// 사용자 지시(2026-08-12): "게시물 출력방식"의 폰트 필드가 그냥 자유
// 텍스트 입력이었던 것에 대해 "폰트를 추가할 수 있게 해달라"는 신고 —
// CSS font-family 문자열을 손으로 타이핑하는 건 이미 호스팅된 폰트가
// 없으면 아무 효과가 없다(브라우저 기본 폰트로 조용히 폴백). /admin/fonts
// (EPIC-083)에 이미 있는 커스텀 폰트 업로드 인프라(custom_fonts 테이블,
// useCustomFonts()의 @font-face 자동 주입)를 그대로 재사용해 (1) 이미
// 올려둔 폰트를 실제로 그 폰트로 렌더링된 미리보기와 함께 고르고, (2) 이
// 자리에서 바로 새 폰트를 업로드해 곧바로 선택할 수 있게 한다 — /admin/fonts
// 로 따로 이동할 필요가 없다.
export function FontPicker({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (fontFamily: string) => void;
}) {
  const { fonts, refetch } = useCustomFonts();
  const [open, setOpen] = useState(false);
  const [newFontName, setNewFontName] = useState("");
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const currentName = value.replace(/^'(.*)'$/, "$1");

  async function handleUpload(file: File) {
    setError(null);
    const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
    if (!ALLOWED_EXTENSIONS.includes(ext)) {
      setError(`지원하지 않는 파일 형식이에요 — ${ALLOWED_EXTENSIONS.join("/")}만 가능해요.`);
      return;
    }
    const name = newFontName.trim();
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

    await refetch();
    onChange(`'${name}'`);
    setNewFontName("");
    setOpen(false);
  }

  return (
    <div className="relative">
      <label className="block text-xs font-medium text-gray-600 mb-1">{label}</label>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between rounded-md border border-gray-300 bg-white px-2 py-1.5 text-sm"
      >
        <span style={value ? { fontFamily: value } : undefined}>{value ? currentName : "기본값"}</span>
        <span className="text-gray-400">▾</span>
      </button>

      {open && (
        <div
          className="absolute z-30 mt-1 w-64 rounded-md border border-gray-200 bg-white p-2 shadow-lg"
          onMouseLeave={() => setOpen(false)}
        >
          <button
            type="button"
            onClick={() => {
              onChange("");
              setOpen(false);
            }}
            className={`block w-full rounded px-2 py-1.5 text-left text-sm hover:bg-gray-50 ${!value ? "bg-gray-100" : ""}`}
          >
            기본값
          </button>

          {fonts.length === 0 ? (
            <p className="px-2 py-1.5 text-xs text-gray-400">아직 업로드된 폰트가 없어요.</p>
          ) : (
            <div className="max-h-48 overflow-y-auto">
              {fonts.map((font) => (
                <button
                  key={font.id}
                  type="button"
                  onClick={() => {
                    onChange(`'${font.fontName}'`);
                    setOpen(false);
                  }}
                  className={`block w-full rounded px-2 py-1.5 text-left hover:bg-gray-50 ${
                    currentName === font.fontName ? "bg-gray-100" : ""
                  }`}
                >
                  <span className="block text-[10px] text-gray-400">{font.fontName}</span>
                  <span className="block text-base" style={{ fontFamily: font.fontName }}>
                    Silo Store 사일로 다람쥐
                  </span>
                </button>
              ))}
            </div>
          )}

          <div className="mt-2 space-y-1.5 border-t border-gray-100 pt-2">
            <p className="text-[11px] text-gray-500">새 폰트 업로드</p>
            <input
              type="text"
              value={newFontName}
              onChange={(e) => setNewFontName(e.target.value)}
              placeholder="폰트 이름 (예: MyBrandFont)"
              disabled={uploading}
              className="w-full rounded-md border border-gray-300 px-2 py-1 text-xs"
            />
            <input
              type="file"
              accept=".woff2,.woff,.ttf,.otf"
              disabled={uploading}
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleUpload(file);
              }}
              className="w-full text-xs"
            />
            {uploading && <p className="text-[11px] text-gray-400">업로드 중...</p>}
            {error && <p className="text-[11px] text-red-600">{error}</p>}
          </div>
        </div>
      )}
    </div>
  );
}
