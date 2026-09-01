"use client";

// EPIC-098: Frame의 최상위 canvas 노드가 될 자리표시 컨테이너 — 6개
// 에디토리얼 블록을 세로로 쌓는 것 말고는 아무 스타일도 갖지 않는다.
// resolver에 이름으로 등록되어야 해서(Craft.js가 직렬화된 노드를
// resolvedName으로 되찾을 때 필요) 별도 컴포넌트로 분리했다.
//
// EPIC-149(Page 전역 설정 — 사용자 지시 "다음 phase 진행해 그냥 순서대로
// 알아서 전부"): BuilderJS 레퍼런스의 "Page" 탭(container width/block
// gap/padding/기본 폰트/배경)에 대응 — 이 컴포넌트가 모든 6개 페이지
// 패밀리(home/shop/docent/salon/studio/mypage) + footer 캔버스가 공유하는
// 유일한 ROOT라서(defaultTree.tsx 7곳이 전부 이 파일 하나를 import), 여기
// 한 곳에만 실제 props+설정 패널을 달아도 전체에 자동 적용된다.
// SettingsSidebar.tsx는 이미 "선택된 노드의 craft.related.settings"를
// 그대로 그리므로(root 전용 코드 없음), 캔버스 빈 곳/최상위를 클릭하면
// 자동으로 이 설정 패널이 뜬다 — 그 컴포넌트는 손대지 않았다.
import { useNode } from "@craftjs/core";
import type { CSSProperties, ReactNode } from "react";
import { FontPicker } from "@/components/admin/FontPicker";
import { useCustomFonts } from "@/lib/useCustomFonts";
import { uploadFileToR2 } from "@/lib/r2Upload";
import { NumberField, ColorField, SelectField, TextField } from "@/components/craft/shared/FieldControls";

export type PageBackground = {
  color: string;
  imageUrl: string;
  size: "cover" | "contain" | "auto";
  position: string;
  repeat: "no-repeat" | "repeat";
  opacityPercent: number;
};

export type RootContainerProps = {
  containerWidthPx: number | null;
  blockGapPx: number;
  paddingTop: number;
  paddingRight: number;
  paddingBottom: number;
  paddingLeft: number;
  // 페이지 기본 폰트 — 자식 블록이 자기 fontFamily를 안 정했으면(빈 문자열)
  // CSS 상속으로 자연스럽게 이 값을 물려받는다(자식 코드 수정 불필요).
  fontFamily: string;
  background: PageBackground;
};

export const DEFAULT_PAGE_BACKGROUND: PageBackground = {
  color: "",
  imageUrl: "",
  size: "cover",
  position: "center center",
  repeat: "no-repeat",
  opacityPercent: 100,
};

// EPIC-150(Themes 프리셋 — 사용자 지시 "다음 phase 진행해 그냥 순서대로
// 알아서 전부"의 마지막 Phase): BuilderJS 레퍼런스의 "Themes" 탭(클릭
// 한 번으로 페이지 전체 톤을 바꾸는 프리셋 갤러리)에 대응. 폰트는 일부러
// 뺐다 — FontPicker는 이 사이트에 실제로 업로드된 커스텀 폰트만 고를 수
// 있어(사이트마다 다름, /admin/fonts 참고) 프리셋에 특정 폰트를 박아두면
// 그 폰트가 없는 배포에서는 조용히 아무 효과 없이 실패한다(FontPicker.tsx
// 상단 주석과 동일한 함정). 색상/여백처럼 항상 유효한 값만 프리셋으로 묶었다.
export type ThemePreset = {
  name: string;
  swatch: string;
  background: string;
  containerWidthPx: number | null;
  blockGapPx: number;
  paddingY: number;
  paddingX: number;
};

export const THEME_PRESETS: ThemePreset[] = [
  { name: "기본값", swatch: "#ffffff", background: "", containerWidthPx: null, blockGapPx: 0, paddingY: 0, paddingX: 0 },
  { name: "미니멀", swatch: "#ffffff", background: "#ffffff", containerWidthPx: 720, blockGapPx: 32, paddingY: 48, paddingX: 0 },
  { name: "갤러리(다크)", swatch: "#111111", background: "#111111", containerWidthPx: null, blockGapPx: 0, paddingY: 0, paddingX: 0 },
  { name: "웜 빈티지", swatch: "#f5efe3", background: "#f5efe3", containerWidthPx: 960, blockGapPx: 40, paddingY: 64, paddingX: 24 },
  { name: "와이드 에디토리얼", swatch: "#fafafa", background: "#ffffff", containerWidthPx: 1200, blockGapPx: 64, paddingY: 80, paddingX: 24 },
  { name: "컴팩트", swatch: "#fafafa", background: "#fafafa", containerWidthPx: 600, blockGapPx: 16, paddingY: 24, paddingX: 16 },
];

