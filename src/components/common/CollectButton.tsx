"use client";

import { useState } from "react";
import Link from "next/link";
import { useAuth } from "@/lib/AuthProvider";

// EPIC-095(요구사항 1.2): Frictionless Archiving — "내 컬렉션에 담기" 원클릭
// 버튼. ScrapButton.tsx(post_bookmarks, 글 전체를 켜고/끄는 토글)과는 다른
// 개념 — member_collections(마이페이지 "나의 컬렉션", book/movie/music/
// artist/place/scent/brand/era 8종 스크랩북)에 새 항목 하나를 insert한다.
// 8개 카테고리 중 무엇으로 담을지는 호출부(게시글 상세/도슨트 뷰어)가
// "이 콘텐츠의 성격"을 근거로 추정해 suggestedCategory로 넘겨주지만, 임의
// 게시글은 실제로 딱 맞는 카테고리가 없을 수 있어(도슨트처럼 era가 DB에
// 명시된 경우와 다름) 최종 선택은 클릭 한 번으로 여는 작은 팝오버에서
// 사용자가 확정한다 — 추천값이 미리 강조돼 있어 대부분은 그대로 한 번 더
// 클릭하면 끝난다("자동 매핑 + 원클릭 확정").
const CATEGORY_LABELS: { key: string; label: string }[] = [
  { key: "book", label: "책" },
  { key: "movie", label: "영화" },
  { key: "music", label: "음악" },
  { key: "artist", label: "예술가" },
  { key: "place", label: "장소" },
  { key: "scent", label: "향기" },
  { key: "brand", label: "브랜드" },
  { key: "era", label: "시대" },
];

export function CollectButton({
  title,
  description,
  imageUrl,
  suggestedCategory,
  size = "md",
}: {
  title: string;
  description?: string | null;
  imageUrl?: string | null;
  suggestedCategory: string;
  /** "md" = 텍스트+아이콘, "sm" = 아이콘 전용(플로팅 액션 바 등 좁은 자리). */
  size?: "md" | "sm";
}) {
  const { session, loading: authLoading } = useAuth();
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [saved, setSaved] = useState(false);
  const [showLoginPrompt, setShowLoginPrompt] = useState(false);

  function handleToggle(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (authLoading) return;
    if (!session) {
      setShowLoginPrompt(true);
      return;
    }
    setOpen((prev) => !prev);
  }

  async function handlePick(category: string) {
    setSubmitting(true);
    try {
      const res = await fetch("/api/collections", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session!.access_token}`,
        },
        body: JSON.stringify({ category, title, description, imageUrl }),
      });
      if (res.ok) {
        setSaved(true);
        setOpen(false);
        setTimeout(() => setSaved(false), 2000);
      }
    } finally {
      setSubmitting(false);
    }
  }

  const buttonClass =
    size === "sm"
      ? `flex items-center justify-center w-8 h-8 rounded-full border text-sm ${
          saved ? "bg-emerald-50 border-emerald-300 text-emerald-600" : "bg-white/90 border-gray-200 text-gray-600"
        }`
      : `rounded-md px-4 py-2 text-sm border ${
          saved ? "bg-emerald-50 border-emerald-300 text-emerald-600" : "bg-white border-gray-300 text-gray-700"
        }`;

  return (
    <div className="relative inline-block">
      <button
        type="button"
        onClick={handleToggle}
        aria-label="내 컬렉션에 담기"
        className={buttonClass}
      >
        {saved ? "✓" : "🗃"}
        {size === "md" && <span className="ml-1">{saved ? "담았어요" : "내 컬렉션에 담기"}</span>}
      </button>

      {open && (
        <div
          className="absolute bottom-full left-0 z-30 mb-2 w-48 rounded-lg border border-gray-200 bg-white p-2 shadow-lg"
          onClick={(e) => e.stopPropagation()}
        >
          <p className="px-1 pb-1 text-xs text-gray-400">어디에 담을까요?</p>
          <div className="grid grid-cols-2 gap-1">
            {CATEGORY_LABELS.map((c) => (
              <button
                key={c.key}
                type="button"
                disabled={submitting}
                onClick={() => handlePick(c.key)}
                className={`rounded px-2 py-1.5 text-left text-xs ${
                  c.key === suggestedCategory
                    ? "bg-gray-900 text-white"
                    : "bg-gray-50 text-gray-600 hover:bg-gray-100"
                }`}
              >
                {c.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {showLoginPrompt && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowLoginPrompt(false);
          }}
        >
          <div className="w-full max-w-sm rounded-lg bg-white p-6 text-center shadow-lg">
            <p className="mb-4 text-sm text-gray-700">
              내 컬렉션에 담으려면 로그인이 필요해요.
            </p>
            <div className="flex justify-center gap-2">
              <Link
                href="/login"
                className="rounded-md bg-gray-900 px-4 py-2 text-sm text-white hover:bg-gray-800"
              >
                로그인하기
              </Link>
              <button
                type="button"
                onClick={() => setShowLoginPrompt(false)}
                className="rounded-md border border-gray-300 px-4 py-2 text-sm text-gray-600 hover:bg-gray-50"
              >
                닫기
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
