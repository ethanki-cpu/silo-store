"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import { BlockEditor } from "@/components/editor/BlockEditor";
import { findFeaturedImage, findFirstImage, isEmptyDoc, type JSONContent } from "@/lib/blockEditorCore";
import { uploadPostImage } from "@/lib/storage";
import { useAuth } from "@/lib/AuthProvider";

// EPIC-092(요구사항 1): datetime-local input은 "YYYY-MM-DDTHH:mm" 형식을
// 쓴다 — ISO 문자열(Z/초/밀리초 포함)을 그대로 넣으면 인식하지 못해 빈
// 필드로 보이므로, 표시용/제출용 변환 헬퍼를 둔다.
function toDatetimeLocalValue(iso: string): string {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

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
  thumbnailVisible: boolean;
  category: string | null;
  tags: string[];
  isDocentPost: boolean;
  orderId?: string;
  /** EPIC-092(요구사항 1): 관리자만 채울 수 있는 등록 날짜/시간(ISO) — 값이
   * 있을 때만 서버가 posts.created_at을 덮어쓴다. */
  createdAt?: string;
  /** HOTFIX-099(사용자 지시): 관리자가 작성자를 다른 회원으로 바꿨을 때만
   * 채워진다 — 값이 있을 때만 서버가 posts.author_id를 덮어쓴다. */
  authorId?: string;
  /** EPIC-147-후속(사용자 지시 — "게시글이 쓰여진 날과는 독립적인,
   * 타임라인에 등장하는 연대를 설정할수 있도록 해줘"): Timeline NG
   * 게시판에서만 보이는 연대 필드 — 비어있으면 서버가 created_at으로
   * 폴백한다. */
  timelineYear?: number | null;
  timelineEndYear?: number | null;
  timelineDisplayDate?: string | null;
};

type MemberSearchResult = { id: string; name: string; email: string };