export function RootContainer({
  children,
  containerWidthPx = null,
  blockGapPx = 0,
  paddingTop = 0,
  paddingRight = 0,
  paddingBottom = 0,
  paddingLeft = 0,
  fontFamily = "",
  background = DEFAULT_PAGE_BACKGROUND,
}: {
  children?: ReactNode;
} & Partial<RootContainerProps>) {
  const {
    connectors: { connect },
  } = useNode();
  useCustomFonts();

  const bg = { ...DEFAULT_PAGE_BACKGROUND, ...background };
  const outerStyle: CSSProperties = {
    ...(bg.color ? { backgroundColor: bg.color } : {}),
    ...(bg.imageUrl
      ? {
          backgroundImage: `url(${bg.imageUrl})`,
          backgroundSize: bg.size,
          backgroundPosition: bg.position,
          backgroundRepeat: bg.repeat,
        }
      : {}),
    ...(fontFamily ? { fontFamily } : {}),
  };
  const innerStyle: CSSProperties = {
    display: "flex",
    flexDirection: "column",
    gap: blockGapPx || undefined,
    paddingTop,
    paddingRight,
    paddingBottom,
    paddingLeft,
    maxWidth: containerWidthPx ?? undefined,
    marginLeft: containerWidthPx ? "auto" : undefined,
    marginRight: containerWidthPx ? "auto" : undefined,
  };

  return (
    <div ref={(dom) => { if (dom) connect(dom); }} className="relative w-full bg-white" style={outerStyle}>
      {bg.imageUrl && bg.opacityPercent < 100 && (
        <div className="pointer-events-none absolute inset-0" style={{ backgroundColor: "#fff", opacity: (100 - bg.opacityPercent) / 100 }} />
      )}
      <div className="relative" style={innerStyle}>
        {children}
      </div>
    </div>
  );
}

