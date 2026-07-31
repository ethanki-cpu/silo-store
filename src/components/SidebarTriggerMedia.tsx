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
}: {
  src: string;
  className: string;
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
    };
  }, [src]);

  return (
    <>
      <video
        ref={videoRef}
        src={src}
        autoPlay
        loop
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
}: {
  url: string;
  alt: string;
  className: string;
}) {
  if (!url) return null;
  if (isVideoUrl(url)) {
    return <TransparentVideo src={url} className={className} />;
  }
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={url} alt={alt} className={className} />;
}
