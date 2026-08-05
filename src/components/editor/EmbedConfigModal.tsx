"use client";

import { useMemo, useState } from "react";
import {
  detectProvider,
  clampInstagramWidth,
  INSTAGRAM_WIDTH_MIN,
  INSTAGRAM_WIDTH_MAX,
  type EmbedAspectRatio,
  type EmbedProvider,
} from "@/lib/blockEditorCore";

// EPIC-079-PHASE-3: 기존의 "먼저 플랫폼을 고르고(툴바 드롭다운) 그다음
// window.prompt()로 URL을 입력받는" 방식을, "URL을 먼저 붙여넣으면 플랫폼을
// 자동으로 인식하고, 그 플랫폼에 맞는 옵션(비율/캡션/사이즈)을 보여주는"
// 모달로 대체한다 — 플랫폼별 세부 옵션이 늘어나면서 prompt() 하나로는 더
// 이상 표현할 수 없어졌다(prompt는 문자열 하나만 받을 수 있음).
const PROVIDER_LABELS: Record<EmbedProvider, string> = {
  youtube: "YouTube",
  vimeo: "Vimeo",
  instagram: "Instagram",
  spotify: "Spotify",
  googleMaps: "Google Maps",
  twitter: "X (Twitter)",
  naverBlog: "네이버 블로그",
  naverMap: "네이버 지도",
  raw: "임베드",
  customHtml: "HTML 코드",
};

export type EmbedInsertResult = {
  provider: EmbedProvider;
  url: string;
  height: number | null;
  aspectRatio: EmbedAspectRatio | null;
  hideCaption: boolean;
  // instagram 전용 — 위젯 너비(px, 326~540). null이면 기본값(540).
  width: number | null;
  // customHtml 전용 — 사용자가 직접 붙여넣은 임베드 HTML 원본.
  rawHtml: string;
};

