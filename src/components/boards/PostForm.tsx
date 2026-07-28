"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import { BlockEditor } from "@/components/editor/BlockEditor";
import { findFeaturedImage, findFirstImage, type JSONContent } from "@/lib/blockEditorCore";
import { uploadPostImage } from "@/lib/storage";

// EPIC-053.1: 글쓰기(write)와 수정(edit) 페이지가 공유하는 폼 —
// "새 Editor 생성 금지 / 중복 코드 생성 금지" 원칙에 따라 두 화면이
// 이 컴포넌트 하나만 재사용한다(BlockEditor, 대표 이미지, 자동저장,
// 태그/도슨트/구매확정 필드 전부 여기서 한 번만 구현).

export type ConfirmedOrder = { id: string; item_name: string; item_photo_url: string | null };

export type PostFormSubmitPayload = {
  title: string;
  bodyJson: JSONContent;
  bodyHtml: string;
  featuredImageUrl: string | null;
  featuredImagePath: string | null;
  tags: string[];
  isDocentPost: boolean;
  orderId?: string;
};

export function PostForm({
  mode,
  boardId,
  boardType,
  showTags,
  confirmedOrders,
  initialTitle = "",
  initialBodyJson = null,
  initialLegacyHtml,
  initialTags = [],
  initialIsDocentPost = false,
  initialOrderId = "",
  initialFeaturedImageUrl = null,
  initialFeaturedImagePath = null,
  draftStorageKey,
  submitLabel,
  onSubmit,
  submitting,
  error,
}: {
  mode: "create" | "edit";
  boardId: string;
  boardType: string | null;
  showTags: boolean;
  confirmedOrders?: ConfirmedOrder[];
  initialTitle?: string;
  initialBodyJson?: JSONContent | null;
  initialLegacyHtml?: string;
  initialTags?: string[];
  initialIsDocentPost?: boolean;
  initialOrderId?: string;
  initialFeaturedImageUrl?: string | null;
  initialFeaturedImagePath?: string | null;
  draftStorageKey: string;
  submitLabel: string;
  onSubmit: (payload: PostFormSubmitPayload) => Promise<void>;
  submitting: boolean;
  error: string | null;
}) {
  const [title, setTitle] = useState(initialTitle);
  const [bodyJson, setBodyJson] = useState<JSONContent | null>(initialBodyJson);
  const [bodyHtml, setBodyHtml] = useState(initialLegacyHtml ?? "");
  const [isDocentPost, setIsDocentPost] = useState(initialIsDocentPost);
  const [orderId, setOrderId] = useState(initialOrderId);
  const [tagsInput, setTagsInput] = useState(initialTags.join(", "));
  const [featuredImageUrl, setFeaturedImageUrl] = useState<string | null>(initialFeaturedImageUrl);
  const [featuredImagePath, setFeaturedImagePath] = useState<string | null>(initialFeaturedImagePath);
  const [uploadingFeatured, setUploadingFeatured] = useState(false);
  const [autoSavedAt, setAutoSavedAt] = useState<string | null>(null);

  // 대표 이미지를 명시적으로 지정한 적이 없으면, 에디터 안에서 ★(대표
  // 이미지) 표시가 바뀔 때마다 자동으로 따라간다 — 없으면 본문 첫 이미지로
  // 폴백(BoardRenderer 썸네일이 항상 뭔가는 보여줄 수 있도록).
  const handleEditorChange = useCallback((json: JSONContent, html: string) => {
    setBodyJson(json);
    setBodyHtml(html);
    const featured = findFeaturedImage(json);
    if (featured) {
      setFeaturedImageUrl(featured.url);
      setFeaturedImagePath(featured.path);
    } else if (!featuredImageUrl) {
      setFeaturedImageUrl(findFirstImage(json));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleAutoSave = useCallback(
    (json: JSONContent, html: string) => {
      const draft = { title, bodyJson: json, bodyHtml: html, boardId, savedAt: new Date().toISOString() };
      localStorage.setItem(draftStorageKey, JSON.stringify(draft));
      setAutoSavedAt(draft.savedAt);
    },
    [title, boardId, draftStorageKey],
  );

  useEffect(() => {
    if (mode !== "create") return; // 수정 화면은 서버에 이미 저장된 글을 불러오는 것이므로 임시복구 대상이 아님.
    const saved = localStorage.getItem(draftStorageKey);
    if (!saved) return;
    try {
      const draft = JSON.parse(saved);
      if (draft.boardId !== boardId) return;
      const savedDate = new Date(draft.savedAt);
      const hourAgo = Date.now() - 60 * 60 * 1000;
      if (savedDate.getTime() <= hourAgo) return;
      if (window.confirm(`${savedDate.toLocaleString()}에 임시 저장된 글이 있습니다. 복구하시겠습니까?`)) {
        /* eslint-disable react-hooks/set-state-in-effect */
        setTitle(draft.title || "");
        setBodyJson(draft.bodyJson ?? null);
        setBodyHtml(draft.bodyHtml ?? "");
        /* eslint-enable react-hooks/set-state-in-effect */
      } else {
        localStorage.removeItem(draftStorageKey);
      }
    } catch {
      // Invalid draft, ignore
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const isBodyEmpty = bodyHtml.replace(/<[^>]*>/g, "").trim().length === 0;

  async function handleFeaturedImageUpload(file: File) {
    setUploadingFeatured(true);
    const result = await uploadPostImage(file, "featured");
    setUploadingFeatured(false);
    if (result.error) return;
    setFeaturedImageUrl(result.url);
    setFeaturedImagePath(result.path);
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();

    if (isBodyEmpty || !bodyJson) return;

    if (boardType === "adoption_story" && mode === "create" && !orderId) return;

    await onSubmit({
      title,
      bodyJson,
      bodyHtml,
      featuredImageUrl,
      featuredImagePath,
      tags: tagsInput
        .split(",")
        .map((t) => t.trim())
        .filter((t) => t.length > 0),
      isDocentPost,
      ...(boardType === "adoption_story" ? { orderId } : {}),
    });

    if (mode === "create") localStorage.removeItem(draftStorageKey);
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {boardType === "adoption_story" && mode === "create" && (
        <div>
          <label className="block text-sm mb-1">어떤 물품을 구매하셨나요?</label>
          {!confirmedOrders || confirmedOrders.length === 0 ? (
            <p className="text-sm text-gray-500">
              구매 확정된 물품이 없어요. 물품을 구매하고 입금 확인이 완료된 후 다시 시도해주세요.
            </p>
          ) : (
            <select
              required
              value={orderId}
              onChange={(e) => setOrderId(e.target.value)}
              className="w-full rounded-md border border-gray-300 px-3 py-2"
            >
              <option value="">선택해주세요</option>
              {confirmedOrders.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.item_name}
                </option>
              ))}
            </select>
          )}
        </div>
      )}

      <div>
        <label className="block text-sm mb-1">제목</label>
        <input
          type="text"
          required
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="w-full rounded-md border border-gray-300 px-3 py-2"
        />
      </div>

      <div>
        <label className="block text-sm mb-1">내용</label>
        <BlockEditor
          value={initialBodyJson}
          legacyHtml={initialLegacyHtml}
          onChange={handleEditorChange}
          onAutoSave={handleAutoSave}
        />
      </div>

      <div>
        <label className="block text-sm mb-1">대표 이미지</label>
        <p className="text-xs text-gray-400 mb-2">
          본문에서 이미지에 마우스를 올려 ★를 누르면 자동으로 지정돼요. 직접 업로드할 수도 있어요.
        </p>
        <div className="flex items-center gap-3">
          {featuredImageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={featuredImageUrl} alt="대표 이미지" className="w-24 h-24 object-cover rounded-md border border-gray-200" />
          ) : (
            <div className="w-24 h-24 rounded-md border border-dashed border-gray-300 flex items-center justify-center text-xs text-gray-400">
              없음
            </div>
          )}
          <div className="flex flex-col gap-1">
            <label className="text-xs text-blue-600 hover:underline cursor-pointer">
              {uploadingFeatured ? "업로드 중..." : "이미지 업로드"}
              <input
                type="file"
                accept="image/*"
                className="hidden"
                disabled={uploadingFeatured}
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleFeaturedImageUpload(file);
                  e.target.value = "";
                }}
              />
            </label>
            {featuredImageUrl && (
              <button
                type="button"
                className="text-xs text-red-500 hover:underline text-left"
                onClick={() => {
                  setFeaturedImageUrl(null);
                  setFeaturedImagePath(null);
                }}
              >
                제거
              </button>
            )}
          </div>
        </div>
      </div>

      {showTags && (
        <div>
          <label className="block text-sm mb-1">태그 (쉼표로 구분, 선택)</label>
          <input
            type="text"
            value={tagsInput}
            onChange={(e) => setTagsInput(e.target.value)}
            placeholder="예: 여행, 후기, 사진"
            className="w-full rounded-md border border-gray-300 px-3 py-2"
          />
        </div>
      )}

      {boardType !== "adoption_story" && (
        <label className="flex items-center gap-2 text-sm text-gray-600">
          <input type="checkbox" checked={isDocentPost} onChange={(e) => setIsDocentPost(e.target.checked)} />
          도슨트 성격의 심층 글로 작성 (Great Gatsby 등급부터 가능)
        </label>
      )}

      {autoSavedAt && (
        <p className="text-xs text-gray-400">💾 {new Date(autoSavedAt).toLocaleString()}에 자동 저장됨</p>
      )}

      {error && <p className="text-sm text-red-600">{error}</p>}

      <button
        type="submit"
        disabled={submitting}
        className="rounded-md bg-gray-800 text-white px-4 py-2 disabled:opacity-50"
      >
        {submitting ? "처리 중..." : submitLabel}
      </button>
    </form>
  );
}
