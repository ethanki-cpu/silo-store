"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import type { BoardPost } from "@/lib/boardLayout";
import { PostTags } from "@/components/boards/PostTags";
import { formatPostMeta } from "@/lib/postMeta";
import { ScrapButton } from "@/components/common/ScrapButton";
import { extractCalendarMedia } from "@/lib/calendarMedia";

const HOVER_SLIDE_INTERVAL_MS = 1800;

// EPIC-092 후속(사용자 요청): 카드에 커서를 올리면 본문 갤러리의 영상을
// 자동재생하고 이미지들을 미리 볼 수 있다. 데이터는 목록 API가 이미
// 내려주는 post.body_json에서 뽑는다(별도 fetch 없음, 사용자 확인) —
// src/lib/calendarMedia.ts의 extractCalendarMedia를 그대로 재사용한다
// (캘린더 위젯 전용이 아니라 body_json → 미디어 목록 추출 범용 유틸이라
// 이름과 무관하게 재사용 가능). embed(유튜브 등 iframe)는 매 hover마다
// 로드하기엔 무겁고 autoplay가 보장되지 않아 이미지/영상만 대상으로 삼는다.
// EPIC-092 후속 2차(사용자 요청): 영상은 계속 자동재생하지만, 이미지
// 슬라이드는 기본이 좌우 화살표로 직접 넘기는 수동 방식 — autoSlide prop이
// true일 때만(게시판 설정) 기존처럼 일정 간격으로 자동 전환한다.
function GalleryCardMedia({
  imageUrl,
  alt,
  bodyJson,
  autoSlide = false,
}: {
  imageUrl: string | null;
  alt: string;
  bodyJson: BoardPost["body_json"];
  autoSlide?: boolean;
}) {
  const [hovering, setHovering] = useState(false);
  const [index, setIndex] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const media = (bodyJson ? extractCalendarMedia(bodyJson) : []).filter((m) => m.type !== "embed");

  useEffect(() => {
    if (!hovering || !autoSlide || media.length <= 1) return;
    timerRef.current = setInterval(() => {
      setIndex((i) => (i + 1) % media.length);
    }, HOVER_SLIDE_INTERVAL_MS);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hovering, autoSlide, media.length]);

  function handleEnter() {
    setHovering(true);
    setIndex(0);
  }
  function handleLeave() {
    setHovering(false);
    setIndex(0);
  }
  function goPrev(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    setIndex((i) => (i - 1 + media.length) % media.length);
  }
  function goNext(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    setIndex((i) => (i + 1) % media.length);
  }

  const current = hovering && media.length > 0 ? media[index % media.length] : null;
  const showArrows = hovering && !autoSlide && media.length > 1;

  if (!imageUrl && !current) {
    return (
      <div className="w-full aspect-square bg-gray-50 border border-gray-100 flex items-center justify-center text-gray-300 text-xs">
        이미지 없음
      </div>
    );
  }

  return (
    <div className="relative w-full" onMouseEnter={handleEnter} onMouseLeave={handleLeave}>
      {current?.type === "video" ? (
        <video
          src={current.src}
          className="w-full object-cover"
          autoPlay
          muted
          loop
          playsInline
        />
      ) : (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={current?.src ?? imageUrl ?? undefined} alt={alt} className="w-full object-cover" />
      )}
      {showArrows && (
        <>
          <button
            type="button"
            onClick={goPrev}
            aria-label="이전 미디어"
            className="absolute left-1 top-1/2 z-10 -translate-y-1/2 rounded-full bg-black/50 px-2 py-1 text-white hover:bg-black/70"
          >
            ‹
          </button>
          <button
            type="button"
            onClick={goNext}
            aria-label="다음 미디어"
            className="absolute right-1 top-1/2 z-10 -translate-y-1/2 rounded-full bg-black/50 px-2 py-1 text-white hover:bg-black/70"
          >
            ›
          </button>
        </>
      )}
    </div>
  );
}

