"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/lib/AuthProvider";

// EPIC-085: Frictionless Archiving — 원클릭 스크랩 버튼. 게시글 상세
// 상/하단, 갤러리 위젯 카드 등 어디에나 postId만 넘기면 꽂을 수 있는
// 자기완결형(self-contained) 컴포넌트 — 초기 스크랩 여부 조회, 낙관적
// (Optimistic) UI 토글, 비로그인 시 로그인 유도 모달까지 스스로 처리한다.
// 기존 PostActions.tsx의 "북마크" 버튼(post_bookmarks 테이블, 라이브 DB에
// 한 번도 마이그레이션되지 않아 항상 실패하던 죽은 기능)을 대체한다.
export function ScrapButton({
  postId,
  size = "md",
}: {
  postId: string;
  /** "md" = 게시글 상세용 텍스트+아이콘 버튼, "sm" = 갤러리 카드 코너용 아이콘 전용 버튼. */
  size?: "md" | "sm";
}) {
  const { session, loading: authLoading } = useAuth();
  const [scraped, setScraped] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [showLoginPrompt, setShowLoginPrompt] = useState(false);

  useEffect(() => {
    if (authLoading) return;
    if (!session) {
      setScraped(false);
      return;
    }
    let cancelled = false;
    fetch(`/api/scraps/${postId}`, {
      headers: { Authorization: `Bearer ${session.access_token}` },
    })
      .then((res) => res.json())
      .then((data) => {
        if (!cancelled) setScraped(Boolean(data.scraped));
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [postId, session, authLoading]);

  async function handleClick(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (!session) {
      setShowLoginPrompt(true);
      return;
    }

    // Optimistic UI — 서버 응답을 기다리지 않고 즉시 반영, 실패하면 되돌린다.
    const next = !scraped;
    setScraped(next);
    setSubmitting(true);
    try {
      const res = await fetch(`/api/scraps/${postId}`, {
        method: "POST",
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      if (!res.ok) {
        setScraped(!next);
      }
    } catch {
      setScraped(!next);
    } finally {
      setSubmitting(false);
    }
  }

  const buttonClass =
    size === "sm"
      ? `flex items-center justify-center w-8 h-8 rounded-full border text-sm ${
          scraped ? "bg-amber-50 border-amber-300 text-amber-600" : "bg-white/90 border-gray-200 text-gray-600"
        }`
      : `rounded-md px-4 py-2 text-sm border ${
          scraped ? "bg-amber-50 border-amber-300 text-amber-600" : "bg-white border-gray-300 text-gray-700"
        }`;

  return (
    <>
      <button
        type="button"
        onClick={handleClick}
        disabled={submitting}
        aria-label={scraped ? "북마크 취소" : "북마크"}
        className={buttonClass}
      >
        {scraped ? "★" : "☆"}
        {/* EPIC-089(요구사항 3): 표시 문구를 "스크랩"→"북마크"로 변경(요청
            원문) — 내부 데이터 모델(user_scraps 테이블, /api/scraps 라우트,
            함수/컴포넌트 이름)은 이번 범위가 아니라 그대로 둔다. */}
        {size === "md" && <span className="ml-1">북마크</span>}
      </button>

      {showLoginPrompt && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowLoginPrompt(false);
          }}
        >
          <div className="w-full max-w-sm rounded-lg bg-white p-6 text-center shadow-lg">
            <p className="mb-4 text-sm text-gray-700">
              북마크하려면 로그인이 필요해요.
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
    </>
  );
}
