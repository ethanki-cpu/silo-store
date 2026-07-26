"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { COLLECTION_SUBTABS, type CollectionSubKey } from "./mypageConfig";

export type CollectionCategory = Exclude<CollectionSubKey, "treasure">;

export type CollectionModalItem = {
  id: string;
  title: string;
  description: string | null;
  image_url: string | null;
};

export function CollectionModal({
  memberId,
  category,
  item,
  onClose,
  onSaved,
}: {
  memberId: string;
  category: CollectionCategory;
  item: CollectionModalItem | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [title, setTitle] = useState(item?.title ?? "");
  const [description, setDescription] = useState(item?.description ?? "");
  const [imageUrl, setImageUrl] = useState(item?.image_url ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isEdit = item !== null;
  const categoryLabel =
    COLLECTION_SUBTABS.find((s) => s.key === category)?.label ?? category;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) {
      setError("제목을 입력해주세요.");
      return;
    }

    setSaving(true);
    setError(null);

    const payload = {
      title: title.trim(),
      description: description.trim() || null,
      image_url: imageUrl.trim() || null,
    };

    const { error: dbError } = isEdit
      ? await supabase
          .from("member_collections")
          .update(payload)
          .eq("id", item.id)
          .eq("member_id", memberId)
      : await supabase.from("member_collections").insert({
          ...payload,
          member_id: memberId,
          category,
        });

    setSaving(false);

    if (dbError) {
      setError("저장에 실패했어요. 다시 시도해주세요.");
      return;
    }

    onSaved();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-sm rounded-lg bg-white p-6">
        <h2 className="text-lg font-medium mb-4">
          {isEdit ? `${categoryLabel} 수정` : `${categoryLabel} 추가`}
        </h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm mb-1">제목</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full rounded-md border border-gray-300 px-3 py-2"
              required
            />
          </div>

          <div>
            <label className="block text-sm mb-1">설명 (선택)</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full rounded-md border border-gray-300 px-3 py-2"
              rows={3}
            />
          </div>

          <div>
            <label className="block text-sm mb-1">이미지 URL (선택)</label>
            <input
              type="text"
              value={imageUrl}
              onChange={(e) => setImageUrl(e.target.value)}
              className="w-full rounded-md border border-gray-300 px-3 py-2"
              placeholder="https://..."
            />
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <div className="flex gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-md border border-gray-300 bg-white text-gray-800 px-3 py-2 hover:bg-gray-50"
            >
              취소
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex-1 rounded-md bg-gray-800 text-white px-3 py-2 disabled:opacity-50"
            >
              {saving ? "저장 중..." : "저장"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
