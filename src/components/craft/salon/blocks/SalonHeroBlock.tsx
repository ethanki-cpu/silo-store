"use client";

// EPIC-099(항목 3, Phase 2): 살롱데상 전용 히어로 — ShopHeroBlock/DocentHeroBlock/
// StudioHeroBlock과 같은 좌측 정렬 태그+타이틀+CTA 레이아웃, 톤만 커뮤니티/
// 모임에 맞춤(사용자 지시: "페이지별 전용 블록 새로 제작").
//
// 사용자 지시(2026-08-30 — "Salon hero 부분은 배경 이미지를 설정할수
// 없어. 여기에 슬라이드를 넣을수 있도록 해줘. 슬라이드에는 이미지와
// 영상도 가능해야해"): 기존엔 EditableResponsiveImage(더블클릭으로 바로
// 바꾸는 정지 이미지 한 장, PC/모바일 각각)만 지원했다 — 여러 장을
// 넣을 자리가 없었다. 슬라이드 배열(slides)로 바꾸고, 각 슬라이드는
// 확장자로 이미지/영상을 자동 판별해 그린다(SiloTimelineEmbedBlock.tsx/
// admin/navigation/settings의 ImageThumb이 이미 쓰는 것과 동일한 정규식).
// 슬라이드 목록 관리(추가/삭제)는 더블클릭 인라인 편집 대신 다른
// 슬라이드쇼 블록들(SlideshowBlock.tsx 등)과 같은 우측 Settings 패널
// 방식으로 옮겼다 — 여러 장을 다루려면 목록 UI가 필요하기 때문. 파일
// 여러 개 한 번에 선택(HOTFIX-151.13과 동일 패턴, multiple + 순차 처리)도
// 지원한다. 이 블록을 쓰는 페이지가 아직 이 살롱데상 페이지 하나뿐이고
// craft_state가 비어있어(미저장 상태) 기존 데이터 마이그레이션은 필요
// 없다 — .craft.props의 기본값만 새 모양으로 바꾸면 된다.
import { useEffect, useState } from "react";
import { useNode } from "@craftjs/core";
import { EditableText, EditableBlockFrame, useCraftEditable } from "@/components/craft/home/editable";
import { uploadFile } from "@/lib/storage";
import { compressVideoIfNeeded } from "@/lib/videoCompress";