export function EmbedConfigModal({
  onInsert,
  onClose,
}: {
  onInsert: (result: EmbedInsertResult) => void;
  onClose: () => void;
}) {
  // EPIC-079-PHASE-4: URL 자동 인식이 안 되거나(지원 안 하는 사이트) 공식
  // 위젯이 필요한 만큼 세부 제어를 못 해주는 경우(예: Instagram 좋아요/
  // 댓글 아이콘 숨기기는 공식 위젯에 그런 옵션 자체가 없음)를 위해, "URL"
  // 대신 임베드 코드(HTML)를 통째로 붙여넣는 모드를 추가한다.
  const [mode, setMode] = useState<"url" | "html">("url");
  const [url, setUrl] = useState("");
  const [aspectRatio, setAspectRatio] = useState<EmbedAspectRatio>("16:9");
  const [hideCaption, setHideCaption] = useState(false);
  const [instagramWidth, setInstagramWidth] = useState(INSTAGRAM_WIDTH_MAX);
  const [spotifySize, setSpotifySize] = useState<"compact" | "normal">("normal");
  const [htmlCode, setHtmlCode] = useState("");

  const provider = useMemo(() => detectProvider(url), [url]);
  const trimmedUrl = url.trim();
  const trimmedHtml = htmlCode.trim();

  function handleInsert() {
    if (mode === "html") {
      if (!trimmedHtml) return;
      onInsert({
        provider: "customHtml",
        url: "",
        height: null,
        aspectRatio: null,
        hideCaption: false,
        width: null,
        rawHtml: trimmedHtml,
      });
      return;
    }

    if (!trimmedUrl) return;
    // 어떤 provider로도 인식되지 않으면(예: 지원하지 않는 사이트) 링크
    // 카드로라도 저장되도록 "raw"로 폴백 — embedSrc("raw", url)이 url을
    // 그대로 돌려주므로 iframe 시도조차 하지 못하는 사이트라면 결국
    // renderHTML의 링크 카드 분기(embedSrc가 null일 때)로 자연히 빠진다.
    const resolvedProvider = provider ?? "raw";
    onInsert({
      provider: resolvedProvider,
      url: trimmedUrl,
      height: resolvedProvider === "spotify" ? (spotifySize === "compact" ? 152 : 352) : null,
      aspectRatio: resolvedProvider === "youtube" ? aspectRatio : null,
      hideCaption: resolvedProvider === "instagram" ? hideCaption : false,
      width: resolvedProvider === "instagram" ? clampInstagramWidth(instagramWidth) : null,
      rawHtml: "",
    });
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-lg bg-white p-5 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="text-sm font-semibold text-gray-800 mb-3">임베드 삽입</h3>

        <div className="flex gap-1 mb-3 border border-gray-200 rounded p-0.5 w-fit">
          <button
            type="button"
            onClick={() => setMode("url")}
            className={`text-xs px-2.5 py-1 rounded ${mode === "url" ? "bg-gray-800 text-white" : "text-gray-600 hover:bg-gray-100"}`}
          >
            URL
          </button>
          <button
            type="button"
            onClick={() => setMode("html")}
            className={`text-xs px-2.5 py-1 rounded ${mode === "html" ? "bg-gray-800 text-white" : "text-gray-600 hover:bg-gray-100"}`}
          >
            HTML 코드
          </button>
        </div>

        {mode === "html" ? (
          <>
            <label className="block text-xs text-gray-500 mb-1">임베드 코드(HTML)</label>
            <textarea
              autoFocus
              value={htmlCode}
              onChange={(e) => setHtmlCode(e.target.value)}
              placeholder={'플랫폼에서 제공하는 "포함(Embed)" 코드를 그대로 붙여넣으세요 (예: <blockquote>...</blockquote>, <iframe>...)'}
              rows={6}
              className="w-full text-xs font-mono border border-gray-300 rounded px-2 py-1.5 mb-1"
            />
            <p className="text-xs text-gray-400 mb-3">
              URL 자동 인식이 안 되거나(지원 안 하는 사이트) 자동 생성 방식으론 부족할 때 사용하세요. 보안을 위해{" "}
              <code>&lt;script&gt;</code> 태그는 저장 시 제거돼요 — 스크립트 없이도 동작하는 코드(iframe 등)만
              온전히 재생됩니다.
            </p>
          </>
        ) : (
          <>
            <label className="block text-xs text-gray-500 mb-1">URL</label>
            <input
              autoFocus
              type="text"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="YouTube, Instagram, Spotify, X, 네이버 블로그, 지도 URL을 붙여넣으세요"
              className="w-full text-sm border border-gray-300 rounded px-2 py-1.5 mb-2"
            />
            <p className="text-xs text-gray-400 mb-3">
              {trimmedUrl === ""
                ? "URL을 입력하면 플랫폼을 자동으로 인식해요."
                : provider
                ? `감지된 플랫폼: ${PROVIDER_LABELS[provider]}`
                : "인식할 수 없는 URL이에요 — 링크 카드로 저장돼요."}
            </p>
          </>
        )}

        {mode === "url" && provider === "instagram" && (
          <>
            <label className="flex items-center gap-2 text-sm text-gray-700 mb-3">
              <input
                type="checkbox"
                checked={hideCaption}
                onChange={(e) => setHideCaption(e.target.checked)}
              />
              본문(캡션) 숨기기
            </label>
            <div className="mb-3">
              <label className="block text-xs text-gray-500 mb-1">
                너비 ({instagramWidth}px, {INSTAGRAM_WIDTH_MIN}~{INSTAGRAM_WIDTH_MAX} 범위만 Instagram 위젯이
                지원해요)
              </label>
              <input
                type="range"
                min={INSTAGRAM_WIDTH_MIN}
                max={INSTAGRAM_WIDTH_MAX}
                value={instagramWidth}
                onChange={(e) => setInstagramWidth(Number(e.target.value))}
                className="w-full"
              />
            </div>
          </>
        )}

        {provider === "youtube" && (
          <div className="mb-3">
            <label className="block text-xs text-gray-500 mb-1">화면 비율</label>
            <select
              value={aspectRatio}
              onChange={(e) => setAspectRatio(e.target.value as EmbedAspectRatio)}
              className="w-full text-sm border border-gray-300 rounded px-2 py-1.5"
            >
              <option value="16:9">16:9 가로형</option>
              <option value="9:16">9:16 쇼츠(세로형)</option>
            </select>
          </div>
        )}

        {provider === "spotify" && (
          <div className="mb-3">
            <label className="block text-xs text-gray-500 mb-1">사이즈</label>
            <select
              value={spotifySize}
              onChange={(e) => setSpotifySize(e.target.value as "compact" | "normal")}
              className="w-full text-sm border border-gray-300 rounded px-2 py-1.5"
            >
              <option value="normal">Normal</option>
              <option value="compact">Compact</option>
            </select>
          </div>
        )}

        <div className="flex justify-end gap-2 mt-4">
          <button
            type="button"
            onClick={onClose}
            className="text-sm px-3 py-1.5 rounded border border-gray-300 text-gray-600 hover:bg-gray-50"
          >
            취소
          </button>
          <button
            type="button"
            disabled={mode === "html" ? !trimmedHtml : !trimmedUrl}
            onClick={handleInsert}
            className="text-sm px-3 py-1.5 rounded bg-gray-800 text-white disabled:opacity-50"
          >
            삽입
          </button>
        </div>
      </div>
    </div>
  );
}
