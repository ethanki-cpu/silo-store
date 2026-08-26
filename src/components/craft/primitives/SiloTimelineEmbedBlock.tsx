"use client";

// HOTFIX-147.3(사용자 지시 — 온라인 도슨트 2단계 카테고리 페이지(혁명~제국
// 등)에도 클래식 타임라인을 넣고, Craft 에디터로 자유롭게 편집할 수 있게
// 해달라는 요청): 이미 있는 TimelineEmbedBlock(AlternatingTimelineCanvas,
// 손으로 스타일링한 zig-zag 카드형)과는 다른 블록이다 — 이건 실제
// TimelineJS3(SiloTimeline, EPIC-147) 위젯을 그대로 Craft 캔버스에 꽂는다.
// 게시판 하나(mode="board")뿐 아니라, site_navigations의 한 branch(href)
// 아래 모든 하위 게시판 글을 한 타임라인에 모으는 집계 모드(mode="group")도
// 지원한다 — 온라인 도슨트 2단계 카테고리 페이지가 이 모드를 쓴다.
import { useEffect, useRef, useState } from "react";
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
  fontSizePx: number;
  fontWeight: CoverFontWeight;
  align: CoverAlign;
  color: string;
  fontFamily: string;
  slideUrls: string[];
  autoAdvanceSeconds: number;
  position: FreePosition;
  mobilePosition: FreePosition | null;
};

