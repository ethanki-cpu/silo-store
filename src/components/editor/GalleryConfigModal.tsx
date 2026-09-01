"use client";

import { useRef, useState } from "react";
import { detectMediaType, type GalleryImageAttrs } from "@/lib/blockEditorCore";
import { uploadMultipleFilesToR2 } from "@/lib/r2Upload";

// EPIC-079-PHASE-5: "갤러리 삽입" 버튼을 눌렀을 때(또는 이미 삽입된 갤러리를
// 편집할 때) 쓰는 모달 — 여러 개의 외부 URL(이미지/영상)을 한 번에
// 입력하거나 파일을 직접 업로드해 순서를 바꿀 수 있게 한다. 새로 삽입하든
// 기존 갤러리를 편집하든 "최종 아이템 목록"을 그대로 반환하는 동일한
// 컴포넌트를 재사용한다(GalleryView의 "+ URL 추가"도 같은 모달을 연다).
export function GalleryConfigModal({
  initialItems = [],
  onInsert,
  onClose,
}: {
  initialItems?: GalleryImageAttrs[];
  onInsert: (items: GalleryImageAttrs[]) => void;
  onClose: () => void;
}) {
  const [items, setItems] = useState<GalleryImageAttrs[]>(initialItems);
  const [urlsText, setUrlsText] = useState("");
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  function addUrls() {
    const urls = urlsText
      .split("\n")
      .map((u) => u.trim())
      .filter((u) => u.length > 0);
    if (urls.length === 0) return;
    const added: GalleryImageAttrs[] = urls.map((url) => ({
      src: url,
      path: null,
      alt: "",
      caption: "",
      type: detectMediaType(url),
    }));
    setItems((prev) => [...prev, ...added]);
    setUrlsText("");
  }

  async function handleFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    setUploading(true);
    try {
      const uploaded = await uploadMultipleFilesToR2(Array.from(files));
      const added: GalleryImageAttrs[] = uploaded
        .filter((r): r is typeof r & { url: string } => !r.error && !!r.url)
        .map((r) => ({ src: r.url, path: r.path, alt: "", caption: "", type: "image" }));
      setItems((prev) => [...prev, ...added]);
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  function removeAt(i: number) {
    setItems((prev) => prev.filter((_, idx) => idx !== i));
  }

  function moveAt(i: number, dir: -1 | 1) {
    const j = i + dir;
    if (j < 0 || j >= items.length) return;
    setItems((prev) => {
      const next = [...prev];
      [next[i], next[j]] = [next[j], next[i]];
      return next;
    });
  }

  function toggleType(i: number) {
    setItems((prev) => {
      const next = [...prev];
      next[i] = { ...next[i], type: next[i].type === "video" ? "image" : "video" };
      return next;
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div
        className="w-full max-w-lg rounded-lg bg-white p-5 shadow-xl max-h-[85vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="text-sm font-semibold text-gray-800 mb-1">갤러리 삽입</h3>
        <p className="text-xs text-gray-400 mb-3">
          외부에 업로드해둔 이미지/영상(mp4) URL을 한 줄에 하나씩 붙여넣거나, 파일을 직접 업로드하세요. 인스타그램처럼
          좌우로 스와이프되는 슬라이더로 표시돼요.
        </p>

        <label className="block text-xs text-gray-500 mb-1">URL 추가 (한 줄에 하나씩)</label>
        <textarea
          value={urlsText}
          onChange={(e) => setUrlsText(e.target.value)}
          placeholder={"https://i.imgur.com/example.jpg\nhttps://i.imgur.com/example.mp4"}
          rows={3}
          className="w-full text-xs font-mono border border-gray-300 rounded px-2 py-1.5 mb-2"
        />
        <div className="flex items-center gap-2 mb-4">
          <button
            type="button"
            onClick={addUrls}
            disabled={!urlsText.trim()}
            className="text-xs px-2.5 py-1 rounded bg-gray-800 text-white disabled:opacity-40"
          >
            URL 추가
          </button>
          <span className="text-xs text-gray-300">또는</span>
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="text-xs px-2.5 py-1 rounded border border-gray-300 text-gray-600 hover:bg-gray-50 disabled:opacity-40"
          >
            {uploading ? "업로드 중..." : "파일 업로드"}
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*,video/*"
            multiple
            className="hidden"
            onChange={(e) => handleFiles(e.target.files)}
          />
        </div>

        {items.length > 0 && (
          <ul className="space-y-1.5 mb-4">
            {items.map((item, i) => (
              <li
                key={`${item.src}-${i}`}
                className="flex items-center gap-2 border border-gray-200 rounded px-2 py-1.5"
              >
                <div className="w-10 h-10 shrink-0 rounded overflow-hidden bg-gray-100 flex items-center justify-center">
                  {item.type === "video" ? (
                    <span className="text-[10px] text-gray-400">VIDEO</span>
                  ) : (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={item.src} alt="" className="w-full h-full object-cover" />
                  )}
                </div>
                <span className="flex-1 text-xs text-gray-600 truncate" title={item.src}>
                  {item.src}
                </span>
                <button
                  type="button"
                  onClick={() => toggleType(i)}
                  className="text-[10px] px-1.5 py-0.5 rounded border border-gray-200 text-gray-500 hover:bg-gray-50 shrink-0"
                  title="이미지/영상 전환"
                >
                  {item.type === "video" ? "영상" : "이미지"}
                </button>
                <button type="button" className="text-xs text-gray-400 hover:text-gray-700 shrink-0" onClick={() => moveAt(i, -1)}>
                  ↑
                </button>
                <button type="button" className="text-xs text-gray-400 hover:text-gray-700 shrink-0" onClick={() => moveAt(i, 1)}>
                  ↓
                </button>
                <button type="button" className="text-xs text-red-500 hover:underline shrink-0" onClick={() => removeAt(i)}>
                  삭제
                </button>
              </li>
            ))}
          </ul>
        )}

        <div className="flex justify-end gap-2">
          <button type="button" onClick={onClose} className="text-sm px-3 py-1.5 rounded border border-gray-300 text-gray-600 hover:bg-gray-50">
            취소
          </button>
          <button
            type="button"
            disabled={items.length === 0}
            onClick={() => onInsert(items)}
            className="text-sm px-3 py-1.5 rounded bg-gray-800 text-white disabled:opacity-50"
          >
            삽입 ({items.length})
          </button>
        </div>
      </div>
    </div>
  );
}