const SALON_HERO_VIDEO_RE = /\.(mp4|webm|mov|m4v)(\?|#|$)/i;

export type SalonHeroSlide = { url: string };

export type SalonHeroProps = {
  slides: SalonHeroSlide[];
  autoAdvanceSeconds: number;
  tag: string;
  title: string;
  subtitle: string;
  ctaText: string;
  ctaHref: string;
};

function SalonHeroBackground({
  slides,
  autoAdvanceSeconds,
}: {
  slides: SalonHeroSlide[];
  autoAdvanceSeconds: number;
}) {
  const [current, setCurrent] = useState(0);

  useEffect(() => {
    if (slides.length <= 1) return;
    const timer = setInterval(() => {
      setCurrent((i) => (i + 1) % slides.length);
    }, Math.max(1, autoAdvanceSeconds) * 1000);
    return () => clearInterval(timer);
  }, [slides.length, autoAdvanceSeconds]);

  if (slides.length === 0) return null;

  return (
    <>
      {slides.map((slide, idx) => {
        const isVideo = SALON_HERO_VIDEO_RE.test(slide.url);
        return (
          <div
            key={idx}
            className={`absolute inset-0 transition-opacity duration-700 ${
              idx === current ? "opacity-100" : "opacity-0"
            }`}
          >
            {isVideo ? (
              <video
                src={slide.url}
                autoPlay
                loop
                muted
                playsInline
                className="h-full w-full object-cover"
              />
            ) : (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={slide.url}
                alt=""
                loading={idx === 0 ? "eager" : "lazy"}
                fetchPriority={idx === 0 ? "high" : undefined}
                className="h-full w-full object-cover"
              />
            )}
          </div>
        );
      })}
    </>
  );
}

export function SalonHeroBlock({
  slides,
  autoAdvanceSeconds,
  tag,
  title,
  subtitle,
  ctaText,
  ctaHref,
}: SalonHeroProps) {
  const {
    connectors: { connect },
    setProp,
  } = useNode();

  return (
    <div ref={(dom) => { if (dom) connect(dom); }}>
      <EditableBlockFrame label="Salon Hero">
        <section className="relative h-[80vh] min-h-[480px] w-full overflow-hidden bg-gray-900">
          <SalonHeroBackground slides={slides ?? []} autoAdvanceSeconds={autoAdvanceSeconds ?? 5} />
          <div className="absolute inset-0 bg-gradient-to-r from-black/70 via-black/30 to-transparent" />
          <div className="absolute inset-y-0 left-0 flex max-w-lg flex-col justify-center gap-4 px-8 text-white @[768px]:px-16">
            <EditableText
              as="span"
              value={tag}
              className="w-fit rounded-full border border-white/40 px-3 py-1 text-xs font-medium uppercase tracking-wide"
              onCommit={(next) => setProp((p) => (p.tag = next))}
            />
            <EditableText
              as="h1"
              value={title}
              className="font-serif text-4xl font-normal leading-tight @[768px]:text-5xl"
              onCommit={(next) => setProp((p) => (p.title = next))}
            />
            <EditableText
              as="span"
              value={subtitle}
              className="text-sm font-light text-white/80"
              onCommit={(next) => setProp((p) => (p.subtitle = next))}
            />
            <a
              href={ctaHref}
              className="mt-2 w-fit rounded-full bg-white px-5 py-2 text-xs font-medium uppercase tracking-wide text-gray-900 hover:bg-white/90"
            >
              <EditableText
                as="span"
                value={ctaText}
                onCommit={(next) => setProp((p) => (p.ctaText = next))}
              />
            </a>
          </div>
        </section>
      </EditableBlockFrame>
    </div>
  );
}

function SalonHeroSettings() {
  const { props, setProp } = useNode((node) => ({ props: node.data.props as SalonHeroProps }));
  const editable = useCraftEditable();
  const [uploadStatus, setUploadStatus] = useState<string | null>(null);
  const slides = props.slides ?? [];

  // HOTFIX-151.13과 동일한 패턴 — 파일을 하나씩 순차 처리(영상 압축이
  // ffmpeg.wasm 하나를 공유해 동시에 여러 개 돌리면 위험)하고, 업로드된
  // URL을 로컬 배열에 모아뒀다가 마지막에 한 번만 setProp한다(매 파일마다
  // setProp을 부르면 이 클로저가 캡처한 옛 slides를 계속 스프레드해
  // 이전 파일의 추가분을 덮어써버리는 버그가 생긴다).
  async function handleFiles(fileList: FileList | null) {
    const files = Array.from(fileList ?? []);
    if (files.length === 0) return;
    const uploaded: SalonHeroSlide[] = [];
    const failed: string[] = [];
    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const prefix = files.length > 1 ? `[${i + 1}/${files.length}] ` : "";
        try {
          const uploadable = await compressVideoIfNeeded(file, (status) =>
            setUploadStatus(status ? `${prefix}${status}` : null),
          );
          setUploadStatus(`${prefix}업로드 중...`);
          const { url, error } = await uploadFile(uploadable, "post-images", "craft-salon-hero");
          if (!error && url) uploaded.push({ url });
          else failed.push(`${file.name}${error ? `: ${error}` : ""}`);
        } catch (err) {
          failed.push(`${file.name}: ${err instanceof Error ? err.message : "처리 중 오류"}`);
        }
      }
      if (uploaded.length > 0) {
        setProp((p) => {
          p.slides = [...(p.slides ?? []), ...uploaded];
        });
      }
      if (failed.length > 0) {
        window.alert(`${uploaded.length}개 업로드 완료, ${failed.length}개 실패:\n${failed.join("\n")}`);
      }
    } finally {
      setUploadStatus(null);
    }
  }

  function removeSlide(idx: number) {
    setProp((p) => {
      p.slides = ((p.slides ?? []) as SalonHeroSlide[]).filter((_, i) => i !== idx);
    });
  }

  return (
    <div className="space-y-3 text-xs">
      <label className="block text-gray-600">
        자동 전환 간격(초)
        <input
          type="number"
          min={1}
          value={props.autoAdvanceSeconds ?? 5}
          onChange={(e) =>
            setProp((p) => {
              p.autoAdvanceSeconds = Number(e.target.value) || 5;
            })
          }
          className="mt-1 w-full rounded border border-gray-300 px-2 py-1"
        />
      </label>
      <div className="space-y-2">
        <h4 className="font-semibold text-gray-500">배경 슬라이드 ({slides.length})</h4>
        <div className="grid grid-cols-2 gap-2">
          {slides.map((slide, idx) => (
            <div key={idx} className="space-y-1 rounded border border-gray-200 p-1.5">
              {SALON_HERO_VIDEO_RE.test(slide.url) ? (
                <video src={slide.url} muted playsInline className="h-20 w-full rounded object-cover" />
              ) : (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={slide.url} alt="" className="h-20 w-full rounded object-cover" />
              )}
              <button
                type="button"
                onClick={() => removeSlide(idx)}
                className="w-full text-[10px] text-red-500 hover:underline"
              >
                삭제
              </button>
            </div>
          ))}
        </div>
        <label className="block w-full rounded border border-dashed border-gray-300 py-1.5 text-center text-gray-500 hover:border-gray-400">
          {uploadStatus ?? "+ 배경 이미지/영상 추가(여러 개 한번에 선택 가능)"}
          <input
            type="file"
            accept="image/*,video/*"
            multiple
            className="hidden"
            disabled={!editable || uploadStatus !== null}
            onChange={(e) => {
              handleFiles(e.target.files);
              e.target.value = "";
            }}
          />
        </label>
      </div>
    </div>
  );
}

SalonHeroBlock.craft = {
  displayName: "SalonHeroBlock",
  props: {
    slides: [
      { url: "https://images.unsplash.com/photo-1517457373958-b7bdd4587205?w=1600&q=80&auto=format" },
    ],
    autoAdvanceSeconds: 5,
    tag: "Salon des Cent",
    title: "이야기가 모이는 곳, 살롱데상",
    subtitle: "취향으로 만난 사람들이 매일 어딘가에서 모입니다.",
    ctaText: "커뮤니티 둘러보기",
    ctaHref: "/salon-des-cent/community",
  } satisfies SalonHeroProps,
  related: { settings: SalonHeroSettings },
};
