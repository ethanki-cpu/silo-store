"use client";

import { memo, useMemo } from "react";

// EPIC-094(요구사항 1.3): "홈페이지 설정 관리"의 우측 고정 패널 — 좌측 폼에서
// 모바일 설정(슬라이드/여백/로고 등)을 바꿀 때마다 새로고침·재조회 없이
// 그대로 리렌더링되는 스마트폰 프레임 미리보기. 데이터는 부모(page.tsx)가
// 이미 들고 있는 React state를 그대로 props로 받을 뿐(별도 fetch 없음) —
// 이 컴포넌트는 순수하게 "그 state를 아이폰 프레임 안에 어떻게 그릴지"만
// 담당한다. React.memo + 부모 쪽 useMemo(heroSlideshow.mobile 참조가 실제로
// 바뀔 때만 새 배열/객체 생성)로, PC 탭만 편집 중일 때는 이 트리가 불필요하게
// 다시 계산/렌더링되지 않는다.

type PreviewSlide = { imageUrl: string; title: string; description: string } | null;

type MainLogoPreview = {
  type: "text" | "image";
  text: string;
  imageUrl: string;
  heightPx: number;
  leftText: string;
  rightText: string;
  textColor: string;
};

function MobilePreviewFrameInner({
  slide,
  objectFit,
  mainLogo,
  marginTopPx,
  marginBottomPx,
  marginLeftPx,
  marginRightPx,
}: {
  slide: PreviewSlide;
  objectFit: "cover" | "contain";
  mainLogo: MainLogoPreview;
  marginTopPx: number;
  marginBottomPx: number;
  marginLeftPx: number;
  marginRightPx: number;
}) {
  // 슬라이드 자체는 부모에서 이미 useMemo로 안정된 참조를 받지만, 이 안에서
  // 파생되는 스타일 객체까지 매 렌더마다 새로 만들 필요는 없어 한 번 더 감싼다.
  const heroStyle = useMemo(
    () => ({
      paddingTop: marginTopPx,
      paddingBottom: marginBottomPx,
      paddingLeft: marginLeftPx,
      paddingRight: marginRightPx,
    }),
    [marginTopPx, marginBottomPx, marginLeftPx, marginRightPx],
  );

  return (
    <div className="mx-auto w-[300px]">
      {/* 아이폰 프레임 — 노치/측면 버튼까지 흉내낸 순수 CSS 컨테이너 */}
      <div className="relative rounded-[2.5rem] border-[10px] border-gray-900 bg-gray-900 shadow-xl">
        <div className="absolute left-1/2 top-0 z-10 h-6 w-32 -translate-x-1/2 rounded-b-2xl bg-gray-900" />
        <div className="relative h-[560px] w-full overflow-y-auto rounded-[1.75rem] bg-white">
          {/* 상단 로고 바 — 실제 Navbar 축소판이 아니라 이 프리뷰 전용 단순
              재현이다(정확한 픽셀 동기화보다 "실시간으로 반영된다"는 감각이
              목적). */}
          <div className="flex items-center justify-center gap-2 border-b border-gray-100 px-3 py-3 text-xs">
            {mainLogo.leftText && (
              <span style={{ color: mainLogo.textColor || undefined }}>{mainLogo.leftText}</span>
            )}
            {mainLogo.type === "image" && mainLogo.imageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={mainLogo.imageUrl}
                alt="로고 미리보기"
                style={{ height: Math.min(mainLogo.heightPx, 28) }}
                className="object-contain"
              />
            ) : (
              <span className="font-semibold">{mainLogo.text || "사일로 스토어"}</span>
            )}
            {mainLogo.rightText && (
              <span style={{ color: mainLogo.textColor || undefined }}>{mainLogo.rightText}</span>
            )}
          </div>

          {slide ? (
            <div style={heroStyle}>
              <div className="relative h-[260px] w-full overflow-hidden bg-gray-100">
                {slide.imageUrl && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={slide.imageUrl}
                    alt={slide.title || "모바일 슬라이드 미리보기"}
                    className={`h-full w-full ${objectFit === "contain" ? "object-contain" : "object-cover"}`}
                  />
                )}
                {(slide.title || slide.description) && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/30 px-4 text-center">
                    {slide.title && (
                      <p className="text-lg font-bold text-white">{slide.title}</p>
                    )}
                    {slide.description && (
                      <p className="mt-1 text-xs text-white/90">{slide.description}</p>
                    )}
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="flex h-[260px] items-center justify-center px-6 text-center text-xs text-gray-400">
              모바일 슬라이드를 추가하면 여기에 바로 보여요.
            </div>
          )}
        </div>
      </div>
      <p className="mt-2 text-center text-xs text-gray-400">모바일 실시간 미리보기</p>
    </div>
  );
}

export const MobilePreviewFrame = memo(MobilePreviewFrameInner);
