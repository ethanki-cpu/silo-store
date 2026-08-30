"use client";

// 사용자 지시(2026-08-30 — "Salon hero 부분은 배경 이미지를 설정할수
// 없어. 슬라이드를 넣을수 있도록 해줘. 이미지와 영상도 가능해야해" →
// 후속 지시: "모든 craft의 hero 요소에 똑같은 슬라이드 기능 넣어줘"):
// SalonHeroBlock에서 처음 만든 배경 슬라이드쇼(이미지/영상 자동 판별 +
// 크로스페이드 + 자동 전환 + 다중 파일 업로드)를 이 파일로 뽑아 모든
// 페이지 전용 히어로 블록(Shop/Studio/Salon/Docent/Mypage/Editorial)이
// 공유한다 — 이 블록들은 전부 "페이지별 전용 블록 새로 제작"(EPIC-099)
// 원칙대로 태그/타이틀/CTA 레이아웃은 각자 따로 갖지만, 배경 부분만큼은
// 완전히 똑같은 요구사항이라 여기 한 곳만 고치면 전부에 적용된다.
import { useEffect, useState } from "react";
import { useNode } from "@craftjs/core";
import { useCraftEditable } from "@/components/craft/home/editable";
import { uploadFile } from "@/lib/storage";
import { compressVideoIfNeeded } from "@/lib/videoCompress";

export const HERO_SLIDE_VIDEO_RE = /\.(mp4|webm|mov|m4v)(\?|#|$)/i;

export type HeroSlide = { url: string };

// 이 두 필드 이름(slides/autoAdvanceSeconds)은 모든 히어로 블록이 동일하게
// 써야 한다 — 아래 HeroSlidesSettings가 useNode()로 이 이름 그대로
// 읽고/쓰기 때문에, 블록마다 다른 이름을 쓰면 설정 패널이 그 블록에서
// 작동하지 않는다.
export type HeroSlidesProps = {
  slides: HeroSlide[];
  autoAdvanceSeconds: number;
};

export function HeroSlidesBackground({
  slides,
  autoAdvanceSeconds,
}: {
  slides: HeroSlide[] | undefined;
  autoAdvanceSeconds: number | undefined;
}) {
  const list = slides ?? [];
  const interval = autoAdvanceSeconds ?? 5;
  const [current, setCurrent] = useState(0);

  useEffect(() => {
    if (list.length <= 1) return;
    const timer = setInterval(() => {
      setCurrent((i) => (i + 1) % list.length);
    }, Math.max(1, interval) * 1000);
    return () => clearInterval(timer);
  }, [list.length, interval]);

  if (list.length === 0) return null;

  return (
    <>
      {list.map((slide, idx) => {
        const isVideo = HERO_SLIDE_VIDEO_RE.test(slide.url);
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

// 범용 Settings 패널 — useNode()로 "지금 선택된 노드"의 slides/
// autoAdvanceSeconds를 직접 읽고 쓴다. 어느 히어로 블록이든
// `related: { settings: HeroSlidesSettings }`로 그대로 연결하면 되고,
// 블록마다 별도 글루 코드가 필요 없다(두 prop 이름이 통일돼 있으므로).
export function HeroSlidesSettings() {
  const { props, setProp } = useNode((node) => ({ props: node.data.props as HeroSlidesProps }));
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
    const uploaded: HeroSlide[] = [];
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
          const { url, error } = await uploadFile(uploadable, "post-images", "craft-page-hero");
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
      p.slides = ((p.slides ?? []) as HeroSlide[]).filter((_, i) => i !== idx);
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
              {HERO_SLIDE_VIDEO_RE.test(slide.url) ? (
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
