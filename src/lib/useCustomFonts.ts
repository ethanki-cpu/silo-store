"use client";

import { useEffect, useState } from "react";
import { supabase } from "./supabaseClient";
import { customFontFromRow, type CustomFont, type CustomFontRow } from "./media";

const STYLE_TAG_ID = "custom-fonts-style";

// woff2/woff/ttf/otf만 지원(Admin 업로드 UI가 강제하는 확장자와 동일) —
// @font-face의 format() 힌트를 file_format 컬럼값으로 직접 매핑한다.
const FONT_FORMAT_MAP: Record<string, string> = {
  woff2: "woff2",
  woff: "woff",
  ttf: "truetype",
  otf: "opentype",
};

function buildFontFaceCss(fonts: CustomFont[]): string {
  return fonts
    .map((font) => {
      const format = FONT_FORMAT_MAP[font.fileFormat] ?? font.fileFormat;
      return `@font-face { font-family: "${font.fontName}"; src: url("${font.fontUrl}") format("${format}"); font-display: swap; }`;
    })
    .join("\n");
}

/**
 * custom_fonts 목록을 불러와 document.head에 @font-face 규칙을 동적으로
 * 주입한다. 에디터 툴바(폰트 드롭다운)와 글 상세 페이지(PostBody) 양쪽이
 * 이 훅을 호출해 같은 <style id="custom-fonts-style"> 태그를 공유한다 —
 * 어느 쪽이 먼저 마운트되든 최신 목록으로 덮어써 항상 최신 상태를 유지한다.
 */
export function useCustomFonts(): { fonts: CustomFont[]; loading: boolean } {
  const [fonts, setFonts] = useState<CustomFont[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      const { data, error } = await supabase
        .from("custom_fonts")
        .select("*")
        .order("font_name", { ascending: true })
        .returns<CustomFontRow[]>();

      if (cancelled) return;
      if (error || !data) {
        setLoading(false);
        return;
      }

      const assets = data.map(customFontFromRow);
      setFonts(assets);
      setLoading(false);

      let styleTag = document.getElementById(STYLE_TAG_ID) as HTMLStyleElement | null;
      if (!styleTag) {
        styleTag = document.createElement("style");
        styleTag.id = STYLE_TAG_ID;
        document.head.appendChild(styleTag);
      }
      styleTag.textContent = buildFontFaceCss(assets);
    }

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  return { fonts, loading };
}
