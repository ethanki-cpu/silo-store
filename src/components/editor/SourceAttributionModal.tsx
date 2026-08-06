"use client";

import { useState } from "react";
import type { SourceAttributionAttrs } from "@/lib/blockEditorCore";

// EPIC-083: 툴바 "출처 입력" 버튼이 여는 모달 — 원문 URL(필수)과 출처명
// (선택, 비우면 URL 그대로 표시)을 입력받는다. GalleryConfigModal/
// EmbedConfigModal과 동일한 오버레이 스타일을 재사용한다.
export function SourceAttributionModal({
  initial,
  onInsert,
  onClose,
}: {
  initial?: SourceAttributionAttrs;
  onInsert: (attrs: SourceAttributionAttrs) => void;
  onClose: () => void;
}) {
  const [url, setUrl] = useState(initial?.url ?? "");
  const [sourceName, setSourceName] = useState(initial?.sourceName ?? "");

  function handleInsert() {
    if (!url.trim()) return;
    onInsert({ url: url.trim(), sourceName: sourceName.trim() });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div
        className="w-full max-w-md rounded-lg bg-white p-5 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="text-sm font-semibold text-gray-800 mb-1">출처 입력</h3>
        <p className="text-xs text-gray-400 mb-3">
          퍼온 글의 원문 URL을 입력하면 본문에 출처 카드가 삽입돼요.
        </p>

        <label className="block text-xs text-gray-500 mb-1">원문 URL</label>
        <input
          type="text"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="https://..."
          className="w-full text-sm border border-gray-300 rounded px-2 py-1.5 mb-3"
          autoFocus
        />

        <label className="block text-xs text-gray-500 mb-1">출처명 (선택 — 비우면 URL로 표시)</label>
        <input
          type="text"
          value={sourceName}
          onChange={(e) => setSourceName(e.target.value)}
          placeholder="예: OO 블로그"
          className="w-full text-sm border border-gray-300 rounded px-2 py-1.5 mb-4"
        />

        <div className="flex justify-end gap-2">
          <button type="button" onClick={onClose} className="text-xs px-3 py-1.5 rounded text-gray-500 hover:bg-gray-100">
            취소
          </button>
          <button
            type="button"
            onClick={handleInsert}
            disabled={!url.trim()}
            className="text-xs px-3 py-1.5 rounded bg-gray-800 text-white disabled:opacity-40"
          >
            삽입
          </button>
        </div>
      </div>
    </div>
  );
}
