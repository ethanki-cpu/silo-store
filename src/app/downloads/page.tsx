"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useAuth } from "@/lib/AuthProvider";
import { PageEditButton } from "@/components/admin/PageEditButton";

type DownloadItem = {
  id: string;
  title: string;
  description: string | null;
  file_url: string;
  created_at: string;
};

export default function DownloadsPage() {
  const { session, member } = useAuth();
  const [items, setItems] = useState<DownloadItem[]>([]);
  const [fetching, setFetching] = useState(true);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [fileUrl, setFileUrl] = useState("");
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  async function load() {
    setFetching(true);
    const res = await fetch("/api/downloads", { cache: "no-store" });
    const data = await res.json();
    setItems(Array.isArray(data) ? data : []);
    setFetching(false);
  }

  useEffect(() => {
    load();
  }, []);

  async function handleUpload(e: FormEvent) {
    e.preventDefault();
    setUploadError(null);
    setUploading(true);

    const res = await fetch("/api/downloads", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(session
          ? { Authorization: `Bearer ${session.access_token}` }
          : {}),
      },
      body: JSON.stringify({ title, description, fileUrl }),
    });

    const data = await res.json();
    setUploading(false);

    if (!res.ok) {
      setUploadError(data.error);
      return;
    }

    setTitle("");
    setDescription("");
    setFileUrl("");
    load();
  }

  return (
    <>
      <PageEditButton slug="downloads" />
      <main className="flex-1 p-8 max-w-2xl mx-auto w-full">
      <h1 className="text-2xl font-bold mb-6">자료실</h1>

      {member?.is_admin && (
        <form
          onSubmit={handleUpload}
          className="rounded-lg border border-gray-200 p-4 mb-8 space-y-3"
        >
          <h2 className="font-semibold text-sm text-gray-600">
            새 자료 업로드 (관리자)
          </h2>
          <input
            type="text"
            required
            placeholder="제목"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full rounded-md border border-gray-300 px-3 py-2"
          />
          <input
            type="text"
            placeholder="설명 (선택)"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full rounded-md border border-gray-300 px-3 py-2"
          />
          <input
            type="text"
            required
            placeholder="파일 URL"
            value={fileUrl}
            onChange={(e) => setFileUrl(e.target.value)}
            className="w-full rounded-md border border-gray-300 px-3 py-2"
          />
          {uploadError && (
            <p className="text-sm text-red-600">{uploadError}</p>
          )}
          <button
            type="submit"
            disabled={uploading}
            className="rounded-md bg-gray-800 text-white px-4 py-2 text-sm disabled:opacity-50"
          >
            {uploading ? "업로드 중..." : "업로드"}
          </button>
        </form>
      )}

      {fetching ? (
        <p className="text-gray-500">불러오는 중...</p>
      ) : items.length === 0 ? (
        <p className="text-gray-500">등록된 자료가 없어요.</p>
      ) : (
        <div className="space-y-3">
          {items.map((item) => (
            <div
              key={item.id}
              className="rounded-lg border border-gray-200 p-4 flex items-center justify-between gap-4"
            >
              <div>
                <p className="font-medium">{item.title}</p>
                {item.description && (
                  <p className="text-sm text-gray-500 mt-0.5">
                    {item.description}
                  </p>
                )}
                <p className="text-xs text-gray-400 mt-1">
                  {new Date(item.created_at).toLocaleDateString()}
                </p>
              </div>
              <a
                href={item.file_url}
                target="_blank"
                rel="noopener noreferrer"
                className="shrink-0 rounded-md bg-gray-800 text-white px-3 py-1.5 text-sm"
              >
                다운로드
              </a>
            </div>
          ))}
        </div>
      )}
      </main>
    </>
  );
}
