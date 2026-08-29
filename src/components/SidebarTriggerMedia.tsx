"use client";

import { useEffect, useRef } from "react";

// EPIC-078: 기본/호버 미디어 URL 확장자로 이미지 vs 비디오를 판별한다.
function isVideoUrl(url: string): boolean {
  return /\.(webm|mp4)(\?|$)/i.test(url);
}

type VideoFrameCallbackVideo = HTMLVideoElement & {
  requestVideoFrameCallback?: (callback: () => void) => number;
  cancelVideoFrameCallback?: (handle: number) => void;
};

// LeftSidebar/RightSidebar 여닫이 아이콘 hover 애니메이션에서 흰색(또는 검은색)
// 사각형 매트가 보이는 문제 — <video> 태그로 투명 WebM(alpha_mode: 1)을 직접
// 화면에 그리면, 알파 채널 합성이 GPU 가속 디코딩 경로에서 무시되어 불투명한
// 사각형으로 렌더링되는 경우가 있다(브라우저/드라이버에 따라 다름). 실제 알파
// 값은 canvas 2D의 drawImage로 그렸을 때는 항상 정확히 보존되므로, <video>는
// 화면에 노출하지 않는 프레임 소스로만 쓰고 매 프레임을 canvas에 그려 투명도를
// 보장한다.
function TransparentVideo({
  src,
  className,
  loopCount = 0,
}: {
  src: string;
  className: string;
  /** 사용자 지시(2026-08-29 — "두번째 이미지가 모션이라면 몇번 loop
   *  할지 설정할수 있게"): 0(기본값)이면 기존과 동일하게 무한 반복. N이면
   *  N번 재생 후 마지막 프레임에서 멈춘다(video.loop 대신 'ended' 이벤트를
   *  직접 세어 재생 — 네이티브 loop=true는 'ended'가 아예 발생하지 않아
   *  횟수를 셀 수 없다). */
  loopCount?: number;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const video = videoRef.current as VideoFrameCallbackVideo | null;
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!video || !canvas || !ctx) return;

    let rafId = 0;
    let vfcId = 0;
    let cancelled = false;
    let playsRemaining = loopCount > 0 ? loopCount : Infinity;
    function handleEnded() {
      playsRemaining -= 1;
      if (cancelled || playsRemaining <= 0) return;
      video!.currentTime = 0;
      tryPlay();
    }
    if (loopCount > 0) video.addEventListener("ended", handleEnded);

    // EPIC-079-PHASE-2: 지금까지 <video autoPlay muted>의 JSX 속성만 믿고
    // 재생을 시작했는데, React가 hydration 시점에 `muted`를 DOM
    // "속성"(attribute)이 아니라 "프로퍼티"로 정확히 반영하는 타이밍이
    // 브라우저의 autoplay 정책(음소거 상태여야 autoplay 허용) 판정보다
    // 늦으면 play()가 조용히 reject되고, videoWidth/height가 계속 0으로
    // 남아 draw()가 canvas에 아무것도 그리지 못한다 — 그 결과 CSS
    // scale(hover 확대)만 눈에 보이고 애니메이션 자체는 재생되지 않는
    // 것처럼 보였다. muted를 프로퍼티로 명시적으로 먼저 설정한 뒤 직접
    // play()를 호출하고, 실패하면 사용자가 실제로 hover(마우스 진입)할
    // 때 한 번 더 재시도한다.
    video.muted = true;
    const tryPlay = () => {
      video.play().catch(() => {
        /* 자동재생이 거부됐다면 아래 canplay/사용자 상호작용 재시도로 넘어간다. */
      });
    };
    tryPlay();
    // <video>는 pointerEvents: "none"이라 자신에게는 hover가 닿지 않으므로,
    // canplay(디코딩 준비 완료)와 문서 전역의 최초 사용자 상호작용 시점에도
    // 한 번씩 더 재생을 시도한다 — 브라우저가 처음엔 autoplay를 거부했더라도
    // 실제 상호작용이 있었다는 신호가 생기면 재생이 허용되는 경우가 많다.
    video.addEventListener("canplay", tryPlay);
    document.addEventListener("pointerdown", tryPlay, { once: true });
    document.addEventListener("keydown", tryPlay, { once: true });

    function draw() {
      if (cancelled || !video || !canvas || !ctx) return;
      if (video.videoWidth && video.videoHeight) {
        if (
          canvas.width !== video.videoWidth ||
          canvas.height !== video.videoHeight
        ) {
          canvas.width = video.videoWidth;
          canvas.height = video.videoHeight;
        }
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(video, 0, 0);
      }
      if (typeof video.requestVideoFrameCallback === "function") {
        vfcId = video.requestVideoFrameCallback(draw);
      } else {
        rafId = requestAnimationFrame(draw);
      }
    }

    draw();

    return () => {
      cancelled = true;
      if (rafId) cancelAnimationFrame(rafId);
      if (vfcId && typeof video.cancelVideoFrameCallback === "function") {
        video.cancelVideoFrameCallback(vfcId);
      }
      video.removeEventListener("canplay", tryPlay);
      document.removeEventListener("pointerdown", tryPlay);
      document.removeEventListener("keydown", tryPlay);
      if (loopCount > 0) video.removeEventListener("ended", handleEnded);
    };
  }, [src, loopCount]);

  return (
    <>
      <video
        ref={videoRef}
        src={src}
        autoPlay
        loop={loopCount <= 0}
        muted
        playsInline
        disablePictureInPicture
        disableRemotePlayback
        style={{ position: "absolute", width: 1, height: 1, opacity: 0, pointerEvents: "none" }}
        aria-hidden
      />
      <canvas ref={canvasRef} className={className} />
    </>
  );
}

// EPIC-078: 기본(Default) 미디어와 호버(Hover) 미디어를 같은 자리에 겹쳐
// 그리고 opacity로 크로스페이드한다 — 이미지/투명 비디오(webm/mp4) 모두
// 같은 방식으로 렌더링.
export function SidebarTriggerMedia({
  url,
  alt,
  className,
  loopCount = 0,
}: {
  url: string;
  alt: string;
  className: string;
  /** 사용자 지시(2026-08-29): 영상일 때만 의미 있음 — 0(기본값)은 무한 반복. */
  loopCount?: number;
}) {
  if (!url) return null;
  if (isVideoUrl(url)) {
    return <TransparentVideo src={url} className={className} loopCount={loopCount} />;
  }
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={url} alt={alt} className={className} />;
}
