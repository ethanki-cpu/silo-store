"use client";

// EPIC-114: 3D 캔버스 뒤에 까는 몰입형 유튜브 배경 — 페이지 진입 시 지정된
// 8개 영상 중 하나를 무작위로 골라 자동재생/음소거/반복 재생한다.
//
// 구현 메모:
// - 화면 전체를 "채우는" 효과(지시문의 object-cover)는 <iframe>에는
//   `object-fit`이 적용되지 않아(iframe은 자기 콘텐츠를 스스로 레이아웃),
//   유튜브 배경 영상에 흔히 쓰이는 표준 트릭을 쓴다 — 16:9 비율로 실제
//   필요한 것보다 항상 더 크게 그린 뒤(min-width/min-height를 vw/vh로),
//   가운데 정렬해 넘치는 부분을 잘라낸다. 결과적으로 object-cover와
//   시각적으로 동일하게 뷰포트를 항상 빈틈없이 채운다.
// - 무작위 선택은 서버/클라이언트 렌더가 다른 값을 낼 수 있어(hydration
//   mismatch) `useEffect` 안에서만 고른다 — 마운트 전에는 아무것도
//   그리지 않는다(다른 랜덤/시간 의존 로직과 이 파일의 기존 관례 참고).
import { useEffect, useMemo, useState } from "react";
import { extractYoutubeId } from "@/lib/blockEditorCore";

// EPIC-119: 하드코딩된 8개 URL은 이제 기본값일 뿐 — Universe Settings에서
// 관리자가 직접 추가/삭제/수정한 배열(`urls` prop)이 있으면 그걸 쓴다.
const DEFAULT_BACKGROUND_VIDEO_URLS = [
  "https://www.youtube.com/watch?v=IcVd-1A7Qfs",
  "https://www.youtube.com/watch?v=tBliA0MC-vo",
  "https://www.youtube.com/watch?v=Z9QUtjUq0HM",
  "https://www.youtube.com/watch?v=JtKLIjKaLYg",
  "https://www.youtube.com/watch?v=3u0sdGrIbeg&t=10037s",
  "https://www.youtube.com/watch?v=A7RuRAUEyUc",
  "https://www.youtube.com/watch?v=fe1-y15rVjc",
  "https://www.youtube.com/watch?v=IWVJq-4zW24",
];

export function YoutubeBackground({ urls }: { urls?: string[] }) {
  const [videoId, setVideoId] = useState<string | null>(null);
  const videoIds = useMemo(() => {
    const source = urls && urls.length > 0 ? urls : DEFAULT_BACKGROUND_VIDEO_URLS;
    return source.map(extractYoutubeId).filter((id): id is string => id !== null);
  }, [urls]);

  useEffect(() => {
    const pool = videoIds.length > 0 ? videoIds : DEFAULT_BACKGROUND_VIDEO_URLS;
    setVideoId(pool[Math.floor(Math.random() * pool.length)]);
  }, [videoIds]);

  if (!videoId) return null;

  return (
    <div
      aria-hidden
      className="pointer-events-none fixed inset-0 z-[-2] h-full w-full overflow-hidden bg-black"
    >
      <iframe
        title="About Silo 배경 영상"
        className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2"
        style={{
          // 16:9 오버스캔 트릭 — 항상 뷰포트보다 크게 그려 object-cover와
          // 동일한 "빈틈없이 채우기" 효과를 낸다.
          width: "100vw",
          height: "56.25vw", // 100vw * 9/16
          minHeight: "100vh",
          minWidth: "177.78vh", // 100vh * 16/9
          border: 0,
        }}
        src={`https://www.youtube.com/embed/${videoId}?autoplay=1&mute=1&loop=1&playlist=${videoId}&controls=0&showinfo=0&modestbranding=1&rel=0&iv_load_policy=3&playsinline=1&disablekb=1`}
        allow="autoplay; encrypted-media"
        tabIndex={-1}
      />
      {/* 영상 위 전경(행성/텍스트)이 늘 읽히도록 따뜻한 톤의 얇은 스크림. */}
      <div className="absolute inset-0 bg-gradient-to-b from-[#241708]/55 via-[#1a1206]/35 to-[#120c05]/65" />
    </div>
  );
}
