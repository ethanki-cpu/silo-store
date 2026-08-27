"use client";

// HOTFIX-147.3(사용자 지시 — 온라인 도슨트 2단계 카테고리 페이지(혁명~제국
// 등)에도 클래식 타임라인을 넣고, Craft 에디터로 자유롭게 편집할 수 있게
// 해달라는 요청): 이미 있는 TimelineEmbedBlock(AlternatingTimelineCanvas,
// 손으로 스타일링한 zig-zag 카드형)과는 다른 블록이다 — 이건 실제
// TimelineJS3(SiloTimeline, EPIC-147) 위젯을 그대로 Craft 캔버스에 꽂는다.
// 게시판 하나(mode="board")뿐 아니라, site_navigations의 한 branch(href)
// 아래 모든 하위 게시판 글을 한 타임라인에 모으는 집계 모드(mode="group")도
// 지원한다 — 온라인 도슨트 2단계 카테고리 페이지가 이 모드를 쓴다.
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { useNode } from "@craftjs/core";
import { EditableBlockFrame, EditableText, useCraftEditable } from "@/components/craft/home/editable";
import { RevealWrapper } from "@/components/craft/shared/RevealWrapper";
import { MotionSettingsSection } from "@/components/craft/shared/MotionSettingsSection";
import { FreePositionHandles } from "@/components/craft/shared/FreePositionHandles";
import { FreePositionSettingsSection } from "@/components/craft/shared/FreePositionSettingsSection";
import { useDeviceMode } from "@/components/craft/shared/DeviceModeContext";
import { FontPicker } from "@/components/admin/FontPicker";
import { useCustomFonts } from "@/lib/useCustomFonts";
import { DEFAULT_MOTION, type MotionConfig } from "@/lib/useScrollReveal";
import { DEFAULT_FREE_POSITION, freePositionResponsiveAttrs, type FreePosition } from "@/lib/useFreePosition";
import { SiloTimeline } from "@/components/timeline/SiloTimeline";
import type { TimelineCoverState } from "@/components/timeline/SiloTimelineInner";
import { uploadFile } from "@/lib/storage";
import { supabase } from "@/lib/supabaseClient";

type CoverFontWeight = "normal" | "medium" | "semibold" | "bold";
type CoverAlign = "left" | "center" | "right";

// HOTFIX-147.13(사용자 지시 — "그리스/르네상스/바로크/로코코 같은 하위
// 이벤트 화면에도 표지처럼 자유편집(슬라이드+드래그 텍스트+폰트/색상)을
// 넣고 싶다, 다른 카테고리에도 적용해달라"): 표지 하나에만 있던 자유편집을
// "이 타임라인의 어떤 슬라이드에든" 적용 가능하게 일반화한 설정 뭉치 —
// 표지(coverXxx 플랫 prop들, 하위 호환 유지)와 각 이벤트(아래
// eventOverlays[unique_id])가 둘 다 이 모양을 쓴다.
export type SlideOverlayConfig = {
  enabled: boolean;
  text: string;
  // HOTFIX-147.18(사용자 지시 — "그 화면에 이미 있는 텍스트들을 수정할 수
  // 있기를 원해 <제목/설명>"): 지금까지 자유배치 텍스트가 `text`(제목)
  // 하나뿐이었다 — 제목 아래 부제/설명 한 줄을 더 얹을 수 있게 별도
  // 필드로 분리한다(같은 위치 상자 안에 제목보다 작게 이어서 표시).
  description: string;
  fontSizePx: number;
  fontWeight: CoverFontWeight;
  align: CoverAlign;
  color: string;
  fontFamily: string;
  // HOTFIX(사용자 지시 — "'Ancient Monarchy'를 위한 텍스트 설정, '고대~왕정'을
  // 위한 텍스트 설정이 달라야 해"): 위 5개(fontSizePx~fontFamily)는 사실상
  // "제목" 전용 스타일이었는데 설명(description)도 그대로 물려 쓰고 있었다
  // — 여기 5개를 새로 추가해 설명을 제목과 독립적으로 꾸밀 수 있게 한다.
  // null이면 "아직 커스터마이징 안 함" = 지금까지의 기본 동작(크기는 제목의
  // 50%, 색상/폰트/정렬은 제목과 동일, 굵기는 normal)을 그대로 유지해
  // 기존 저장 데이터가 시각적으로 전혀 안 바뀐다.
  descriptionFontSizePx: number | null;
  descriptionFontWeight: CoverFontWeight | null;
  descriptionAlign: CoverAlign | null;
  descriptionColor: string | null;
  descriptionFontFamily: string | null;
  // HOTFIX(사용자 신고 — "슬라이드 이미지가 전부 안보이고 잘려서 보여"):
  // 배경 슬라이드가 지금까지 항상 object-cover(컨테이너를 꽉 채우도록
  // 남는 부분을 잘라냄)로만 그려졌다 — 이미지 비율이 표지 영역과 다르면
  // 위/아래 또는 좌우가 크게 잘려 나갔다. null이면 기존과 동일하게
  // "꽉 채우기"(cover) 유지 — 기존 저장 데이터의 시각적 회귀를 막는다.
  backgroundFit: "cover" | "contain" | null;
  slideUrls: string[];
  autoAdvanceSeconds: number;
  position: FreePosition;
  mobilePosition: FreePosition | null;
};

export const DEFAULT_SLIDE_OVERLAY_CONFIG: SlideOverlayConfig = {
  enabled: false,
  text: "",
  description: "",
  fontSizePx: 40,
  fontWeight: "bold",
  align: "center",
  color: "#ffffff",
  fontFamily: "",
  descriptionFontSizePx: null,
  descriptionFontWeight: null,
  descriptionAlign: null,
  descriptionColor: null,
  descriptionFontFamily: null,
  backgroundFit: null,
  slideUrls: [],
  autoAdvanceSeconds: 5,
  position: DEFAULT_FREE_POSITION,
  mobilePosition: null,
};