// EPIC-056: Board Module 목록 ⑦ Gallery Module — 이미지 카드 + Masonry/Grid
// (CSS columns 기반). src/components/boards/BoardRenderer.tsx 안에 갇혀
// 있던 사설(private) 컴포넌트를 그대로 뽑아낸 것(마크업/동작 변경 없음).
// EPIC-066: Board Widget 출력 요구 항목(좋아요/댓글/작성자/조회수/태그/
// 카테고리)을 이미지 아래 캡션 한 줄 + 태그 칩으로 추가 — 이미지 중심
// 레이아웃 자체는 그대로 유지한다.
// EPIC-084: BoardModule(전체 게시판 위젯)은 BoardHeader가 이미 글쓰기
// 버튼을 갖고 있었지만, 갤러리 위젯은 없어 "이 갤러리가 연결된 게시판에
// 바로 쓰고 싶다"는 요청을 못 들어줬다 — Contextual Write 진입점
// (/write?boardId=)으로 연결하는 버튼을 우측 상단에 추가한다.
const DEFAULT_GRID_COLUMNS = 3;
const MIN_GRID_COLUMNS = 2;
const MAX_GRID_COLUMNS = 6;

export function GalleryModule({
  boardId,
  posts,
  boardCategory,
  showLikes,
  showComments,
  showViewCount,
  showWriteButton = true,
  layout = "masonry",
  columns,
  hoverAutoSlide = false,
}: {
  boardId: string;
  posts: BoardPost[];
  boardCategory?: string | null;
  // EPIC-066: 게시판 관리의 좋아요/댓글/조회수 사용 여부 토글.
  showLikes?: boolean;
  showComments?: boolean;
  showViewCount?: boolean;
  showWriteButton?: boolean;
  // EPIC-092 후속(요구사항): 기본은 기존과 동일한 masonry(세로 우선 채움,
  // CSS columns) — "grid"를 주면 가로 우선(행 우선) CSS Grid로 바뀐다.
  // columns는 grid일 때 한 행에 보여줄 개수(2~6, 기본 3)를 강제한다.
  layout?: "masonry" | "grid";
  columns?: number;
  // EPIC-092 후속 2차: 호버 시 이미지 슬라이드를 자동으로 넘길지(true) 아니면
  // 좌우 화살표로 직접 넘기게 할지(기본 false) — 영상은 이 값과 무관하게
  // 항상 자동재생된다.
  hoverAutoSlide?: boolean;
}) {
  const gridColumns = Math.min(MAX_GRID_COLUMNS, Math.max(MIN_GRID_COLUMNS, columns || DEFAULT_GRID_COLUMNS));
  return (
    <div>
      {showWriteButton && (
        <div className="flex justify-end mb-3">
          <Link
            href={`/write?boardId=${encodeURIComponent(boardId)}`}
            className="rounded-md border border-gray-300 px-3 py-1.5 text-sm hover:bg-gray-50"
          >
            글쓰기
          </Link>
        </div>
      )}
      <div
        className={
          layout === "grid"
            ? "grid gap-4"
            : "columns-2 sm:columns-3 gap-4 [column-fill:_balance]"
        }
        style={layout === "grid" ? { gridTemplateColumns: `repeat(${gridColumns}, minmax(0, 1fr))` } : undefined}
      >
      {posts.map((post) => {
        const imageUrl = post.thumbnail_visible !== false ? (post.featured_image_url ?? post.photo_url) : null;
        return (
        <div key={post.id} className={`relative group ${layout === "grid" ? "" : "mb-4 break-inside-avoid"}`}>
          {/* EPIC-085: ScrapButton은 자체 클릭 핸들러(preventDefault/
              stopPropagation)를 갖고 있지만, <a> 안에 <button>을 중첩하는
              건 유효하지 않은 HTML이라 카드 Link 바깥의 형제 요소로
              절대위치시켜 이미지 코너에 겹쳐 보이게 한다. */}
          <div className="absolute right-2 top-2 z-10">
            <ScrapButton postId={post.id} size="sm" />
          </div>
          <Link href={`/boards/${boardId}/${post.slug ?? post.id}`} className="block">
            <GalleryCardMedia
              imageUrl={imageUrl}
              alt={post.title ?? ""}
              bodyJson={post.body_json}
              autoSlide={hoverAutoSlide}
            />
            <p className="text-sm font-medium text-gray-900 mt-2 group-hover:underline">
              {post.title}
            </p>
            <p className="text-xs text-gray-400 mt-1">
              {formatPostMeta(post, { showLikes, showComments, showViewCount })}
            </p>
            <PostTags tags={[...(post.tags ?? []), ...(boardCategory ? [boardCategory] : [])]} />
          </Link>
        </div>
        );
      })}
      </div>
    </div>
  );
}
