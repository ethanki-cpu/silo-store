"use client";

import { useNode } from "@craftjs/core";
import { EditableBlockFrame } from "@/components/craft/home/editable";
import { NumberField, SelectField, TextField, ListFieldWrapper, ListItemCard } from "@/components/craft/shared/FieldControls";

export type SocialPlatform = "instagram" | "facebook" | "youtube" | "x" | "kakao" | "blog";

export type SocialIconItem = { platform: SocialPlatform; url: string };

export type SocialIconsBlockProps = {
  items: SocialIconItem[];
  iconSizePx: number;
  gapPx: number;
  align: "left" | "center" | "right";
  variant: "dark" | "light" | "outline";
};

// 최소한의 모노크롬 SVG 아이콘 — 별도 아이콘 패키지 의존성 추가 없이
// 흔히 쓰는 6개 플랫폼만 커버(그 외는 "블로그/링크" 범용 아이콘으로 대체).
const ICON_PATHS: Record<SocialPlatform, string> = {
  instagram:
    "M12 2c2.7 0 3.05.01 4.12.06 1.06.05 1.79.22 2.43.47.66.26 1.21.6 1.76 1.15.55.55.9 1.1 1.15 1.76.25.64.42 1.37.47 2.43.05 1.07.06 1.42.06 4.12s-.01 3.05-.06 4.12c-.05 1.06-.22 1.79-.47 2.43a4.9 4.9 0 0 1-1.15 1.76 4.9 4.9 0 0 1-1.76 1.15c-.64.25-1.37.42-2.43.47-1.07.05-1.42.06-4.12.06s-3.05-.01-4.12-.06c-1.06-.05-1.79-.22-2.43-.47a4.9 4.9 0 0 1-1.76-1.15 4.9 4.9 0 0 1-1.15-1.76c-.25-.64-.42-1.37-.47-2.43C2.01 15.05 2 14.7 2 12s.01-3.05.06-4.12c.05-1.06.22-1.79.47-2.43.26-.66.6-1.21 1.15-1.76A4.9 4.9 0 0 1 5.44 2.54c.64-.25 1.37-.42 2.43-.47C8.95 2.01 9.3 2 12 2zm0 5a5 5 0 1 0 0 10 5 5 0 0 0 0-10zm0 8.2a3.2 3.2 0 1 1 0-6.4 3.2 3.2 0 0 1 0 6.4zm5.2-8.4a1.17 1.17 0 1 1 0-2.34 1.17 1.17 0 0 1 0 2.34z",
  facebook:
    "M13.5 21v-8h2.68l.4-3.11h-3.08V7.94c0-.9.25-1.51 1.54-1.51h1.65V3.65C15.98 3.5 15.05 3.42 14.12 3.42c-2.68 0-4.52 1.64-4.52 4.64v2.83H6.9v3.11h2.7v8h3.9z",
  youtube:
    "M23.5 7.2s-.23-1.64-.94-2.36c-.9-.94-1.9-.95-2.36-1C17 3.5 12 3.5 12 3.5h-.01s-5 0-8.2.34c-.46.05-1.46.06-2.36 1-.71.72-.94 2.36-.94 2.36S.2 9.13.2 11.06v1.72c0 1.93.29 3.86.29 3.86s.23 1.64.94 2.36c.9.94 2.08.91 2.6 1.01C6 20.3 12 20.35 12 20.35s5.01-.01 8.2-.35c.46-.05 1.46-.06 2.36-1 .71-.72.94-2.36.94-2.36s.29-1.93.29-3.86v-1.72c0-1.93-.29-3.86-.29-3.86zM9.75 14.85V8.94l5.75 2.96-5.75 2.95z",
  x: "M18.24 2.25h3.3l-7.2 8.23 8.47 11.27H16l-5.2-6.9-5.94 6.9H1.55l7.7-8.8L1.15 2.25H8.5l4.72 6.3 5.02-6.3zm-1.16 17.5h1.83L7.02 4.14H5.06l12.02 15.61z",
  kakao:
    "M12 3C6.48 3 2 6.48 2 10.8c0 2.8 1.86 5.26 4.66 6.66-.2.75-.74 2.76-.85 3.19-.13.53.2.52.42.38.17-.11 2.7-1.83 3.8-2.58.63.09 1.28.14 1.97.14 5.52 0 10-3.48 10-7.79S17.52 3 12 3z",
  blog: "M4 4h16v16H4V4zm2 4v2h12V8H6zm0 4v2h9v-2H6zm0 4v2h6v-2H6z",
};