function PageSettings() {
  const { props, setProp } = useNode((node) => ({ props: node.data.props as Partial<RootContainerProps> }));
  const bg = { ...DEFAULT_PAGE_BACKGROUND, ...props.background };

  function patchBackground(patch: Partial<PageBackground>) {
    setProp((p) => { p.background = { ...DEFAULT_PAGE_BACKGROUND, ...p.background, ...patch }; });
  }

  async function uploadBackgroundImage(file: File | null) {
    if (!file) return;
    const { url, error } = await uploadFileToR2(file);
    if (!error && url) patchBackground({ imageUrl: url });
  }

  function applyTheme(preset: ThemePreset) {
    setProp((p) => {
      p.background = { ...DEFAULT_PAGE_BACKGROUND, ...p.background, color: preset.background };
      p.containerWidthPx = preset.containerWidthPx;
      p.blockGapPx = preset.blockGapPx;
      p.paddingTop = preset.paddingY;
      p.paddingBottom = preset.paddingY;
      p.paddingLeft = preset.paddingX;
      p.paddingRight = preset.paddingX;
    });
  }

  return (
    <div className="space-y-4">
      <p className="text-[11px] leading-relaxed text-gray-400">
        이 페이지 전체에 적용되는 설정이에요 — 캔버스 빈 곳을 클릭하면 언제든 다시 이 패널로 돌아올 수 있어요.
      </p>

      <div className="space-y-2">
        <h4 className="text-xs font-semibold text-gray-500">테마(한 번에 적용, 아래에서 다시 세부 조정 가능)</h4>
        <div className="grid grid-cols-3 gap-2">
          {THEME_PRESETS.map((preset) => (
            <button
              key={preset.name}
              type="button"
              onClick={() => applyTheme(preset)}
              className="flex flex-col items-center gap-1 rounded border border-gray-200 p-1.5 hover:border-gray-400"
              title={preset.name}
            >
              <span className="h-8 w-full rounded border border-gray-200" style={{ backgroundColor: preset.swatch }} />
              <span className="truncate text-[10px] text-gray-600">{preset.name}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-3 border-t border-gray-200 pt-3">
        <h4 className="text-xs font-semibold text-gray-500">레이아웃</h4>
        <NumberField
          label="블록 간 간격(px)"
          min={0}
          max={200}
          value={props.blockGapPx ?? 0}
          onChange={(v) => setProp((p) => { p.blockGapPx = v; })}
          fallback={0}
        />
        <label className="block text-xs text-gray-600">
          콘텐츠 최대 너비(px, 비우면 전체 너비)
          <input
            type="number"
            min={0}
            value={props.containerWidthPx ?? ""}
            onChange={(e) => setProp((p) => { p.containerWidthPx = e.target.value ? Number(e.target.value) : null; })}
            className="mt-1 w-full rounded border border-gray-300 px-2 py-1 text-xs"
          />
        </label>
        <div className="grid grid-cols-2 gap-2">
          <NumberField label="상단 여백(px)" min={0} value={props.paddingTop ?? 0} onChange={(v) => setProp((p) => { p.paddingTop = v; })} fallback={0} />
          <NumberField label="우측 여백(px)" min={0} value={props.paddingRight ?? 0} onChange={(v) => setProp((p) => { p.paddingRight = v; })} fallback={0} />
          <NumberField label="하단 여백(px)" min={0} value={props.paddingBottom ?? 0} onChange={(v) => setProp((p) => { p.paddingBottom = v; })} fallback={0} />
          <NumberField label="좌측 여백(px)" min={0} value={props.paddingLeft ?? 0} onChange={(v) => setProp((p) => { p.paddingLeft = v; })} fallback={0} />
        </div>
      </div>

      <div className="space-y-3 border-t border-gray-200 pt-3">
        <h4 className="text-xs font-semibold text-gray-500">기본 폰트</h4>
        <p className="text-[10px] text-gray-400">블록마다 폰트를 따로 지정하지 않으면 이 폰트를 물려받아요.</p>
        <FontPicker label="폰트" value={props.fontFamily ?? ""} onChange={(fontFamily) => setProp((p) => { p.fontFamily = fontFamily; })} />
      </div>

      <div className="space-y-3 border-t border-gray-200 pt-3">
        <h4 className="text-xs font-semibold text-gray-500">배경</h4>
        <ColorField label="배경색" value={bg.color} onChange={(v) => patchBackground({ color: v })} fallback="#ffffff" />
        <label className="block text-xs text-gray-600">
          배경 이미지 업로드
          <input type="file" accept="image/*" onChange={(e) => uploadBackgroundImage(e.target.files?.[0] ?? null)} className="mt-1 block w-full text-xs" />
        </label>
        {bg.imageUrl && (
          <>
            <SelectField
              label="채우기 방식"
              value={bg.size}
              onChange={(v) => patchBackground({ size: v })}
              options={[
                { value: "cover", label: "꽉 채우기(cover)" },
                { value: "contain", label: "맞추기(contain)" },
                { value: "auto", label: "원본 크기" },
              ]}
            />
            <TextField label="위치" value={bg.position} placeholder="center center" onChange={(v) => patchBackground({ position: v })} />
            <SelectField
              label="반복"
              value={bg.repeat}
              onChange={(v) => patchBackground({ repeat: v })}
              options={[
                { value: "no-repeat", label: "반복 안 함" },
                { value: "repeat", label: "반복" },
              ]}
            />
            <NumberField label="불투명도(%)" min={0} max={100} value={bg.opacityPercent} onChange={(v) => patchBackground({ opacityPercent: Math.max(0, Math.min(100, v)) })} fallback={100} />
          </>
        )}
      </div>
    </div>
  );
}

RootContainer.craft = {
  displayName: "RootContainer",
  props: {
    containerWidthPx: null,
    blockGapPx: 0,
    paddingTop: 0,
    paddingRight: 0,
    paddingBottom: 0,
    paddingLeft: 0,
    fontFamily: "",
    background: DEFAULT_PAGE_BACKGROUND,
  } satisfies RootContainerProps,
  rules: {
    canDrag: () => false,
  },
  related: { settings: PageSettings },
};
