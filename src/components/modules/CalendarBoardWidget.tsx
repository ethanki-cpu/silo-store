"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/lib/AuthProvider";
import { supabase } from "@/lib/supabaseClient";
import { CalendarGrid } from "@/components/modules/CalendarGrid";
import { extractCalendarMedia } from "@/lib/calendarMedia";
import { fetchCrossPostedPostIds } from "@/lib/postBoards";
import type { JSONContent } from "@/lib/blockEditorCore";

type CalendarPost = {
  id: string;
  slug: string | null;
  title: string;
  created_at: string;
  tags: string[] | null;
  author_id: string;
  body_json: JSONContent | null;
};

// EPIC-092(요구사항 5): 확정된 4개 필터 라벨 — "나의 달력"만 태그가 아니라
// 로그인한 작성자 본인 글 여부로 판정한다(사용자 확인 완료).
const TAG_FILTERS = ["예술가의 달력", "학자의 달력", "사일로의 달력", "나의 달력"] as const;

function pad(n: number) {
  return String(n).padStart(2, "0");
}

function dateKey(iso: string) {
  const d = new Date(iso);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function CalendarCellPopout({
  date,
  posts,
  boardSlug,
  writeHref,
}: {
  date: string;
  posts: CalendarPost[];
  boardSlug: string | null;
  writeHref: string | null;
}) {
  const media = useMemo(() => posts.flatMap((p) => extractCalendarMedia(p.body_json)), [posts]);
  const [index, setIndex] = useState(0);
  const current = media.length > 0 ? media[index % media.length] : null;

  return (
    <div
      className="w-56 rounded-lg border border-gray-200 bg-white p-2 text-left shadow-lg"
      onClick={(e) => e.stopPropagation()}
    >
      <p className="mb-1 text-xs font-medium text-gray-500">{date}</p>
      {writeHref && (
        <Link
          href={writeHref}
          className="mb-2 block rounded-md bg-[#166534] px-2 py-1 text-center text-xs text-white hover:opacity-90"
        >
          + 글 등록
        </Link>
      )}
      {current && (
        <div className="relative mb-2 aspect-video overflow-hidden rounded bg-gray-100">
          {current.type === "video" ? (
            <video src={current.src} className="h-full w-full object-cover" autoPlay muted loop playsInline />
          ) : current.type === "embed" ? (
            <iframe src={current.src} className="h-full w-full" allow="autoplay; encrypted-media" />
          ) : (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={current.src} alt="" className="h-full w-full object-cover" />
          )}
          {media.length > 1 && (
            <>
              <button
                type="button"
                onClick={() => setIndex((i) => (i - 1 + media.length) % media.length)}
                className="absolute left-1 top-1/2 -translate-y-1/2 rounded-full bg-black/50 px-1.5 text-xs text-white"
              >
                ‹
              </button>
              <button
                type="button"
                onClick={() => setIndex((i) => (i + 1) % media.length)}
                className="absolute right-1 top-1/2 -translate-y-1/2 rounded-full bg-black/50 px-1.5 text-xs text-white"
              >
                ›
              </button>
            </>
          )}
        </div>
      )}
      {posts.length > 0 && (
        <ul className="space-y-1">
          {posts.map((post) => (
            <li key={post.id}>
              {boardSlug ? (
                <Link
                  href={`/boards/${boardSlug}/${post.slug ?? post.id}`}
                  className="block truncate text-xs text-gray-700 hover:underline"
                >
                  {post.title}
                </Link>
              ) : (
                <span className="block truncate text-xs text-gray-700">{post.title}</span>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

// EPIC-092(요구사항 5): CalendarGrid(순수 프레젠테이션 셸, src/components/
// modules/CalendarGrid.tsx)를 실제 게시판 데이터와 연결하는 데이터-페칭
// 래퍼 — BoardModule.tsx가 boardId 하나로 나머지(조회/상태관리)를 전부
// 책임지는 역할 분담과 동일한 패턴.
// HOTFIX-093-B: boardId가 null이어도(아직 게시판을 연결하지 않은 캘린더
// 위젯) 필터 체크박스/"+ 글 등록" 버튼은 항상 렌더링한다 — 데이터 조회만
// 건너뛴다(빈 달력). "+ 글 등록"은 연결된 게시판이 없으면 boardId 쿼리
// 없이 일반 글쓰기 페이지(/write)로 보낸다.
export function CalendarBoardWidget({ boardId }: { boardId: string | null }) {
  const { member } = useAuth();
  const now = useMemo(() => new Date(), []);
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1); // 1-12
  const [posts, setPosts] = useState<CalendarPost[]>([]);
  const [loading, setLoading] = useState(false);
  const [boardSlug, setBoardSlug] = useState<string | null>(null);
  const [checkedFilters, setCheckedFilters] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!boardId) {
      setBoardSlug(null);
      return;
    }
    let cancelled = false;
    supabase
      .from("boards")
      .select("slug")
      .eq("id", boardId)
      .maybeSingle()
      .then(({ data }) => {
        if (!cancelled) setBoardSlug((data as { slug: string | null } | null)?.slug ?? null);
      });
    return () => {
      cancelled = true;
    };
  }, [boardId]);

  useEffect(() => {
    if (!boardId) {
      setPosts([]);
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    const monthStart = `${year}-${pad(month)}-01`;
    const next = month === 12 ? { y: year + 1, m: 1 } : { y: year, m: month + 1 };
    const monthEnd = `${next.y}-${pad(next.m)}-01`;
    // HOTFIX-093-B(요구사항 1.2): 이 게시판에 주 소속인 글뿐 아니라
    // post_boards로 "추가 연결"된 글도 캘린더에 함께 표시한다.
    fetchCrossPostedPostIds(supabase, boardId).then((crossIds) => {
      if (cancelled) return;
      const filter =
        crossIds.length > 0
          ? `board_id.eq.${boardId},id.in.(${crossIds.join(",")})`
          : null;
      const query = supabase
        .from("posts")
        .select("id, slug, title, created_at, tags, author_id, body_json")
        .gte("created_at", monthStart)
        .lt("created_at", monthEnd);
      (filter ? query.or(filter) : query.eq("board_id", boardId)).then(({ data }) => {
        if (cancelled) return;
        setPosts((data as CalendarPost[]) ?? []);
        setLoading(false);
      });
    });
    return () => {
      cancelled = true;
    };
  }, [boardId, year, month]);

  const filteredPosts = useMemo(() => {
    if (checkedFilters.size === 0) return posts;
    return posts.filter((post) =>
      [...checkedFilters].some((label) =>
        label === "나의 달력" ? post.author_id === member?.id : (post.tags ?? []).includes(label),
      ),
    );
  }, [posts, checkedFilters, member?.id]);

  const postsByDate = useMemo(() => {
    const map = new Map<string, CalendarPost[]>();
    for (const post of filteredPosts) {
      const key = dateKey(post.created_at);
      const list = map.get(key) ?? [];
      list.push(post);
      map.set(key, list);
    }
    return map;
  }, [filteredPosts]);

  const markedDates = useMemo(() => [...postsByDate.keys()], [postsByDate]);

  function toggleFilter(label: string) {
    setCheckedFilters((prev) => {
      const next = new Set(prev);
      if (next.has(label)) next.delete(label);
      else next.add(label);
      return next;
    });
  }

  function goPrevMonth() {
    if (month === 1) {
      setYear((y) => y - 1);
      setMonth(12);
    } else {
      setMonth((m) => m - 1);
    }
  }
  function goNextMonth() {
    if (month === 12) {
      setYear((y) => y + 1);
      setMonth(1);
    } else {
      setMonth((m) => m + 1);
    }
  }

  // HOTFIX-093-B: 게시판이 연결되지 않았어도 버튼 자체는 항상 보여야
  // 하므로(요구사항), 연결 전에는 boardId 없이 일반 글쓰기 페이지로 보낸다.
  const writeBase = boardSlug ? `/write?boardId=${encodeURIComponent(boardSlug)}` : "/write";

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={goPrevMonth}
            className="rounded-md border border-gray-200 px-2 py-1 text-sm hover:bg-gray-50"
          >
            ‹
          </button>
          <span className="text-sm font-medium text-gray-700">
            {year}년 {month}월
          </span>
          <button
            type="button"
            onClick={goNextMonth}
            className="rounded-md border border-gray-200 px-2 py-1 text-sm hover:bg-gray-50"
          >
            ›
          </button>
        </div>
        {writeBase && (
          <Link
            href={writeBase}
            className="rounded-md bg-[#166534] px-3 py-1.5 text-sm text-white hover:opacity-90"
          >
            + 글 등록
          </Link>
        )}
      </div>

      <div className="mb-3 flex flex-wrap gap-3">
        {TAG_FILTERS.map((label) => (
          <label key={label} className="flex items-center gap-1.5 text-sm text-gray-600">
            <input type="checkbox" checked={checkedFilters.has(label)} onChange={() => toggleFilter(label)} />
            {label}
          </label>
        ))}
      </div>

      <CalendarGrid
        year={year}
        month={month}
        markedDates={markedDates}
        cellContent={(date) => (
          <CalendarCellPopout
            date={date}
            posts={postsByDate.get(date) ?? []}
            boardSlug={boardSlug}
            writeHref={writeBase ? `${writeBase}&date=${date}` : null}
          />
        )}
      />
      {loading && <p className="mt-2 text-xs text-gray-400">불러오는 중...</p>}
    </div>
  );
}