// HOTFIX-099: 관리자 전용 "작성자 변경" — 이름/이메일로 검색해 고르는
// 자동완성. 회원 검색은 기존 /admin/members 화면이 쓰는
// GET /api/admin/members?q=를 그대로 재사용한다(새 엔드포인트 없음).
function AdminAuthorPicker({
  accessToken,
  currentAuthorName,
  onSelect,
}: {
  accessToken: string | undefined;
  currentAuthorName: string;
  onSelect: (member: MemberSearchResult) => void;
}) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<MemberSearchResult[]>([]);
  const [selected, setSelected] = useState<MemberSearchResult | null>(null);
  const [searching, setSearching] = useState(false);

  useEffect(() => {
    if (!query.trim() || !accessToken) {
      setResults([]);
      return;
    }
    let cancelled = false;
    setSearching(true);
    const timer = setTimeout(() => {
      fetch(`/api/admin/members?q=${encodeURIComponent(query.trim())}`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      })
        .then((res) => (res.ok ? res.json() : []))
        .then((data) => {
          if (cancelled) return;
          setResults(Array.isArray(data) ? data.slice(0, 8) : []);
          setSearching(false);
        })
        .catch(() => {
          if (!cancelled) setSearching(false);
        });
    }, 250);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [query, accessToken]);

  return (
    <div>
      <label className="block text-sm mb-1">작성자 (관리자 전용)</label>
      <p className="text-xs text-gray-400 mb-1">
        현재: {currentAuthorName}
        {selected && selected.name !== currentAuthorName && ` → ${selected.name}(으)로 변경 예정`}
      </p>
      <div className="relative">
        <input
          type="text"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setSelected(null);
          }}
          placeholder="이름 또는 이메일로 검색"
          className="w-full rounded-md border border-gray-300 px-3 py-2"
        />
        {query.trim() && !selected && (
          <ul className="absolute z-10 mt-1 max-h-48 w-full overflow-y-auto rounded-md border border-gray-200 bg-white shadow-md">
            {searching && <li className="px-3 py-2 text-xs text-gray-400">검색 중...</li>}
            {!searching && results.length === 0 && (
              <li className="px-3 py-2 text-xs text-gray-400">일치하는 회원이 없어요.</li>
            )}
            {results.map((m) => (
              <li key={m.id}>
                <button
                  type="button"
                  className="block w-full px-3 py-2 text-left text-sm hover:bg-gray-50"
                  onClick={() => {
                    setSelected(m);
                    setQuery(m.name);
                    setResults([]);
                    onSelect(m);
                  }}
                >
                  {m.name} <span className="text-xs text-gray-400">{m.email}</span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

export function PostForm({
  mode,
  boardId,
  boardType,
  showTags,
  confirmedOrders,
  categories,
  existingTags = [],
  initialTitle = "",
  initialBodyJson = null,
  initialLegacyHtml,
  initialTags = [],
  initialIsDocentPost = false,
  initialOrderId = "",
  initialFeaturedImageUrl = null,
  initialFeaturedImagePath = null,
  initialThumbnailVisible = true,
  initialCategory = null,
  initialCreatedAt,
  initialAuthorName,
  showTimelineDateFields = false,
  initialTimelineYear = null,
  initialTimelineEndYear = null,
  initialTimelineDisplayDate = "",
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
  /** EPIC-079: 카테고리 드롭다운 선택지 — 없으면 드롭다운 자체를 숨긴다. */
  categories?: string[];
  /** EPIC-079: "기존 태그 선택" 칩으로 보여줄, 이 게시판에서 이미 쓰인 태그 목록. */
  existingTags?: string[];
  initialTitle?: string;
  initialBodyJson?: JSONContent | null;
  initialLegacyHtml?: string;
  initialTags?: string[];
  initialIsDocentPost?: boolean;
  initialOrderId?: string;
  initialFeaturedImageUrl?: string | null;
  initialFeaturedImagePath?: string | null;
  initialThumbnailVisible?: boolean;
  initialCategory?: string | null;
  /** EPIC-092(요구사항 1): 수정 화면에서 이 글의 현재 created_at(ISO)을
   * 넘기면 관리자 전용 "등록 날짜/시간" 필드가 그 값으로 초기화된다. 글쓰기
   * 화면(캘린더의 "+ 글 등록" 등)에서는 원하는 날짜만 넘겨도 된다. */
  initialCreatedAt?: string;
  /** HOTFIX-099(사용자 지시): 수정 화면에서 이 글의 현재 작성자 이름 —
   * 관리자 전용 "작성자 변경" 피커의 "현재:" 표시에 쓴다(edit 모드에서만
   * 넘어옴, create 모드는 작성자가 항상 글쓴이 본인이라 이 필드 자체가
   * 없다). */
  initialAuthorName?: string;
  /** EPIC-147-후속: 이 게시판이 Timeline NG(render_type==="timeline_ng")면
   * true — 연대 직접 지정 필드를 보여준다. */
  showTimelineDateFields?: boolean;
  initialTimelineYear?: number | null;
  initialTimelineEndYear?: number | null;
  initialTimelineDisplayDate?: string | null;
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
  const [thumbnailVisible, setThumbnailVisible] = useState(initialThumbnailVisible);
  const [category, setCategory] = useState<string>(initialCategory ?? "");
  const [uploadingFeatured, setUploadingFeatured] = useState(false);
  const [autoSavedAt, setAutoSavedAt] = useState<string | null>(null);
  const { member, session } = useAuth();
  // HOTFIX-099(사용자 지시): 관리자가 작성자를 바꾼 경우에만 채워진다 —
  // null이면 제출 시 authorId 필드 자체를 안 보내(기존 작성자 유지).
  const [newAuthorId, setNewAuthorId] = useState<string | null>(null);
  // EPIC-092(요구사항 1): 관리자 전용 "등록 날짜/시간" — initialCreatedAt이
  // ISO든 "YYYY-MM-DD"(캘린더 "+ 글 등록" pre-fill)든 datetime-local 형식
  // ("YYYY-MM-DDTHH:mm")으로 정규화해 보여준다.
  // EPIC-147-후속(사용자 지시): Timeline NG 연대 필드 — 숫자 입력은
  // 빈 문자열도 허용해야 해서(0과 미입력을 구분) string으로 들고 있다가
  // 제출 시 숫자로 변환한다.
  const [timelineYear, setTimelineYear] = useState(
    initialTimelineYear != null ? String(initialTimelineYear) : "",
  );
  const [timelineEndYear, setTimelineEndYear] = useState(
    initialTimelineEndYear != null ? String(initialTimelineEndYear) : "",
  );
  const [timelineDisplayDate, setTimelineDisplayDate] = useState(initialTimelineDisplayDate ?? "");
  const [createdAtLocal, setCreatedAtLocal] = useState(() =>
    initialCreatedAt
      ? initialCreatedAt.includes("T")
        ? toDatetimeLocalValue(initialCreatedAt)
        : `${initialCreatedAt}T00:00`
      : "",
  );

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

  const isBodyEmpty = isEmptyDoc(bodyJson);

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
      thumbnailVisible,
      category: category || null,
      tags: tagsInput
        .split(",")
        .map((t) => t.trim())
        .filter((t) => t.length > 0),
      isDocentPost,
      ...(boardType === "adoption_story" ? { orderId } : {}),
      ...(member?.is_admin && createdAtLocal ? { createdAt: new Date(createdAtLocal).toISOString() } : {}),
      ...(member?.is_admin && newAuthorId ? { authorId: newAuthorId } : {}),
      ...(showTimelineDateFields
        ? {
            timelineYear: timelineYear.trim() ? Number(timelineYear) : null,
            timelineEndYear: timelineEndYear.trim() ? Number(timelineEndYear) : null,
            timelineDisplayDate: timelineDisplayDate.trim() || null,
          }
        : {}),
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

      {showTimelineDateFields && (
        <div className="rounded-md border border-gray-200 p-3 space-y-3">
          <p className="text-sm font-medium text-gray-700">타임라인 연대</p>
          <p className="text-xs text-gray-400">
            이 글이 타임라인에서 표시될 시대예요 — 게시글을 실제로 작성한 날짜(등록 날짜/시간)와는 별개예요. 비워두면 등록 날짜를 그대로 써요.
          </p>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-gray-600 mb-1">시작 연도</label>
              <input
                type="number"
                value={timelineYear}
                onChange={(e) => setTimelineYear(e.target.value)}
                placeholder="예: 1750 (BC는 음수)"
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-600 mb-1">끝 연도 (범위일 때만)</label>
              <input
                type="number"
                value={timelineEndYear}
                onChange={(e) => setTimelineEndYear(e.target.value)}
                placeholder="예: 1850"
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
              />
            </div>
          </div>
          <div>
            <label className="block text-xs text-gray-600 mb-1">표시 텍스트 (선택)</label>
            <input
              type="text"
              value={timelineDisplayDate}
              onChange={(e) => setTimelineDisplayDate(e.target.value)}
              placeholder='예: "circa 1750" — 비워두면 연도를 그대로 보여줘요'
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
            />
          </div>
        </div>
      )}

      {member?.is_admin && (
        <div>
          <label className="block text-sm mb-1">등록 날짜/시간 (관리자 전용)</label>
          <input
            type="datetime-local"
            value={createdAtLocal}
            onChange={(e) => setCreatedAtLocal(e.target.value)}
            className="w-full rounded-md border border-gray-300 px-3 py-2"
          />
          <p className="text-xs text-gray-400 mt-1">
            비워두면 원래 등록 시각(수정 시) 또는 지금 시각(새 글)이 그대로 사용돼요.
          </p>
        </div>
      )}

      {mode === "edit" && member?.is_admin && (
        <AdminAuthorPicker
          accessToken={session?.access_token}
          currentAuthorName={initialAuthorName ?? "알 수 없음"}
          onSelect={(m) => setNewAuthorId(m.id)}
        />
      )}

      {categories && categories.length > 0 && (
        <div>
          <label className="block text-sm mb-1">카테고리</label>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="w-full rounded-md border border-gray-300 px-3 py-2"
          >
            <option value="">선택 안 함</option>
            {categories.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>
      )}

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
        {featuredImageUrl && (
          <label className="flex items-center gap-2 text-xs text-gray-600 mt-2">
            <input
              type="checkbox"
              checked={thumbnailVisible}
              onChange={(e) => setThumbnailVisible(e.target.checked)}
            />
            목록에서 이 대표 이미지를 썸네일로 보여주기
          </label>
        )}
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
          {existingTags.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-2">
              {existingTags.map((t) => {
                const current = tagsInput
                  .split(",")
                  .map((x) => x.trim())
                  .filter((x) => x.length > 0);
                const active = current.includes(t);
                return (
                  <button
                    key={t}
                    type="button"
                    onClick={() => {
                      const next = active ? current.filter((x) => x !== t) : [...current, t];
                      setTagsInput(next.join(", "));
                    }}
                    className={`text-xs px-2 py-0.5 rounded-full border ${
                      active
                        ? "bg-gray-800 text-white border-gray-800"
                        : "bg-white text-gray-500 border-gray-300 hover:border-gray-400"
                    }`}
                  >
                    #{t}
                  </button>
                );
              })}
            </div>
          )}
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

      {/* EPIC-079-PHASE-5: 폼이 길어(에디터+대표이미지+태그) 실패 메시지가
          스크롤 밖에 있으면 아무 일도 안 일어난 것처럼 보인다는 피드백 —
          스크롤 위치와 무관하게 항상 보이는 고정 위치 토스트로 강화. */}
      {error && (
        <div
          role="alert"
          className="fixed bottom-4 right-4 z-50 max-w-sm rounded-lg border border-red-300 bg-red-50 px-4 py-3 text-sm shadow-lg"
        >
          <p className="font-medium text-red-700">저장에 실패했어요</p>
          <p className="mt-1 text-red-600">{error}</p>
        </div>
      )}

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