const PLATFORM_LABEL: Record<SocialPlatform, string> = {
  instagram: "Instagram",
  facebook: "Facebook",
  youtube: "YouTube",
  x: "X (Twitter)",
  kakao: "카카오톡",
  blog: "블로그/링크",
};

const VARIANT_CLASS: Record<SocialIconsBlockProps["variant"], string> = {
  dark: "bg-gray-900 text-white",
  light: "bg-gray-100 text-gray-900",
  outline: "border border-gray-400 text-gray-700 bg-transparent",
};

const ALIGN_CLASS: Record<SocialIconsBlockProps["align"], string> = {
  left: "justify-start",
  center: "justify-center",
  right: "justify-end",
};

export function SocialIconsBlock({ items, iconSizePx, gapPx, align, variant }: SocialIconsBlockProps) {
  const {
    connectors: { connect },
  } = useNode();

  return (
    <div ref={(dom) => { if (dom) connect(dom); }}>
      <EditableBlockFrame label="소셜 아이콘">
        <div className={`flex flex-wrap px-6 py-4 ${ALIGN_CLASS[align]}`} style={{ gap: gapPx }}>
          {items.map((item, i) => (
            <a
              key={`${item.platform}-${i}`}
              href={item.url || "#"}
              target="_blank"
              rel="noopener noreferrer"
              className={`flex shrink-0 items-center justify-center rounded-full transition-opacity hover:opacity-80 ${VARIANT_CLASS[variant]}`}
              style={{ width: iconSizePx, height: iconSizePx }}
              onClick={(e) => { if (!item.url) e.preventDefault(); }}
            >
              <svg viewBox="0 0 24 24" width={iconSizePx * 0.55} height={iconSizePx * 0.55} fill="currentColor">
                <path d={ICON_PATHS[item.platform]} />
              </svg>
            </a>
          ))}
        </div>
      </EditableBlockFrame>
    </div>
  );
}

function SocialIconsSettings() {
  const { props, setProp } = useNode((node) => ({ props: node.data.props as SocialIconsBlockProps }));

  return (
    <div className="space-y-3">
      <SelectField
        label="스타일"
        value={props.variant}
        onChange={(v) => setProp((p) => { p.variant = v; })}
        options={[
          { value: "dark", label: "어두운 원형" },
          { value: "light", label: "밝은 원형" },
          { value: "outline", label: "테두리" },
        ]}
      />
      <SelectField
        label="정렬"
        value={props.align}
        onChange={(v) => setProp((p) => { p.align = v; })}
        options={[
          { value: "left", label: "왼쪽" },
          { value: "center", label: "가운데" },
          { value: "right", label: "오른쪽" },
        ]}
      />
      <NumberField label="아이콘 크기(px)" min={16} max={80} value={props.iconSizePx} onChange={(v) => setProp((p) => { p.iconSizePx = v; })} fallback={35} />
      <NumberField label="간격(px)" min={0} max={80} value={props.gapPx} onChange={(v) => setProp((p) => { p.gapPx = v; })} fallback={12} />
      <ListFieldWrapper
        label="아이콘"
        count={props.items.length}
        onAdd={() => setProp((p) => { p.items = [...p.items, { platform: "instagram", url: "" }]; })}
      >
        {props.items.map((item, i) => (
          <ListItemCard key={i} onRemove={() => setProp((p) => { p.items = props.items.filter((_, idx) => idx !== i); })}>
            <SelectField
              label="플랫폼"
              value={item.platform}
              onChange={(v) => setProp((p) => { p.items[i].platform = v; })}
              options={(Object.keys(PLATFORM_LABEL) as SocialPlatform[]).map((k) => ({ value: k, label: PLATFORM_LABEL[k] }))}
            />
            <TextField label="URL" value={item.url} placeholder="https://..." onChange={(v) => setProp((p) => { p.items[i].url = v; })} />
          </ListItemCard>
        ))}
      </ListFieldWrapper>
    </div>
  );
}

SocialIconsBlock.craft = {
  displayName: "SocialIconsBlock",
  props: {
    items: [
      { platform: "instagram", url: "" },
      { platform: "youtube", url: "" },
    ],
    iconSizePx: 35,
    gapPx: 12,
    align: "center",
    variant: "dark",
  } satisfies SocialIconsBlockProps,
  related: { settings: SocialIconsSettings },
};