export type SiloTimelineEmbedBlockProps = {
  mode: "board" | "group";
  boardId: string;
  groupHref: string;
  stageHeightPx: number;
  // HOTFIX-147.19(사용자 지시 — "대시보드가 그 타임라인 전체를 한눈에 볼
  // 수 없도록 줌인되어있다, 조절할 수 있는 기능을 넣고 전체를 한눈에 볼
  // 수 있도록 줌을 조절해달라"): TL3 TimeNav의 확대 배율(공식 옵션명
  // scale_factor) 초기값 — TL3 자체 기본값 2 대신 공식 zoom_sequence
  // 최솟값인 0.5(실측상 4단계 카테고리 마커가 전부 스크롤 없이 들어옴)를
  // 기본으로 쓴다. 0/미지정이면 0.5로 취급(SiloTimelineInner.tsx).
  initialZoomFactor: number;
  motion?: MotionConfig;
  // HOTFIX-147.8(사용자 지시 — "타임라인 섹션이 처음 로딩되면 보이는
  // '혁명~제국' 부분을 내가 텍스트를 변형하고, 뒷 배경으로 슬라이드/이미지를
  // 넣고 싶다, 드래그앤드랍과 사이즈 조절을 자유롭게 하게 해달라"): TL3
  // 자체 표지(title) 슬라이드 대신 이 블록이 직접 그리는 오버레이 — 켜면
  // 표지를 보고 있을 때만 배경 슬라이드쇼 + 자유배치 텍스트가 TL3 위에
  // 겹쳐 보이고, 다른 이벤트를 클릭하면(대시보드) 자동으로 사라져 TL3의
  // 원래 이벤트 슬라이드가 그대로 보인다(SiloTimelineInner.tsx 참고).
  // 플랫 필드로 남겨둔다 — 기존 4개 카테고리 페이지의 craft_state가 이미
  // 이 모양으로 저장돼 있어 구조를 바꾸면 마이그레이션이 필요해진다.
  coverEnabled: boolean;
  coverText: string;
  // HOTFIX-147.18: coverText(제목) 아래 붙는 부제/설명 한 줄.
  coverDescription: string;
  coverFontSizePx: number;
  coverFontWeight: CoverFontWeight;
  coverAlign: CoverAlign;
  coverColor: string;
  coverFontFamily: string;
  // 표지도 SlideOverlayConfig와 동일하게 설명 전용 스타일 5개를 별도로
  // 갖는다 — 표지는 eventOverlays처럼 중첩 객체가 아니라 flat prop
  // 패턴(기존 coverXxx와 동일)을 그대로 따른다.
  coverDescriptionFontSizePx: number | null;
  coverDescriptionFontWeight: CoverFontWeight | null;
  coverDescriptionAlign: CoverAlign | null;
  coverDescriptionColor: string | null;
  coverDescriptionFontFamily: string | null;
  coverBackgroundFit: "cover" | "contain" | null;
  coverSlideUrls: string[];
  coverAutoAdvanceSeconds: number;
  // FreePositionSettingsSection/FreePositionHandles가 node.data.props의
  // 최상위 position/mobilePosition을 직접 읽고 쓰므로(다른 자유배치
  // 블록들과 동일한 계약) 이 두 필드는 반드시 최상위에 있어야 한다 —
  // 표지 전용이고, 이벤트별 위치는 아래 eventOverlays[id].position에 각자 있다.
  position: FreePosition;
  mobilePosition: FreePosition | null;
  // HOTFIX-147.13: 이벤트 unique_id → 그 이벤트 화면에 적용할 자유편집
  // 설정. 표지와 달리 이벤트는 개수가 정해져 있지 않아 맵으로 둔다.
  eventOverlays: Record<string, SlideOverlayConfig>;
};

// HOTFIX-147.19: TL3(TimelineJS3) 자체가 정의한 `zoom_sequence` 기본값
// 그대로(node_modules/@knight-lab/timelinejs/src/js/timenav/TimeNav.js) —
// TimeNav 확대는 이 이산 단계 사이에서만 오간다(피보나치 수열).
const ZOOM_SEQUENCE = [0.5, 1, 2, 3, 5, 8, 13, 21, 34, 55, 89];

const COVER_WEIGHT_CLASS: Record<CoverFontWeight, string> = {
  normal: "font-normal",
  medium: "font-medium",
  semibold: "font-semibold",
  bold: "font-bold",
};
const COVER_ALIGN_CLASS: Record<CoverAlign, string> = {
  left: "text-left",
  center: "text-center",
  right: "text-right",
};

// HOTFIX-147.8: HeroSlideshow.tsx는 vh 기준 높이/여백/제목 오버레이까지
// 갖춘 무거운 컴포넌트라(제목을 자체적으로도 그려 이 블록의 자유배치
// 텍스트와 중복됨, 높이도 vh 단위라 TL3 표지 영역의 실측 px 높이에 맞추기
// 어려움) 재사용하지 않고, 배경 크로스페이드만 담당하는 최소 구현을 둔다.
// HOTFIX-147.25(사용자 지시 — "각 이벤트의 배경이미지 슬라이드마다 이미지가
// 가로이미지는 왼쪽에서 오른쪽으로, 세로이미지는 위에서 아래로 scope가
// 이동하는 모션이 있으면 좋겠어. 이걸 모든 '온라인 도슨트' 바로 아래
// 하위 카테고리 페이지의 타임라인에 모두 적용해달라"): 표지/이벤트
// 배경이 전부 이 컴포넌트 하나를 공유해 그리므로(다른 3개 카테고리와도
// 동일), 여기 한 곳만 고치면 자동으로 전부 적용된다.
// HOTFIX-147.26(사용자 재신고 — "위 아래는 되고 있는데 왼쪽 오른쪽은 안
// 되고 있어. 가로 이미지를 줌인해서 왼쪽에서 오른쪽으로 가는 모션으로
// 해줘"): 처음엔 object-position만 애니메이션했는데(이 표지 영역 자체가
// 가로로 아주 넓은 배너라서), 실측해보니 표준 사진 비율(예: 1280×808)의
// "가로" 이미지조차 object-fit: cover가 실제로는 세로 방향만 넘치게
// 잘라내고 가로는 이미 컨테이너 폭에 딱 맞아 잘리는 부분이 없는 경우가
// 흔했다 — 그러면 가로축 object-position을 움직여도 잘릴 여유분 자체가
// 없어 화면상 아무 움직임도 안 보인다(실제로 재현됨). 이미지 고유
// 비율과 컨테이너 비율의 상대적 관계에 좌우되는 이 방식 대신, 이미지를
// 강제로 확대(scale)해 항상 여유분을 만들어준 뒤 그 안에서 이동
// (translate)하는 방식으로 교체 — 사용자가 요청한 "줌인해서 이동"과도
// 정확히 일치하고, 이제 이미지/컨테이너 비율과 무관하게 항상 보인다.
// 부모(TimelineCoverOverlay)가 이미 overflow-hidden이라 확대된 여유분이
// 밖으로 새지 않는다.
const PAN_KEYFRAMES = `
  @keyframes silo-cover-pan-x { 0% { transform: scale(1.15) translateX(-4%); } 100% { transform: scale(1.15) translateX(4%); } }
  @keyframes silo-cover-pan-y { 0% { transform: scale(1.15) translateY(-4%); } 100% { transform: scale(1.15) translateY(4%); } }
  .silo-cover-pan-x { animation: silo-cover-pan-x 18s ease-in-out infinite alternate; }
  .silo-cover-pan-y { animation: silo-cover-pan-y 18s ease-in-out infinite alternate; }
`;

