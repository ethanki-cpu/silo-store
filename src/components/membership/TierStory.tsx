"use client";

import type { CSSProperties } from "react";
import { UniversalBlockRenderer } from "@/components/content/UniversalBlockRenderer";
import { DEFAULT_LETTER_STYLE, LETTER_FONT_STACKS, plainToHtml, type LetterStyle, type TierContent } from "@/lib/tierContent";

// HOTFIX-162.13: 등급 카드의 "소개"와 "편지" 표시 — 둘 다 Block Editor가 만든 HTML(이미지·영상 캐러셀·임베드 포함)을
// UniversalBlockRenderer로 그린다. *_html이 없으면 예전 평문(intro_text/letter_text)으로 폴백한다.
export const introHtmlOf = (t: TierContent) => t.intro_html || plainToHtml(t.intro_text);
export const letterHtmlOf = (t: TierContent) => t.letter_html || plainToHtml(t.letter_text);

const isEmptyHtml = (html: string) => !html.replace(/<[^>]*>/g, "").trim() && !/<(img|video|iframe|figure|div[^>]*gallery)/i.test(html);

export function LetterView({ html, style, tierName }: { html: string; style?: LetterStyle | null; tierName: string }) {
  const s = { ...DEFAULT_LETTER_STYLE, ...(style ?? {}) };
  const dark = s.frame === "dark";
  const paperColor = dark && !style?.paperColor ? "#1f1a17" : s.paperColor;
  const textColor = dark && !style?.textColor ? "#f3e9d6" : s.textColor;
  const fontFamily = s.fontFamily === "custom" && style?.customFont ? style.customFont : LETTER_FONT_STACKS[s.fontFamily === "custom" ? "serif" : s.fontFamily];
  const overlay = Math.min(100, Math.max(0, s.bgOverlayPct)) / 100;

  const paper: CSSProperties = {
    position: "relative",
    overflow: "hidden",
    margin: "0 auto",
    maxWidth: s.maxWidthPx,
    background: s.frame === "plain" ? "transparent" : paperColor,
    borderRadius: s.frame === "plain" ? 0 : 6,
    border: s.frame === "plain" ? undefined : `1px solid ${dark ? "#3a322c" : "#e4d8bd"}`,
    boxShadow: s.frame === "plain" ? undefined : "0 1px 2px rgba(60,40,10,.10), 0 10px 28px rgba(60,40,10,.14)",
    transformOrigin: "top center",
    animation: "silo-letter-unfold 0.7s cubic-bezier(.2,.7,.2,1)",
  };

  const proseVars = {
    "--tw-prose-body": textColor,
    "--tw-prose-headings": textColor,
    "--tw-prose-bold": textColor,
    "--tw-prose-quotes": textColor,
    "--tw-prose-links": textColor,
    "--letter-fs": `${s.fontSizePx}px`,
    "--letter-lh": String(s.lineHeight),
  } as CSSProperties;

  return (
    <div style={paper}>
      <style>{"@keyframes silo-letter-unfold{from{opacity:0;transform:perspective(900px) rotateX(-65deg) translateY(-10px)}to{opacity:1;transform:none}}"}</style>
      {style?.bgImageUrl && (
        <>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={style.bgImageUrl} alt="" aria-hidden className="absolute inset-0 h-full w-full object-cover" />
          <div className="absolute inset-0" style={{ background: paperColor, opacity: overlay }} />
        </>
      )}
      <div className="relative" style={{ padding: s.paddingPx, color: textColor, fontFamily, textAlign: s.align, ...proseVars }}>
        <UniversalBlockRenderer
          body={html}
          className="prose prose-base max-w-none !text-[length:var(--letter-fs)] [&_p]:!leading-[var(--letter-lh)] [&_p]:!text-[length:var(--letter-fs)]"
          plainTextClassName="whitespace-pre-wrap"
        />
        {(style?.signature || s.seal) && (
          <div className="mt-6 flex flex-col items-end gap-2">
            {style?.signature && <p className="text-sm italic opacity-80">{style.signature}</p>}
            {s.seal && (
              <span
                aria-hidden
                className="flex h-12 w-12 items-center justify-center rounded-full text-lg font-bold text-white shadow-md"
                style={{ background: "radial-gradient(circle at 30% 30%, #c0392b, #7b1d14)" }}
                title={tierName}
              >
                {tierName.slice(0, 1)}
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export function TierStory({ tier }: { tier: TierContent }) {
  const intro = introHtmlOf(tier);
  const letter = letterHtmlOf(tier);
  return (
    <div className="space-y-6">
      {intro && !isEmptyHtml(intro) ? (
        <UniversalBlockRenderer body={intro} className="prose prose-sm max-w-none text-gray-700" plainTextClassName="whitespace-pre-line text-sm leading-7 text-gray-700" />
      ) : (
        !letter && <p className="text-sm text-gray-400">아직 소개가 준비되지 않았어요.</p>
      )}
      {letter && !isEmptyHtml(letter) && <LetterView html={letter} style={tier.letter_style} tierName={tier.name} />}
    </div>
  );
}
