"use client";

import { useMemo, useState } from "react";
import {
  detectProvider,
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
};

export type EmbedInsertResult = {
  provider: EmbedProvider;
  url: string;
  height: number | null;
  aspectRatio: EmbedAspectRatio | null;
  hideCaption: boolean;
};

export function EmbedConfigModal({
  onInsert,
  onClose,
}: {
  onInsert: (result: EmbedInsertResult) => void;
  onClose: () => void;
}) {
  const [url, setUrl] = useState("");
  const [aspectRatio, setAspectRatio] = useState<EmbedAspectRatio>("16:9");
  const [hideCaption, setHideCaption] = useState(false);
  const [spotifySize, setSpotifySize] = useState<"compact" | "normal">("normal");

  const provider = useMemo(() => detectProvider(url), [url]);
  const trimmedUrl = url.trim();

  function handleInsert() {
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

        {provider === "instagram" && (
          <label className="flex items-center gap-2 text-sm text-gray-700 mb-3">
            <input
              type="checkbox"
              checked={hideCaption}
              onChange={(e) => setHideCaption(e.target.checked)}
            />
            본문(캡션) 숨기기
          </label>
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
            disabled={!trimmedUrl}
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
