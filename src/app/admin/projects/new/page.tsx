"use client";

import { useState, type FormEvent } from "react";
import { useAuth } from "@/lib/AuthProvider";
import { supabase } from "@/lib/supabaseClient";

const INDUSTRY_OPTIONS: { value: string; label: string }[] = [
  { value: "photo_studio", label: "사진스튜디오" },
  { value: "perfume_shop", label: "퍼스널 컬러 샵/향수 소품샵" },
  { value: "doll_shop", label: "봉제인형샵" },
  { value: "pizza_shop", label: "화덕 피자식당" },
  { value: "other", label: "기타" },
];

type MediaRow = { mediaType: "photo" | "video"; mediaUrl: string; caption: string };

type ItemResult = { id: string; name: string; photo_url: string | null };

export default function NewStylingProjectPage() {
  // is_admin 인증 가드는 src/app/admin/layout.tsx(EPIC-024)가 공통으로 처리한다.
  const { session } = useAuth();

  const [clientName, setClientName] = useState("");
  const [industry, setIndustry] = useState("photo_studio");
  const [industryOtherLabel, setIndustryOtherLabel] = useState("");
  const [concept, setConcept] = useState("");
  const [location, setLocation] = useState("");
  const [projectDate, setProjectDate] = useState("");

  const [mediaRows, setMediaRows] = useState<MediaRow[]>([]);

  const [itemQuery, setItemQuery] = useState("");
  const [itemResults, setItemResults] = useState<ItemResult[]>([]);
  const [selectedItems, setSelectedItems] = useState<ItemResult[]>([]);
  const [searching, setSearching] = useState(false);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function addMediaRow(mediaType: "photo" | "video") {
    setMediaRows([...mediaRows, { mediaType, mediaUrl: "", caption: "" }]);
  }

  function updateMediaRow(index: number, patch: Partial<MediaRow>) {
    setMediaRows(
      mediaRows.map((row, i) => (i === index ? { ...row, ...patch } : row)),
    );
  }

  function removeMediaRow(index: number) {
    setMediaRows(mediaRows.filter((_, i) => i !== index));
  }

  async function handleItemSearch() {
    if (!itemQuery.trim()) {
      setItemResults([]);
      return;
    }
    setSearching(true);
    const { data } = await supabase
      .from("items")
      .select("id, name, photo_url")
      .ilike("name", `%${itemQuery.trim()}%`)
      .limit(10);
    setItemResults(data ?? []);
    setSearching(false);
  }

  function addItem(item: ItemResult) {
    if (selectedItems.some((i) => i.id === item.id)) return;
    setSelectedItems([...selectedItems, item]);
  }

  function removeItem(id: string) {
    setSelectedItems(selectedItems.filter((i) => i.id !== id));
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    if (!clientName || !concept) {
      setError("client_name, concept은 필수예요.");
      return;
    }

    if (industry === "other" && !industryOtherLabel) {
      setError("업종이 기타일 때는 업종명을 입력해주세요.");
      return;
    }

    setSubmitting(true);

    const res = await fetch("/api/styling-projects", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session!.access_token}`,
      },
      body: JSON.stringify({
        clientName,
        industry,
        industryOtherLabel: industry === "other" ? industryOtherLabel : undefined,
        concept,
        location,
        projectDate: projectDate || undefined,
        media: mediaRows.filter((m) => m.mediaUrl.trim()),
        itemIds: selectedItems.map((i) => i.id),
      }),
    });

    const data = await res.json();
    setSubmitting(false);

    if (!res.ok) {
      setError(data.error ?? "등록에 실패했어요.");
      return;
    }

    window.alert("포트폴리오가 등록됐어요.");

    setClientName("");
    setIndustry("photo_studio");
    setIndustryOtherLabel("");
    setConcept("");
    setLocation("");
    setProjectDate("");
    setMediaRows([]);
    setItemQuery("");
    setItemResults([]);
    setSelectedItems([]);
  }

  return (
    <main className="flex-1 p-8 max-w-2xl mx-auto w-full">
      <h1 className="text-2xl font-bold mb-6">공간 스타일링 프로젝트 등록</h1>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label className="block text-sm mb-1">클라이언트명</label>
          <input
            type="text"
            required
            value={clientName}
            onChange={(e) => setClientName(e.target.value)}
            className="w-full rounded-md border border-gray-300 px-3 py-2"
          />
        </div>

        <div>
          <label className="block text-sm mb-1">업종</label>
          <select
            value={industry}
            onChange={(e) => setIndustry(e.target.value)}
            className="w-full rounded-md border border-gray-300 px-3 py-2"
          >
            {INDUSTRY_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
          {industry === "other" && (
            <input
              type="text"
              required
              placeholder="업종명을 입력해주세요"
              value={industryOtherLabel}
              onChange={(e) => setIndustryOtherLabel(e.target.value)}
              className="w-full rounded-md border border-gray-300 px-3 py-2 mt-2"
            />
          )}
        </div>

        <div>
          <label className="block text-sm mb-1">컨셉</label>
          <textarea
            required
            rows={4}
            value={concept}
            onChange={(e) => setConcept(e.target.value)}
            className="w-full rounded-md border border-gray-300 px-3 py-2"
          />
        </div>

        <div>
          <label className="block text-sm mb-1">장소 (선택)</label>
          <input
            type="text"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            className="w-full rounded-md border border-gray-300 px-3 py-2"
          />
        </div>

        <div>
          <label className="block text-sm mb-1">진행 일자 (선택)</label>
          <input
            type="date"
            value={projectDate}
            onChange={(e) => setProjectDate(e.target.value)}
            className="w-full rounded-md border border-gray-300 px-3 py-2"
          />
        </div>

        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="block text-sm">사진 / 영상</label>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => addMediaRow("photo")}
                className="text-xs rounded-md border border-gray-300 px-2 py-1 hover:bg-gray-50"
              >
                + 사진 추가
              </button>
              <button
                type="button"
                onClick={() => addMediaRow("video")}
                className="text-xs rounded-md border border-gray-300 px-2 py-1 hover:bg-gray-50"
              >
                + 영상 추가
              </button>
            </div>
          </div>

          {mediaRows.length === 0 ? (
            <p className="text-xs text-gray-400">
              아직 추가된 사진/영상이 없어요.
            </p>
          ) : (
            <div className="space-y-2">
              {mediaRows.map((row, idx) => (
                <div
                  key={idx}
                  className="rounded-md border border-gray-200 p-3 space-y-2"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-gray-500">
                      {row.mediaType === "photo" ? "사진" : "영상"} #{idx + 1}
                    </span>
                    <button
                      type="button"
                      onClick={() => removeMediaRow(idx)}
                      className="text-xs text-red-600 hover:underline"
                    >
                      삭제
                    </button>
                  </div>
                  <input
                    type="text"
                    placeholder={
                      row.mediaType === "photo" ? "사진 URL" : "영상 URL"
                    }
                    value={row.mediaUrl}
                    onChange={(e) =>
                      updateMediaRow(idx, { mediaUrl: e.target.value })
                    }
                    className="w-full rounded-md border border-gray-300 px-3 py-1.5 text-sm"
                  />
                  <input
                    type="text"
                    placeholder="캡션 (선택)"
                    value={row.caption}
                    onChange={(e) =>
                      updateMediaRow(idx, { caption: e.target.value })
                    }
                    className="w-full rounded-md border border-gray-300 px-3 py-1.5 text-sm"
                  />
                </div>
              ))}
            </div>
          )}
        </div>

        <div>
          <label className="block text-sm mb-1">사용 물품 검색</label>
          <div className="flex gap-2 mb-2">
            <input
              type="text"
              placeholder="물품 이름으로 검색"
              value={itemQuery}
              onChange={(e) => setItemQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  handleItemSearch();
                }
              }}
              className="flex-1 rounded-md border border-gray-300 px-3 py-2 text-sm"
            />
            <button
              type="button"
              onClick={handleItemSearch}
              disabled={searching}
              className="rounded-md bg-gray-800 text-white px-3 py-2 text-sm disabled:opacity-50"
            >
              {searching ? "검색 중..." : "검색"}
            </button>
          </div>

          {itemResults.length > 0 && (
            <div className="rounded-md border border-gray-200 divide-y mb-3">
              {itemResults.map((item) => (
                <button
                  type="button"
                  key={item.id}
                  onClick={() => addItem(item)}
                  className="w-full flex items-center gap-2 p-2 text-left text-sm hover:bg-gray-50"
                >
                  {item.photo_url && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={item.photo_url}
                      alt=""
                      className="w-8 h-8 rounded object-cover"
                    />
                  )}
                  <span>{item.name}</span>
                  <span className="ml-auto text-xs text-blue-600">
                    + 연결
                  </span>
                </button>
              ))}
            </div>
          )}

          {selectedItems.length > 0 && (
            <div>
              <p className="text-xs text-gray-500 mb-1">연결된 물품</p>
              <div className="flex flex-wrap gap-2">
                {selectedItems.map((item) => (
                  <span
                    key={item.id}
                    className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-3 py-1 text-xs"
                  >
                    {item.name}
                    <button
                      type="button"
                      onClick={() => removeItem(item.id)}
                      className="text-gray-400 hover:text-red-600"
                    >
                      ✕
                    </button>
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <button
          type="submit"
          disabled={submitting}
          className="rounded-md bg-gray-800 text-white px-4 py-2 disabled:opacity-50"
        >
          {submitting ? "등록 중..." : "등록"}
        </button>
      </form>
    </main>
  );
}
