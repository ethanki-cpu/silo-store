"use client";

// EPIC-147: 실제 마운트 로직 — 이 파일만 next/dynamic({ssr:false})로 감싸
// 클라이언트에서만 로드한다(SiloTimeline.tsx 참고). 반드시 그래야 하는
// 이유: @knight-lab/timeline-ng 컴파일 번들이 최상위 스코프에서
// DOMPurify.addHook(...)을 즉시 호출하는데, DOMPurify는 `window`가 없으면
// (Next.js가 "use client" 페이지도 최초 요청 때 Node.js에서 한 번 SSR하는
// 그 순간) 아무 메서드도 없는 빈 스텁만 반환해 그 즉시 TypeError로 죽는다.
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { mount, unmount } from "svelte";
import { SlidePlayer, loadTimeline } from "@knight-lab/timeline-ng";
import "@knight-lab/timeline-ng/styles.css";

export default function SiloTimelineInner({
  boardId,
  theme = "auto",
}: {
  boardId: string;
  theme?: "light" | "dark" | "auto";
}) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    let instance: Record<string, unknown> | null = null;

    // loadTimeline()은 "at://" 또는 절대 http(s):// URL만 받는다(상대 경로
    // 거부, 실측으로 확인 — AT Protocol 레코드 주소와 구분하려고 엄격하게
    // 검사하는 듯) — 그래서 현재 origin을 직접 붙인다.
    const eventsUrl = `${window.location.origin}/api/timeline/events?board=${encodeURIComponent(boardId)}`;
    loadTimeline(eventsUrl).then(
      (result: { ok: true; timeline: unknown } | { ok: false; error: string }) => {
        if (cancelled || !containerRef.current) return;
        if (!result.ok) {
          setError(result.error);
          return;
        }
        instance = mount(SlidePlayer, {
          target: containerRef.current,
          props: { timeline: result.timeline, theme },
        }) as Record<string, unknown>;
      },
    );

    return () => {
      cancelled = true;
      if (instance) unmount(instance);
    };
  }, [boardId, theme]);

  // EPIC-147(요구사항 3 — "새로고침 없이 부드럽게 상세 게시글 페이지로
  // 넘어가도록 이벤트 가로채기"): SlidePlayer는 Svelte가 그리는 순수 DOM이라
  // React가 그 안의 <a> 클릭을 알 방법이 없다 — 컨테이너 레벨에서 native
  // click 리스너로 가로챈다. "자세히 보기" 링크뿐 아니라 미디어(이미지)를
  // 클릭해도 같은 슬라이드 안의 링크로 이동하도록, 클릭 지점에서 가장
  // 가까운 슬라이드(.tl-slide) 안의 첫 <a>를 찾아 대신 내비게이션한다.
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    function handleClick(e: MouseEvent) {
      const target = e.target as HTMLElement | null;
      if (!target) return;
      const directLink = target.closest("a");
      const link = directLink ?? target.closest(".tl-slide")?.querySelector("a[href]");
      if (!link) return;
      const href = link.getAttribute("href");
      if (!href || !href.startsWith("/") || href.startsWith("//")) return;
      e.preventDefault();
      router.push(href);
    }

    container.addEventListener("click", handleClick);
    return () => container.removeEventListener("click", handleClick);
  }, [router]);

  if (error) {
    return <p className="p-6 text-sm text-red-600">타임라인을 불러오지 못했어요: {error}</p>;
  }

  return <div ref={containerRef} className="tl-silo-container" style={{ minHeight: 600 }} />;
}