export const DEFAULT_SLIDE_OVERLAY_CONFIG: SlideOverlayConfig = {
  enabled: false,
  text: "",
  fontSizePx: 40,
  fontWeight: "bold",
  align: "center",
  color: "#ffffff",
  fontFamily: "",
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
  coverFontSizePx: number;
  coverFontWeight: CoverFontWeight;
  coverAlign: CoverAlign;
  coverColor: string;
  coverFontFamily: string;
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
function CoverBackground({ urls, autoAdvanceSeconds }: { urls: string[]; autoAdvanceSeconds: number }) {
  const [current, setCurrent] = useState(0);
  useEffect(() => {
    if (urls.length <= 1) return;
    const timer = setInterval(() => setCurrent((i) => (i + 1) % urls.length), Math.max(1, autoAdvanceSeconds) * 1000);
    return () => clearInterval(timer);
  }, [urls.length, autoAdvanceSeconds]);

  if (urls.length === 0) return <div className="absolute inset-0 bg-gray-900" />;
  return (
    <>
      {urls.map((url, i) => {
        const isVideo = /\.(mp4|webm|mov|m4v)(\?|#|$)/i.test(url);
        const className = `absolute inset-0 h-full w-full object-cover transition-opacity duration-700 ${i === current ? "opacity-100" : "opacity-0"}`;
        return isVideo ? (
          <video key={url + i} src={url} className={className} autoPlay muted loop playsInline />
        ) : (
          // eslint-disable-next-line @next/next/no-img-element
          <img key={url + i} src={url} alt="" className={className} />
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
  fontSizePx,
  fontWeight,
  align,
  color,
  fontFamily,
  slideUrls,
  autoAdvanceSeconds,
  position,
  mobilePosition,
  onTextCommit,
  onPositionChange,
  onMobilePositionChange,
}: {
  visible: boolean;
  top: number;
  height: number;
  text: string;
  fontSizePx: number;
  fontWeight: CoverFontWeight;
  align: CoverAlign;
  color: string;
  fontFamily: string;
  slideUrls: string[];
  autoAdvanceSeconds: number;
  position: FreePosition;
  mobilePosition: FreePosition | null;
  onTextCommit: (next: string) => void;
  onPositionChange: (next: FreePosition) => void;
  onMobilePositionChange: (next: FreePosition) => void;
}) {
  const boxRef = useRef<HTMLDivElement>(null);
  const { style, className } = freePositionResponsiveAttrs(position, mobilePosition);
  useCustomFonts();

  return (
    <div
      className="pointer-events-none absolute left-0 right-0 overflow-hidden transition-opacity duration-300"
      style={{ top, height, opacity: visible ? 1 : 0 }}
    >
      <div className="relative h-full w-full">
        <CoverBackground urls={slideUrls} autoAdvanceSeconds={autoAdvanceSeconds} />
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
            placeholder="표지에 보여줄 텍스트를 입력하세요"
          />
        </div>
      </div>
    </div>
  );
}

export function SiloTimelineEmbedBlock({
  mode,
  boardId,
  groupHref,
  stageHeightPx,
  motion = DEFAULT_MOTION,
  coverEnabled,
  coverText,
  coverFontSizePx,
  coverFontWeight,
  coverAlign,
  coverColor,
  coverFontFamily,
  coverSlideUrls,
  coverAutoAdvanceSeconds,
  position = DEFAULT_FREE_POSITION,
  mobilePosition = null,
  eventOverlays = {},
}: SiloTimelineEmbedBlockProps) {
  const {
    connectors: { connect },
    setProp,
  } = useNode();
  const ready = mode === "group" ? !!groupHref : !!boardId;
  const [coverState, setCoverState] = useState<TimelineCoverState>(null);

  // HOTFIX-147.13: coverState는 이제 표지 전용 토글과 무관하게 항상
  // 추적한다 — 이벤트별 오버레이(eventOverlays)는 coverEnabled와 별개로
  // 켜고 끄므로, "지금 표지인지/어느 이벤트인지"는 표지 기능이 꺼져 있어도
  // 알아야 한다.
  const timelineEl =
    mode === "group" ? (
      <SiloTimeline groupHref={groupHref} stageHeightPx={stageHeightPx || undefined} onCoverStateChange={setCoverState} />
    ) : (
      <SiloTimeline boardId={boardId} stageHeightPx={stageHeightPx || undefined} onCoverStateChange={setCoverState} />
    );

  // 지금 보고 있는 슬라이드(표지 또는 특정 이벤트)에 적용할 설정을 고른다 —
  // 표지면 coverXxx 플랫 prop들을, 이벤트면 eventOverlays[그 id]를 쓴다.
  const activeConfig: SlideOverlayConfig | null = !coverState
    ? null
    : coverState.isTitle
      ? {
          enabled: coverEnabled,
          text: coverText,
          fontSizePx: coverFontSizePx,
          fontWeight: coverFontWeight,
          align: coverAlign,
          color: coverColor,
          fontFamily: coverFontFamily,
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
                  fontSizePx={activeConfig.fontSizePx}
                  fontWeight={activeConfig.fontWeight}
                  align={activeConfig.align}
                  color={activeConfig.color}
                  fontFamily={activeConfig.fontFamily}
                  slideUrls={activeConfig.slideUrls}
                  autoAdvanceSeconds={activeConfig.autoAdvanceSeconds}
                  position={activeConfig.position}
                  mobilePosition={activeConfig.mobilePosition}
                  onTextCommit={(next) => commitActiveConfig({ text: next })}
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
  const { props, setProp } = useNode((node) => ({ props: node.data.props as SiloTimelineEmbedBlockProps }));
  const editable = useCraftEditable();
  const [boards, setBoards] = useState<BoardOption[]>([]);
  const [navGroups, setNavGroups] = useState<NavOption[]>([]);
  // HOTFIX-147.13: "개별 화면 자유편집" 대상 이벤트 목록 — 표지 설정과
  // 똑같은 /api/timeline/events를 그대로 불러 unique_id+headline만 뽑는다
  // (새 API를 안 만들고 이미 검증된 데이터 소스를 재사용).
  const [eventOptions, setEventOptions] = useState<EventOption[]>([]);
  const [selectedEventId, setSelectedEventId] = useState("");

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

      <div className="space-y-2 border-t border-gray-200 pt-3">
        <label className="flex items-center gap-2 text-xs text-gray-700">
          <input
            type="checkbox"
            checked={props.coverEnabled}
            onChange={(e) => setProp((p) => { p.coverEnabled = e.target.checked; })}
          />
          표지(첫 화면) 자유 편집 — 텍스트/배경을 직접 꾸미기
        </label>
        {props.coverEnabled && (
          <>
            <p className="text-[10px] leading-relaxed text-gray-500">
              캔버스에서 표지 텍스트를 더블클릭하면 바로 고칠 수 있어요. 다른
              역사적 사실을 클릭하면 이 표지는 사라지고 그 이벤트 화면이
              보여요 — 대시보드에서 되돌아오면 다시 나타납니다.
            </p>
            <SlideOverlayFieldsEditor
              editable={editable}
              value={{
                enabled: props.coverEnabled,
                text: props.coverText,
                fontSizePx: props.coverFontSizePx,
                fontWeight: props.coverFontWeight,
                align: props.coverAlign,
                color: props.coverColor,
                fontFamily: props.coverFontFamily,
                slideUrls: props.coverSlideUrls,
                autoAdvanceSeconds: props.coverAutoAdvanceSeconds,
                position: props.position,
                mobilePosition: props.mobilePosition,
              }}
              onChange={(patch) =>
                setProp((p) => {
                  if ("text" in patch) p.coverText = patch.text!;
                  if ("fontSizePx" in patch) p.coverFontSizePx = patch.fontSizePx!;
                  if ("fontWeight" in patch) p.coverFontWeight = patch.fontWeight!;
                  if ("align" in patch) p.coverAlign = patch.align!;
                  if ("color" in patch) p.coverColor = patch.color!;
                  if ("fontFamily" in patch) p.coverFontFamily = patch.fontFamily!;
                  if ("slideUrls" in patch) p.coverSlideUrls = patch.slideUrls!;
                  if ("autoAdvanceSeconds" in patch) p.coverAutoAdvanceSeconds = patch.autoAdvanceSeconds!;
                })
              }
            />
            <FreePositionSettingsSection supportsMobileOverride />
          </>
        )}
      </div>

      {/* HOTFIX-147.13(사용자 지시 — "그리스/르네상스/바로크/로코코 등
          하위 이벤트 화면에도 같은 자유편집을, 다른 카테고리에도 적용"):
          표지와 별개로, 이 타임라인의 개별 이벤트(하위 카테고리/게시글)
          하나를 골라 그 화면에도 똑같은 자유편집을 켤 수 있다. */}
      <div className="space-y-2 border-t border-gray-200 pt-3">
        <h4 className="text-xs font-semibold text-gray-500">개별 화면(이벤트) 자유 편집</h4>
        <label className="block text-xs text-gray-600">
          이벤트 선택
          <select
            value={selectedEventId}
            onChange={(e) => setSelectedEventId(e.target.value)}
            className="mt-1 w-full rounded border border-gray-300 px-2 py-1 text-xs"
          >
            <option value="">선택하세요 ({eventOptions.length}개)</option>
            {eventOptions.map((ev) => (
              <option key={ev.id} value={ev.id}>
                {ev.headline}
              </option>
            ))}
          </select>
        </label>
        {selectedEventId &&
          (() => {
            const cfg = props.eventOverlays[selectedEventId] ?? DEFAULT_SLIDE_OVERLAY_CONFIG;
            function updateEvent(patch: Partial<SlideOverlayConfig>) {
              setProp((p) => {
                p.eventOverlays = {
                  ...p.eventOverlays,
                  [selectedEventId]: { ...(p.eventOverlays[selectedEventId] ?? DEFAULT_SLIDE_OVERLAY_CONFIG), ...patch },
                };
              });
            }
            return (
              <>
                <label className="flex items-center gap-2 text-xs text-gray-700">
                  <input type="checkbox" checked={cfg.enabled} onChange={(e) => updateEvent({ enabled: e.target.checked })} />
                  이 화면에 자유 편집 켜기
                </label>
                {cfg.enabled && (
                  <>
                    <p className="text-[10px] leading-relaxed text-gray-500">
                      캔버스에서 타임라인 대시보드로 이 이벤트를 클릭해 보면서
                      텍스트를 더블클릭하면 바로 고칠 수 있어요.
                    </p>
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
          })()}
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
    motion: DEFAULT_MOTION,
    coverEnabled: false,
    coverText: "",
    coverFontSizePx: 40,
    coverFontWeight: "bold",
    coverAlign: "center",
    coverColor: "#ffffff",
    coverFontFamily: "",
    coverSlideUrls: [],
    coverAutoAdvanceSeconds: 5,
    position: DEFAULT_FREE_POSITION,
    mobilePosition: null,
    eventOverlays: {},
  } satisfies SiloTimelineEmbedBlockProps,
  related: { settings: SiloTimelineEmbedSettings },
};
