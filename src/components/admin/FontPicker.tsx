"use client";

import { useEffect, useRef, useState } from "react";
import { useCustomFonts } from "@/lib/useCustomFonts";
import { uploadFontToR2 } from "@/lib/r2Upload";
import { supabase } from "@/lib/supabaseClient";
import { ALLOWED_FONT_EXTENSIONS, FONT_PREVIEW_TEXT, deriveFontNameFromFilename } from "@/lib/media";
import { LazyFontPreview } from "@/components/admin/LazyFontPreview";

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
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);

  const currentName = value.replace(/^'(.*)'$/, "$1");

  // HOTFIX(사용자 신고 — "폰트 드롭다운을 누르는데, 자꾸 저절로 해제가
  // 돼"): 지금까지 이 드롭다운이 `onMouseLeave`로 닫혔다 — 버튼과 패널
  // 사이의 좁은 틈을 지나가거나 패널 안쪽 스크롤/모서리 근처에서 마우스가
  // 아주 살짝만 벗어나도(트랙패드/자동화 환경일수록 더 자주) 곧바로
  // 닫혀버리는 매우 예민한 방식이었다. UserMenuDropdown.tsx/
  // MembershipPopover.tsx와 동일한 이 코드베이스의 표준 패턴(바깥
  // 클릭 + Escape로만 닫힘)으로 교체 — 마우스가 패널 안팎을 오가도
  // 저절로 닫히지 않는다.
  useEffect(() => {
    if (!open) return;
    function handleClickOutside(e: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    }
    function handleEscape(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [open]);

  // HOTFIX(사용자 지시 — "폰트를 그냥 일괄적으로 올리고 싶어"): 파일을
  // 여러 개 한 번에 고르면(input multiple) 파일마다 이름을 하나하나 타이핑할
  // 수 없으므로 파일명에서 자동으로 이름을 만든다(deriveFontNameFromFilename).
  // 요청은 순차 처리(Promise.all로 동시에 쏘지 않음) — presigned 업로드
  // 라우트에 짧은 시간에 여러 요청이 몰리는 걸 피하고, 실패한 파일이
  // 있어도 나머지는 계속 진행해 부분 실패를 명확히 보여줄 수 있다.
  async function handleUploadFiles(files: FileList) {
    setError(null);
    setUploading(true);
    const failed: string[] = [];
    let lastSuccessName: string | null = null;

    for (const file of Array.from(files)) {
      const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
      if (!ALLOWED_FONT_EXTENSIONS.includes(ext)) {
        failed.push(`${file.name}(지원 안 하는 형식)`);
        continue;
      }
      const name = deriveFontNameFromFilename(file.name);
      if (!name) {
        failed.push(`${file.name}(이름을 만들 수 없음)`);
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
      lastSuccessName = name;
    }

    setUploading(false);
    await refetch();
    if (failed.length > 0) {
      setError(`${failed.length}개 실패: ${failed.join(", ")}`);
    }
    // 파일을 하나만 올렸고 성공했으면 곧바로 그 폰트를 선택해준다(기존
    // 단일 업로드 동작과 동일) — 여러 개를 한 번에 올렸을 때는 어떤 걸
    // 선택할지 애매하므로 자동 선택하지 않고 목록에서 직접 고르게 둔다.
    if (files.length === 1 && lastSuccessName) {
      onChange(`'${lastSuccessName}'`);
      setOpen(false);
    }
  }

  return (
    <div className="relative" ref={rootRef}>
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
        <div className="absolute z-30 mt-1 w-64 rounded-md border border-gray-200 bg-white p-2 shadow-lg">
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
                  <LazyFontPreview fontFamily={font.fontName} text={FONT_PREVIEW_TEXT} className="block text-base" />
                </button>
              ))}
            </div>
          )}

          <div className="mt-2 space-y-1.5 border-t border-gray-100 pt-2">
            <p className="text-[11px] text-gray-500">새 폰트 업로드(여러 개 한 번에 가능)</p>
            <input
              type="file"
              accept=".woff2,.woff,.ttf,.otf"
              multiple
              disabled={uploading}
              onChange={(e) => {
                const files = e.target.files;
                if (files && files.length > 0) handleUploadFiles(files);
                e.target.value = "";
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