function CoverBackground({
  urls,
  autoAdvanceSeconds,
  fit,
}: {
  urls: string[];
  autoAdvanceSeconds: number;
  fit: "cover" | "contain" | null;
}) {
  const [current, setCurrent] = useState(0);
  // HOTFIX-147.25: 어느 방향으로 패닝할지(가로/세로)는 그 이미지의 실제
  // 원본 비율을 봐야 알 수 있다 — URL만으로는 알 수 없어 로드 시
  // naturalWidth/naturalHeight를 재서 기억해둔다.
  const [orientations, setOrientations] = useState<Record<string, "landscape" | "portrait">>({});
  useEffect(() => {
    if (urls.length <= 1) return;
    const timer = setInterval(() => setCurrent((i) => (i + 1) % urls.length), Math.max(1, autoAdvanceSeconds) * 1000);
    return () => clearInterval(timer);
  }, [urls.length, autoAdvanceSeconds]);

  if (urls.length === 0) return <div className="absolute inset-0 bg-gray-900" />;
  // HOTFIX(사용자 신고 — "슬라이드 이미지가 전부 안보이고 잘려서 보여"):
  // 지금까지 object-cover 고정이라 이미지 비율이 표지 영역과 다르면 위/
  // 아래나 좌우가 크게 잘려 나갔다. "전체 보기"(contain)를 고르면 이미지가
  // 잘리지 않는 대신 남는 자리가 생기므로, 그 자리를 채울 배경(검정)을
  // 항상 깔아둔다 — object-contain만 쓰면 그 자리가 투명해져 바로 아래
  // TL3 콘텐츠가 비쳐 보인다.
  const effectiveFit = fit ?? "cover";
  return (
    <>
      <style>{PAN_KEYFRAMES}</style>
      {effectiveFit === "contain" && <div className="absolute inset-0 bg-black" />}
      {urls.map((url, i) => {
        const isVideo = /\.(mp4|webm|mov|m4v)(\?|#|$)/i.test(url);
        const fitClass = effectiveFit === "contain" ? "object-contain" : "object-cover";
        const panClass =
          effectiveFit === "cover" && !isVideo && orientations[url]
            ? orientations[url] === "landscape"
              ? "silo-cover-pan-x"
              : "silo-cover-pan-y"
            : "";
        const className = `absolute inset-0 h-full w-full ${fitClass} ${panClass} transition-opacity duration-700 ${i === current ? "opacity-100" : "opacity-0"}`;
        return isVideo ? (
          <video key={url + i} src={url} className={className} autoPlay muted loop playsInline />
        ) : (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            key={url + i}
            src={url}
            alt=""
            className={className}
            onLoad={(e) => {
              const { naturalWidth, naturalHeight } = e.currentTarget;
              setOrientations((prev) =>
                prev[url] ? prev : { ...prev, [url]: naturalWidth >= naturalHeight ? "landscape" : "portrait" },
              );
            }}
          />
        );
      })}
    </>
  );
}

function TimelineCoverOverlay({
  visible,
  top,
  height,
  text,
  description,
  fontSizePx,
  fontWeight,
  align,
  color,
  fontFamily,
  descriptionFontSizePx,
  descriptionFontWeight,
  descriptionAlign,
  descriptionColor,
  descriptionFontFamily,
  backgroundFit,
  slideUrls,
  autoAdvanceSeconds,
  position,
  mobilePosition,
  onTextCommit,
  onDescriptionCommit,
  onPositionChange,
  onMobilePositionChange,
}: {
  visible: boolean;
  top: number;
  height: number;
  text: string;
  description: string;
  fontSizePx: number;
  fontWeight: CoverFontWeight;
  align: CoverAlign;
  color: string;
  fontFamily: string;
  descriptionFontSizePx: number | null;
  descriptionFontWeight: CoverFontWeight | null;
  descriptionAlign: CoverAlign | null;
  descriptionColor: string | null;
  descriptionFontFamily: string | null;
  backgroundFit: "cover" | "contain" | null;
  slideUrls: string[];
  autoAdvanceSeconds: number;
  position: FreePosition;
  mobilePosition: FreePosition | null;
  onTextCommit: (next: string) => void;
  onDescriptionCommit: (next: string) => void;
  onPositionChange: (next: FreePosition) => void;
  onMobilePositionChange: (next: FreePosition) => void;
}) {
  const boxRef = useRef<HTMLDivElement>(null);
  const { style, className } = freePositionResponsiveAttrs(position, mobilePosition);
  useCustomFonts();

  // 설명 전용 스타일이 아직 커스터마이징 안 됐으면(null) 지금까지의 기본
  // 동작 그대로 제목 스타일에서 파생시킨다 — 기존 저장 데이터의 시각적
  // 회귀를 막는다.
  const descFontSizePx = descriptionFontSizePx ?? Math.round(fontSizePx * 0.5);
  const descFontWeight = descriptionFontWeight ?? "normal";
  const descAlign = descriptionAlign ?? align;
  const descColor = descriptionColor ?? color;
  const descFontFamily = descriptionFontFamily ?? fontFamily;

  // 사용자 신고(2026-08-27, 스크린샷 — "표지가 깜빡이듯 바로 사라지고 흰
  // 배경이 나온다"): opacity는 실제로 1이었지만 눈엔 하나도 안 보였다 —
  // `document.elementFromPoint()`로 직접 찍어보니 TL3 자체가 표지(title)
  // 슬라이드 텍스트를 그리는 `.tl-slide-content-container`에 자체
  // `z-index: 3`을 줘서(그 안의 `.tl-slider-touch-mask`는 25까지 감) 이
  // 오버레이(z-index 지정 없음=auto)를 그 위에서 완전히 덮고 있었다 — 이
  // 컴포넌트가 처음 만들어진 뒤로 실제 화면에서 opacity만 확인했지
  // "진짜로 맨 위에 그려지는지"는 한 번도 스크린샷/elementFromPoint로
  // 검증한 적이 없었다. TL3의 `.tl-storyslider` 내부에서 관측된 최댓값(25)을
  // 넉넉히 넘는 z-index를 명시해 항상 그 위에 그려지도록 한다.
  return (
    <div
      className="pointer-events-none absolute left-0 right-0 z-30 overflow-hidden transition-opacity duration-300"
      style={{ top, height, opacity: visible ? 1 : 0 }}
    >
      <div className="relative h-full w-full">
        <CoverBackground urls={slideUrls} autoAdvanceSeconds={autoAdvanceSeconds} fit={backgroundFit} />
        {/* 사용자 신고(2026-08-27 — "혁명~제국 페이지 윗부분이 짤려"): 자유
            배치(position.enabled)를 안 켜면 이 박스가 여백 없이 표지 영역의
            맨 위-왼쪽 모서리(0,0)에 그대로 붙어 렌더링됐다 — freePosition*
            헬퍼가 enabled=false일 때 `{ position: "relative" }` 말고는
            아무 스타일도 안 주기 때문(다른 블록들과 공유하는 범용 동작이라
            그 헬퍼 자체는 그대로 둠). 표지처럼 이미지 전체를 덮는 오버레이는
            여백 없이 모서리에 붙으면 화면 끝에 짤린 것처럼 보인다 — 자유
            배치를 안 쓸 때만 이 래퍼로 가운데 정렬 + 여백을 기본으로 준다. */}
        <div className={position.enabled ? "pointer-events-none" : "pointer-events-none flex h-full w-full flex-col items-center justify-center gap-2 px-8 py-10 text-center"}>
        <div
          ref={(dom) => { boxRef.current = dom; }}
          style={{ ...style, position: style.position ?? "absolute" }}
          className={`pointer-events-auto ${className}`}
        >
          <FreePositionHandles
            position={position}
            onChange={onPositionChange}
            anchorRef={boxRef}
            mobilePosition={mobilePosition}
            onMobileChange={onMobilePositionChange}
          />
          <EditableText
            as="p"
            value={text}
            onCommit={onTextCommit}
            className={`${COVER_WEIGHT_CLASS[fontWeight]} ${COVER_ALIGN_CLASS[align]}`}
            style={{ fontSize: fontSizePx, color, ...(fontFamily ? { fontFamily } : {}) }}
            placeholder="제목을 입력하세요"
          />
          {/* HOTFIX-147.18(사용자 지시 — "그 화면에 이미 있는 텍스트들을
              수정할 수 있기를 원해 <제목/설명>"): 제목 아래 이어지는 설명
              한 줄 — 같은 위치 상자 안에서 제목보다 작게(60%) 표시. */}
          <EditableText
            as="p"
            value={description}
            onCommit={onDescriptionCommit}
            className={`${COVER_WEIGHT_CLASS[descFontWeight]} ${COVER_ALIGN_CLASS[descAlign]}`}
            style={{ fontSize: descFontSizePx, color: descColor, ...(descFontFamily ? { fontFamily: descFontFamily } : {}) }}
            placeholder="설명을 입력하세요"
          />
        </div>
        </div>
      </div>
    </div>
  );
}

// HOTFIX-147.24(사용자 지시 — "'개별화면(이벤트) 자유편집'이 드롭다운으로
// 아래로 펼쳐지는 게 비효율적이다, 캔버스에서 그 이벤트 화면으로 이동하면
// 설정 패널이 자동으로 그 화면 설정을 보여주면 안 되냐"): 캔버스(타임라인
// 대시보드)에서 "지금 보고 있는 슬라이드"(coverState)는 지금까지 렌더
// 컴포넌트(SiloTimelineEmbedBlock)의 로컬 state였다 — 설정 패널
// (SiloTimelineEmbedSettings)은 같은 Craft 노드를 보지만 완전히 별개의
// React 컴포넌트 인스턴스라 이 값을 전혀 몰랐고, 그래서 관리자가 직접
// 드롭다운에서 이벤트를 하나하나 찾아 골라야 했다. 노드 id별로 이 값을
// 공유하는 아주 작은 외부 스토어 — DB에 저장할 필요 없는 순수 UI 상태라
// setProp/setCustom(둘 다 Craft 히스토리/직렬화에 얽힘) 대신 이 스토어를
// 쓴다.
const activeSlideListeners = new Map<string, Set<() => void>>();
const activeSlideStates = new Map<string, TimelineCoverState>();

function publishActiveSlide(nodeId: string, state: TimelineCoverState) {
  activeSlideStates.set(nodeId, state);
  activeSlideListeners.get(nodeId)?.forEach((fn) => fn());
}

function useActiveSlide(nodeId: string): TimelineCoverState {
  return useSyncExternalStore(
    (onStoreChange) => {
      let set = activeSlideListeners.get(nodeId);
      if (!set) {
        set = new Set();
        activeSlideListeners.set(nodeId, set);
      }
      set.add(onStoreChange);
      return () => set!.delete(onStoreChange);
    },
    () => activeSlideStates.get(nodeId) ?? null,
    () => null,
  );
}

export function SiloTimelineEmbedBlock({
  mode,
  boardId,
  groupHref,
  stageHeightPx,
  initialZoomFactor,
  motion = DEFAULT_MOTION,
  coverEnabled,
  coverText,
  coverDescription,
  coverFontSizePx,
  coverFontWeight,
  coverAlign,
  coverColor,
  coverFontFamily,
  coverDescriptionFontSizePx = null,
  coverDescriptionFontWeight = null,
  coverDescriptionAlign = null,
  coverDescriptionColor = null,
  coverDescriptionFontFamily = null,
  coverBackgroundFit = null,
  coverSlideUrls,
  coverAutoAdvanceSeconds,
  position = DEFAULT_FREE_POSITION,
  mobilePosition = null,
  eventOverlays = {},
}: SiloTimelineEmbedBlockProps) {
  const {
    id: nodeId,
    connectors: { connect },
    setProp,
  } = useNode();
  const ready = mode === "group" ? !!groupHref : !!boardId;
  const [coverState, setCoverState] = useState<TimelineCoverState>(null);

  // HOTFIX-147.24: 설정 패널이 이 노드의 coverState를 구독할 수 있도록 매번
  // 공유 스토어에도 반영한다(위 useActiveSlide 참고).
  useEffect(() => {
    publishActiveSlide(nodeId, coverState);
  }, [nodeId, coverState]);

  // HOTFIX-147.13: coverState는 이제 표지 전용 토글과 무관하게 항상
  // 추적한다 — 이벤트별 오버레이(eventOverlays)는 coverEnabled와 별개로
  // 켜고 끄므로, "지금 표지인지/어느 이벤트인지"는 표지 기능이 꺼져 있어도
  // 알아야 한다.
  const timelineEl =
    mode === "group" ? (
      <SiloTimeline
        groupHref={groupHref}
        stageHeightPx={stageHeightPx || undefined}
        initialZoomFactor={initialZoomFactor}
        onCoverStateChange={setCoverState}
      />
    ) : (
      <SiloTimeline
        boardId={boardId}
        stageHeightPx={stageHeightPx || undefined}
        initialZoomFactor={initialZoomFactor}
        onCoverStateChange={setCoverState}
      />
    );

  // 지금 보고 있는 슬라이드(표지 또는 특정 이벤트)에 적용할 설정을 고른다 —
  // 표지면 coverXxx 플랫 prop들을, 이벤트면 eventOverlays[그 id]를 쓴다.
  const activeConfig: SlideOverlayConfig | null = !coverState
    ? null
    : coverState.isTitle
      ? {
          enabled: coverEnabled,
          text: coverText,
          description: coverDescription,
          fontSizePx: coverFontSizePx,
          fontWeight: coverFontWeight,
          align: coverAlign,
          color: coverColor,
          fontFamily: coverFontFamily,
          descriptionFontSizePx: coverDescriptionFontSizePx,
          descriptionFontWeight: coverDescriptionFontWeight,
          descriptionAlign: coverDescriptionAlign,
          descriptionColor: coverDescriptionColor,
          descriptionFontFamily: coverDescriptionFontFamily,
          backgroundFit: coverBackgroundFit,
          slideUrls: coverSlideUrls,
          autoAdvanceSeconds: coverAutoAdvanceSeconds,
          position,
          mobilePosition,
        }
      : coverState.eventId
        ? (eventOverlays[coverState.eventId] ?? null)
        : null;

  function commitActiveConfig(patch: Partial<SlideOverlayConfig>) {
    if (!coverState) return;
    if (coverState.isTitle) {
      setProp((p) => {
        if ("text" in patch) p.coverText = patch.text!;
        if ("description" in patch) p.coverDescription = patch.description!;
        if ("position" in patch) p.position = patch.position!;
        if ("mobilePosition" in patch) p.mobilePosition = patch.mobilePosition!;
      });
    } else if (coverState.eventId) {
      const eventId = coverState.eventId;
      setProp((p) => {
        p.eventOverlays = {
          ...p.eventOverlays,
          [eventId]: { ...(p.eventOverlays[eventId] ?? DEFAULT_SLIDE_OVERLAY_CONFIG), ...patch },
        };
      });
    }
  }

  return (
    <div ref={(dom) => { if (dom) connect(dom); }}>
      <EditableBlockFrame label="사일로 타임라인 연동">
        <RevealWrapper motion={motion}>
          {!ready ? (
            <div className="flex h-24 items-center justify-center bg-gray-50 text-xs text-gray-400">
              우측 설정 패널에서 {mode === "group" ? "카테고리" : "게시판"}을 선택하세요
            </div>
          ) : (
            <div className="relative">
              {timelineEl}
              {coverState && activeConfig && (
                <TimelineCoverOverlay
                  visible={activeConfig.enabled}
                  top={coverState.top}
                  height={coverState.height}
                  text={activeConfig.text}
                  description={activeConfig.description}
                  fontSizePx={activeConfig.fontSizePx}
                  fontWeight={activeConfig.fontWeight}
                  align={activeConfig.align}
                  color={activeConfig.color}
                  fontFamily={activeConfig.fontFamily}
                  descriptionFontSizePx={activeConfig.descriptionFontSizePx}
                  descriptionFontWeight={activeConfig.descriptionFontWeight}
                  descriptionAlign={activeConfig.descriptionAlign}
                  descriptionColor={activeConfig.descriptionColor}
                  descriptionFontFamily={activeConfig.descriptionFontFamily}
                  backgroundFit={activeConfig.backgroundFit}
                  slideUrls={activeConfig.slideUrls}
                  autoAdvanceSeconds={activeConfig.autoAdvanceSeconds}
                  position={activeConfig.position}
                  mobilePosition={activeConfig.mobilePosition}
                  onTextCommit={(next) => commitActiveConfig({ text: next })}
                  onDescriptionCommit={(next) => commitActiveConfig({ description: next })}
                  onPositionChange={(next) => commitActiveConfig({ position: next })}
                  onMobilePositionChange={(next) => commitActiveConfig({ mobilePosition: next })}
                />
              )}
            </div>
          )}
        </RevealWrapper>
      </EditableBlockFrame>
    </div>
  );
}

type BoardOption = { id: string; name: string };
type NavOption = { href: string; title: string };
type EventOption = { id: string; headline: string };

// HOTFIX-147.13: 표지 설정 섹션과 이벤트별 설정 섹션이 정렬/굵기/크기/색상/
// 폰트/배경 슬라이드/자동전환 간격 필드를 완전히 동일하게 반복하므로 하나로
// 뽑아 공유한다. 위치(자유 배치)만 FreePositionSettingsSection과 별개인
// SlideOverlayPositionFields(아래)로 다시 나눈다 — 그 컴포넌트는 항상
// "지금 선택된 노드의 최상위 position"만 읽고 쓰게 고정돼 있어(다른 6개
// 자유배치 블록과 공유하는 계약) eventOverlays처럼 맵 안에 중첩된 위치에는
// 못 쓴다.
function SlideOverlayFieldsEditor({
  value,
  onChange,
  editable,
}: {
  value: SlideOverlayConfig;
  onChange: (patch: Partial<SlideOverlayConfig>) => void;
  editable: boolean;
}) {
  return (
    <>
      {/* HOTFIX-147.18(사용자 지시 — "'표지에 보여줄 텍스트를 입력하세요'
          라는 문구가 있는데 craft에는 텍스트를 입력하는데가 없네" +
          "그 화면에 이미 있는 텍스트들을 수정할 수 있기를 원해
          <제목/설명>"): 지금까지 제목/설명은 캔버스에서 더블클릭해야만
          고칠 수 있었다(EditableText) — 그 자체는 되지만 설정 패널에서
          찾을 방법이 없었다는 신고라, 여기 직접 입력창을 추가한다. */}
      <label className="block text-xs text-gray-600">
        제목
        <textarea
          value={value.text}
          onChange={(e) => onChange({ text: e.target.value })}
          rows={2}
          placeholder="표지/이 화면에 보여줄 제목"
          className="mt-1 w-full rounded border border-gray-300 px-2 py-1 text-xs"
        />
      </label>
      <label className="block text-xs text-gray-600">
        설명
        <textarea
          value={value.description}
          onChange={(e) => onChange({ description: e.target.value })}
          rows={2}
          placeholder="제목 아래 보여줄 설명(선택)"
          className="mt-1 w-full rounded border border-gray-300 px-2 py-1 text-xs"
        />
      </label>
      {/* HOTFIX(사용자 지시 — "'Ancient Monarchy'를 위한 텍스트 설정,
          '고대~왕정'을 위한 텍스트 설정이 달라야 해"): 지금까지 정렬/굵기/
          크기/색상/폰트가 제목·설명 구분 없이 하나로 공유됐다 — "제목
          스타일"/"설명 스타일" 두 섹션으로 나눈다. 설명 섹션은 아직
          커스터마이징 안 했으면(null) 지금까지의 기본 동작(제목에서
          파생된 값)을 그대로 보여줘, 무엇이 실제로 적용 중인지 바로
          알 수 있게 한다 — 값을 바꾸는 순간부터 제목과 독립적으로
          저장된다. */}
      <div className="space-y-2 rounded border border-gray-200 p-2">
        <h4 className="text-xs font-semibold text-gray-500">제목 스타일</h4>
        <label className="block text-xs text-gray-600">
          정렬
          <select
            value={value.align}
            onChange={(e) => onChange({ align: e.target.value as CoverAlign })}
            className="mt-1 w-full rounded border border-gray-300 px-2 py-1 text-xs"
          >
            <option value="left">왼쪽</option>
            <option value="center">가운데</option>
            <option value="right">오른쪽</option>
          </select>
        </label>
        <label className="block text-xs text-gray-600">
          굵기
          <select
            value={value.fontWeight}
            onChange={(e) => onChange({ fontWeight: e.target.value as CoverFontWeight })}
            className="mt-1 w-full rounded border border-gray-300 px-2 py-1 text-xs"
          >
            <option value="normal">보통</option>
            <option value="medium">중간</option>
            <option value="semibold">약간 굵게</option>
            <option value="bold">굵게</option>
          </select>
        </label>
        <label className="block text-xs text-gray-600">
          크기(px)
          <input
            type="number"
            min={8}
            value={value.fontSizePx}
            onChange={(e) => onChange({ fontSizePx: Number(e.target.value) || 16 })}
            className="mt-1 w-full rounded border border-gray-300 px-2 py-1 text-xs"
          />
        </label>
        <label className="block text-xs text-gray-600">
          색상
          <div className="mt-1 flex items-center gap-1.5">
            <input
              type="color"
              value={/^#[0-9a-fA-F]{6}$/.test(value.color) ? value.color : "#ffffff"}
              onChange={(e) => onChange({ color: e.target.value })}
              className="h-7 w-9 shrink-0 cursor-pointer rounded border border-gray-300 p-0.5"
            />
            <input
              type="text"
              value={value.color}
              placeholder="#ffffff"
              onChange={(e) => onChange({ color: e.target.value })}
              className="w-full rounded border border-gray-300 px-2 py-1 text-xs"
            />
          </div>
        </label>
        <FontPicker label="폰트" value={value.fontFamily} onChange={(fontFamily) => onChange({ fontFamily })} />
      </div>
      <div className="space-y-2 rounded border border-gray-200 p-2">
        <h4 className="text-xs font-semibold text-gray-500">설명 스타일</h4>
        <label className="block text-xs text-gray-600">
          정렬
          <select
            value={value.descriptionAlign ?? value.align}
            onChange={(e) => onChange({ descriptionAlign: e.target.value as CoverAlign })}
            className="mt-1 w-full rounded border border-gray-300 px-2 py-1 text-xs"
          >
            <option value="left">왼쪽</option>
            <option value="center">가운데</option>
            <option value="right">오른쪽</option>
          </select>
        </label>
        <label className="block text-xs text-gray-600">
          굵기
          <select
            value={value.descriptionFontWeight ?? "normal"}
            onChange={(e) => onChange({ descriptionFontWeight: e.target.value as CoverFontWeight })}
            className="mt-1 w-full rounded border border-gray-300 px-2 py-1 text-xs"
          >
            <option value="normal">보통</option>
            <option value="medium">중간</option>
            <option value="semibold">약간 굵게</option>
            <option value="bold">굵게</option>
          </select>
        </label>
        <label className="block text-xs text-gray-600">
          크기(px)
          <input
            type="number"
            min={8}
            value={value.descriptionFontSizePx ?? Math.round(value.fontSizePx * 0.5)}
            onChange={(e) => onChange({ descriptionFontSizePx: Number(e.target.value) || 16 })}
            className="mt-1 w-full rounded border border-gray-300 px-2 py-1 text-xs"
          />
        </label>
        <label className="block text-xs text-gray-600">
          색상
          <div className="mt-1 flex items-center gap-1.5">
            <input
              type="color"
              value={/^#[0-9a-fA-F]{6}$/.test(value.descriptionColor ?? "") ? value.descriptionColor! : (/^#[0-9a-fA-F]{6}$/.test(value.color) ? value.color : "#ffffff")}
              onChange={(e) => onChange({ descriptionColor: e.target.value })}
              className="h-7 w-9 shrink-0 cursor-pointer rounded border border-gray-300 p-0.5"
            />
            <input
              type="text"
              value={value.descriptionColor ?? value.color}
              placeholder="#ffffff"
              onChange={(e) => onChange({ descriptionColor: e.target.value })}
              className="w-full rounded border border-gray-300 px-2 py-1 text-xs"
            />
          </div>
        </label>
        <FontPicker
          label="폰트"
          value={value.descriptionFontFamily ?? value.fontFamily}
          onChange={(descriptionFontFamily) => onChange({ descriptionFontFamily })}
        />
      </div>
      {/* HOTFIX(사용자 신고 — "슬라이드 이미지가 전부 안보이고 잘려서 보여"):
          지금까지 배경 슬라이드가 항상 꽉 채우기(object-cover)로만 그려져
          이미지 비율이 표지 영역과 다르면 위아래/좌우가 크게 잘려 나갔다 —
          "전체 보기"를 고르면 잘리지 않는 대신 남는 자리에 검정 배경이
          채워진다. */}
      <label className="block text-xs text-gray-600">
        배경 이미지 채우기 방식
        <select
          value={value.backgroundFit ?? "cover"}
          onChange={(e) => onChange({ backgroundFit: e.target.value as "cover" | "contain" })}
          className="mt-1 w-full rounded border border-gray-300 px-2 py-1 text-xs"
        >
          <option value="cover">꽉 채우기(비율에 따라 일부 잘릴 수 있음)</option>
          <option value="contain">전체 보기(잘리지 않음, 남는 자리는 검정 배경)</option>
        </select>
      </label>
      <label className="block text-xs text-gray-600">
        배경 자동 전환 간격(초)
        <input
          type="number"
          min={1}
          value={value.autoAdvanceSeconds}
          onChange={(e) => onChange({ autoAdvanceSeconds: Number(e.target.value) || 5 })}
          className="mt-1 w-full rounded border border-gray-300 px-2 py-1 text-xs"
        />
      </label>
      <div>
        <h4 className="mb-1.5 text-xs font-semibold text-gray-500">배경 슬라이드 ({value.slideUrls.length})</h4>
        <div className="space-y-1.5">
          {value.slideUrls.map((url, i) => (
            <div key={url + i} className="flex items-center gap-1.5">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={url} alt="" className="h-8 w-8 flex-shrink-0 rounded object-cover" />
              <span className="flex-1 truncate text-[10px] text-gray-400">{url}</span>
              <button
                type="button"
                onClick={() => onChange({ slideUrls: value.slideUrls.filter((_, idx) => idx !== i) })}
                className="text-[10px] text-red-500 hover:underline"
              >
                삭제
              </button>
            </div>
          ))}
        </div>
        <label className="mt-1.5 block w-full rounded border border-dashed border-gray-300 py-1.5 text-center text-xs text-gray-500 hover:border-gray-400">
          + 배경 이미지/영상 추가
          <input
            type="file"
            accept="image/*,video/*"
            className="hidden"
            disabled={!editable}
            onChange={async (e) => {
              const file = e.target.files?.[0];
              if (!file) return;
              const { url, error } = await uploadFile(file, "post-images", "craft-timeline-cover");
              if (!error && url) onChange({ slideUrls: [...value.slideUrls, url] });
            }}
          />
        </label>
      </div>
    </>
  );
}

// HOTFIX-147.13: FreePositionSettingsSection과 같은 필드 레이아웃이지만,
// node.data.props의 고정된 최상위 position이 아니라 임의의 position/
// mobilePosition 쌍을 받아 편집한다(eventOverlays[id].position처럼 중첩된
// 값도 다룰 수 있도록).
function SlideOverlayPositionFields({
  position,
  mobilePosition,
  onChange,
  onMobileChange,
}: {
  position: FreePosition;
  mobilePosition: FreePosition | null;
  onChange: (next: FreePosition) => void;
  onMobileChange: (next: FreePosition | null) => void;
}) {
  const deviceMode = useDeviceMode();
  const editingMobile = deviceMode === "mobile";
  const effective = editingMobile ? (mobilePosition ?? position) : position;

  function update(patch: Partial<FreePosition>) {
    if (editingMobile) onMobileChange({ ...effective, ...patch });
    else onChange({ ...effective, ...patch });
  }

  return (
    <div className="space-y-2 border-t border-gray-200 pt-3">
      <h4 className="text-xs font-semibold text-gray-500">자유 배치(콜라주)</h4>
      {editingMobile && (
        <div className="rounded border border-blue-200 bg-blue-50 p-2 text-[10px] leading-relaxed text-blue-700">
          지금 모바일 모드 — 여기서 드래그/입력하면 모바일 전용 위치가 따로 저장돼요(PC 위치는 그대로 유지).
          {mobilePosition && (
            <button type="button" onClick={() => onMobileChange(null)} className="ml-1 underline">
              PC와 동일하게 되돌리기
            </button>
          )}
        </div>
      )}
      <div className="grid grid-cols-2 gap-2">
        <label className="text-xs text-gray-600">
          X(%)
          <input
            type="number"
            value={Math.round(effective.xPct)}
            onChange={(e) => { if (e.target.value !== "" && Number.isFinite(e.target.valueAsNumber)) update({ xPct: e.target.valueAsNumber }); }}
            className="mt-1 w-full rounded border border-gray-300 px-2 py-1 text-xs"
          />
        </label>
        <label className="text-xs text-gray-600">
          Y(%)
          <input
            type="number"
            value={Math.round(effective.yPct)}
            onChange={(e) => { if (e.target.value !== "" && Number.isFinite(e.target.valueAsNumber)) update({ yPct: e.target.valueAsNumber }); }}
            className="mt-1 w-full rounded border border-gray-300 px-2 py-1 text-xs"
          />
        </label>
        <label className="text-xs text-gray-600">
          너비(%)
          <input
            type="number"
            value={Math.round(effective.widthPct)}
            onChange={(e) => { if (e.target.value !== "" && Number.isFinite(e.target.valueAsNumber)) update({ widthPct: e.target.valueAsNumber }); }}
            className="mt-1 w-full rounded border border-gray-300 px-2 py-1 text-xs"
          />
        </label>
        <label className="text-xs text-gray-600">
          높이(%)
          <input
            type="number"
            value={Math.round(effective.heightPct)}
            onChange={(e) => { if (e.target.value !== "" && Number.isFinite(e.target.valueAsNumber)) update({ heightPct: e.target.valueAsNumber }); }}
            className="mt-1 w-full rounded border border-gray-300 px-2 py-1 text-xs"
          />
        </label>
      </div>
      <label className="block text-xs text-gray-600">
        겹침 순서(z-index, 클수록 위)
        <input
          type="number"
          value={effective.zIndex}
          onChange={(e) => { if (e.target.value !== "" && Number.isFinite(e.target.valueAsNumber)) update({ zIndex: e.target.valueAsNumber }); }}
          className="mt-1 w-full rounded border border-gray-300 px-2 py-1 text-xs"
        />
      </label>
    </div>
  );
}

function SiloTimelineEmbedSettings() {
  const { id: nodeId, props, setProp } = useNode((node) => ({ props: node.data.props as SiloTimelineEmbedBlockProps }));
  const editable = useCraftEditable();
  const [boards, setBoards] = useState<BoardOption[]>([]);
  const [navGroups, setNavGroups] = useState<NavOption[]>([]);
  // HOTFIX-147.13: "화면 자유편집" 헤드라인 표시용 이벤트 목록 — 표지 설정과
  // 똑같은 /api/timeline/events를 그대로 불러 unique_id+headline만 뽑는다
  // (새 API를 안 만들고 이미 검증된 데이터 소스를 재사용).
  const [eventOptions, setEventOptions] = useState<EventOption[]>([]);
  // HOTFIX-147.24: 이벤트를 드롭다운에서 직접 고르는 대신, 캔버스(타임라인
  // 대시보드)에서 지금 실제로 보고 있는 화면을 그대로 따라간다.
  const activeSlide = useActiveSlide(nodeId);

  useEffect(() => {
    if (!editable) return;
    fetch("/api/boards")
      .then((res) => res.json())
      .then((data) => setBoards(Array.isArray(data) ? data : []))
      .catch(() => setBoards([]));
    // 자식이 있는 site_navigations 노드만 "카테고리 그룹" 후보로 보여준다 —
    // 게시판 하나짜리 leaf가 아니라 여러 하위 게시판을 묶는 branch만 의미가 있다.
    supabase
      .from("site_navigations")
      .select("id, parent_id, href, title")
      .then(({ data }) => {
        const rows = (data ?? []) as { id: string; parent_id: string | null; href: string | null; title: string }[];
        const parentIds = new Set(rows.map((r) => r.parent_id).filter(Boolean));
        setNavGroups(
          rows
            .filter((r) => parentIds.has(r.id) && r.href)
            .map((r) => ({ href: r.href as string, title: r.title })),
        );
      });
  }, [editable]);

  useEffect(() => {
    if (!editable) return;
    const ready = props.mode === "group" ? !!props.groupHref : !!props.boardId;
    if (!ready) {
      setEventOptions([]);
      return;
    }
    const url =
      props.mode === "group"
        ? `/api/timeline/events?group=${encodeURIComponent(props.groupHref)}`
        : `/api/timeline/events?board=${encodeURIComponent(props.boardId)}`;
    let cancelled = false;
    fetch(url)
      .then((res) => res.json())
      .then((data) => {
        if (cancelled) return;
        const events = Array.isArray(data?.events) ? data.events : [];
        setEventOptions(
          events
            .map((e: { unique_id?: string; text?: { headline?: string } }) => ({
              id: e.unique_id ?? "",
              headline: e.text?.headline || e.unique_id || "",
            }))
            .filter((e: EventOption) => e.id),
        );
      })
      .catch(() => {
        if (!cancelled) setEventOptions([]);
      });
    return () => {
      cancelled = true;
    };
  }, [editable, props.mode, props.groupHref, props.boardId]);

  return (
    <div className="space-y-3">
      <label className="block text-xs text-gray-600">
        모드
        <select
          value={props.mode}
          onChange={(e) => setProp((p) => { p.mode = e.target.value as SiloTimelineEmbedBlockProps["mode"]; })}
          className="mt-1 w-full rounded border border-gray-300 px-2 py-1 text-xs"
        >
          <option value="board">게시판 하나</option>
          <option value="group">카테고리(하위 게시판 전부 모아서)</option>
        </select>
      </label>

      {props.mode === "board" ? (
        <label className="block text-xs text-gray-600">
          게시판
          <select
            value={props.boardId}
            onChange={(e) => setProp((p) => { p.boardId = e.target.value; })}
            className="mt-1 w-full rounded border border-gray-300 px-2 py-1 text-xs"
          >
            <option value="">선택 안 함</option>
            {boards.map((board) => (
              <option key={board.id} value={board.id}>
                {board.name}
              </option>
            ))}
          </select>
        </label>
      ) : (
        <label className="block text-xs text-gray-600">
          카테고리
          <select
            value={props.groupHref}
            onChange={(e) => setProp((p) => { p.groupHref = e.target.value; })}
            className="mt-1 w-full rounded border border-gray-300 px-2 py-1 text-xs"
          >
            <option value="">선택 안 함</option>
            {navGroups.map((g) => (
              <option key={g.href} value={g.href}>
                {g.title}
              </option>
            ))}
          </select>
        </label>
      )}

      <label className="block text-xs text-gray-600">
        슬라이드 영역 높이(px, 비우면 자동)
        <input
          type="number"
          min={300}
          max={1200}
          value={props.stageHeightPx || ""}
          placeholder="자동"
          onChange={(e) => setProp((p) => { p.stageHeightPx = Number(e.target.value) || 0; })}
          className="mt-1 w-full rounded border border-gray-300 px-2 py-1 text-xs"
        />
      </label>

      {/* HOTFIX-147.19(사용자 지시 — "대시보드가 전체를 한눈에 볼 수
          없도록 줌인되어있다, 조절할 수 있는 기능을 넣고 전체를 한눈에
          볼 수 있도록 줌을 조절해달라"): TL3 공식 zoom_sequence 값
          (Fibonacci 수열, TL3 자체가 정해둔 이산 단계라 자유 입력 대신
          이 목록에서만 고르게 한다 — 아무 값이나 넣으면 TL3가 어차피
          이 목록에서 가장 가까운 값으로 스냅함)만 보여준다. */}
      <label className="block text-xs text-gray-600">
        처음 열었을 때 확대 배율(낮을수록 더 넓게/전체가 보임)
        <select
          value={props.initialZoomFactor || 0.5}
          onChange={(e) => setProp((p) => { p.initialZoomFactor = Number(e.target.value); })}
          className="mt-1 w-full rounded border border-gray-300 px-2 py-1 text-xs"
        >
          {ZOOM_SEQUENCE.map((z) => (
            <option key={z} value={z}>
              {z}배{z === 0.5 ? " (기본값, 전체가 한눈에 보임)" : ""}
            </option>
          ))}
        </select>
      </label>

      {/* HOTFIX-147.24(사용자 지시 — "'개별화면(이벤트) 자유편집'이 드롭다운
          으로 아래로 펼쳐지는 게 비효율적이다, 캔버스에서 그 이벤트 화면으로
          이동하면 설정 패널이 자동으로 그 화면 설정을 보여주면 안 되냐"):
          "표지 자유편집"(항상 노출)과 "개별 화면 자유편집"(드롭다운으로
          이벤트를 하나 찾아 골라야 그 아래로 폼이 펼쳐짐)이 따로 있던 것을,
          캔버스에서 지금 실제로 보고 있는 화면(표지 또는 특정 이벤트)을
          그대로 따라가는 단일 섹션으로 통합 — 캔버스에서 다른 화면을 클릭해
          이동하면 이 패널도 자동으로 그 화면 설정으로 전환된다(긴 드롭다운을
          뒤질 필요 없음). */}
      <div className="space-y-2 border-t border-gray-200 pt-3">
        <h4 className="text-xs font-semibold text-gray-500">지금 보고 있는 화면 자유 편집</h4>
        {!activeSlide ? (
          <p className="text-[10px] leading-relaxed text-gray-500">
            캔버스의 타임라인이 로드되면, 지금 보고 있는 화면(표지 또는 이벤트)의 설정이 여기 나타나요.
          </p>
        ) : activeSlide.isTitle ? (
          <>
            <p className="text-[10px] leading-relaxed text-gray-500">
              지금 표지(첫 화면)를 보고 있어요 — 캔버스에서 다른 역사적 사실을 클릭하면 그 화면의 설정으로 자동 전환돼요.
            </p>
            <label className="flex items-center gap-2 text-xs text-gray-700">
              <input
                type="checkbox"
                checked={props.coverEnabled}
                onChange={(e) => setProp((p) => { p.coverEnabled = e.target.checked; })}
              />
              이 화면에 자유 편집 켜기
            </label>
            {props.coverEnabled && (
              <>
                <SlideOverlayFieldsEditor
                  editable={editable}
                  value={{
                    enabled: props.coverEnabled,
                    text: props.coverText,
                    description: props.coverDescription,
                    fontSizePx: props.coverFontSizePx,
                    fontWeight: props.coverFontWeight,
                    align: props.coverAlign,
                    color: props.coverColor,
                    fontFamily: props.coverFontFamily,
                    descriptionFontSizePx: props.coverDescriptionFontSizePx,
                    descriptionFontWeight: props.coverDescriptionFontWeight,
                    descriptionAlign: props.coverDescriptionAlign,
                    descriptionColor: props.coverDescriptionColor,
                    descriptionFontFamily: props.coverDescriptionFontFamily,
                    backgroundFit: props.coverBackgroundFit,
                    slideUrls: props.coverSlideUrls,
                    autoAdvanceSeconds: props.coverAutoAdvanceSeconds,
                    position: props.position,
                    mobilePosition: props.mobilePosition,
                  }}
                  onChange={(patch) =>
                    setProp((p) => {
                      if ("text" in patch) p.coverText = patch.text!;
                      if ("description" in patch) p.coverDescription = patch.description!;
                      if ("fontSizePx" in patch) p.coverFontSizePx = patch.fontSizePx!;
                      if ("fontWeight" in patch) p.coverFontWeight = patch.fontWeight!;
                      if ("align" in patch) p.coverAlign = patch.align!;
                      if ("color" in patch) p.coverColor = patch.color!;
                      if ("fontFamily" in patch) p.coverFontFamily = patch.fontFamily!;
                      if ("descriptionFontSizePx" in patch) p.coverDescriptionFontSizePx = patch.descriptionFontSizePx!;
                      if ("descriptionFontWeight" in patch) p.coverDescriptionFontWeight = patch.descriptionFontWeight!;
                      if ("descriptionAlign" in patch) p.coverDescriptionAlign = patch.descriptionAlign!;
                      if ("descriptionColor" in patch) p.coverDescriptionColor = patch.descriptionColor!;
                      if ("descriptionFontFamily" in patch) p.coverDescriptionFontFamily = patch.descriptionFontFamily!;
                      if ("backgroundFit" in patch) p.coverBackgroundFit = patch.backgroundFit!;
                      if ("slideUrls" in patch) p.coverSlideUrls = patch.slideUrls!;
                      if ("autoAdvanceSeconds" in patch) p.coverAutoAdvanceSeconds = patch.autoAdvanceSeconds!;
                    })
                  }
                />
                <FreePositionSettingsSection supportsMobileOverride />
              </>
            )}
          </>
        ) : activeSlide.eventId ? (
          (() => {
            const eventId = activeSlide.eventId;
            const headline = eventOptions.find((ev) => ev.id === eventId)?.headline ?? eventId;
            const cfg = props.eventOverlays[eventId] ?? DEFAULT_SLIDE_OVERLAY_CONFIG;
            function updateEvent(patch: Partial<SlideOverlayConfig>) {
              setProp((p) => {
                p.eventOverlays = {
                  ...p.eventOverlays,
                  [eventId]: { ...(p.eventOverlays[eventId] ?? DEFAULT_SLIDE_OVERLAY_CONFIG), ...patch },
                };
              });
            }
            return (
              <>
                <p className="text-[10px] leading-relaxed text-gray-500">
                  지금 &ldquo;{headline}&rdquo; 화면을 보고 있어요 — 캔버스에서 다른 화면을 클릭하면 그 화면의 설정으로 자동 전환돼요.
                </p>
                <label className="flex items-center gap-2 text-xs text-gray-700">
                  <input type="checkbox" checked={cfg.enabled} onChange={(e) => updateEvent({ enabled: e.target.checked })} />
                  이 화면에 자유 편집 켜기
                </label>
                {cfg.enabled && (
                  <>
                    <SlideOverlayFieldsEditor value={cfg} onChange={updateEvent} editable={editable} />
                    <SlideOverlayPositionFields
                      position={cfg.position}
                      mobilePosition={cfg.mobilePosition}
                      onChange={(next) => updateEvent({ position: next })}
                      onMobileChange={(next) => updateEvent({ mobilePosition: next })}
                    />
                  </>
                )}
              </>
            );
          })()
        ) : null}
      </div>

      <MotionSettingsSection />
    </div>
  );
}

SiloTimelineEmbedBlock.craft = {
  displayName: "SiloTimelineEmbedBlock",
  props: {
    mode: "board",
    boardId: "",
    groupHref: "",
    stageHeightPx: 0,
    initialZoomFactor: 0.5,
    motion: DEFAULT_MOTION,
    coverEnabled: false,
    coverText: "",
    coverDescription: "",
    coverFontSizePx: 40,
    coverFontWeight: "bold",
    coverAlign: "center",
    coverColor: "#ffffff",
    coverFontFamily: "",
    coverDescriptionFontSizePx: null,
    coverDescriptionFontWeight: null,
    coverDescriptionAlign: null,
    coverDescriptionColor: null,
    coverDescriptionFontFamily: null,
    coverBackgroundFit: null,
    coverSlideUrls: [],
    coverAutoAdvanceSeconds: 5,
    position: DEFAULT_FREE_POSITION,
    mobilePosition: null,
    eventOverlays: {},
  } satisfies SiloTimelineEmbedBlockProps,
  related: { settings: SiloTimelineEmbedSettings },
};
