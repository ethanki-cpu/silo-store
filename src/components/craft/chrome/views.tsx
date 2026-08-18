"use client";

// B1(홈페이지 설정 관리 Craft.js 전환, 계획의 결정 2를 구현 중 발견한
// 위험 때문에 변형해 적용): 애초 계획은 Navbar.tsx의 렌더 코드를
// "추출"해 이 뷰들과 공유하는 것이었다 — 하지만 실제로 읽어보니
// Navbar.tsx는 CSS-only hover 메가메뉴/로그인 세션 5갈래 분기/
// ResizeObserver 스페이서 등이 전역 <style> 주입과 깊게 얽혀 있고,
// 이 컴포넌트는 사이트의 모든 페이지에서 렌더링되는 전역 크롬이다 —
// 그 렌더 코드를 그대로 재사용하려다 실수하면 사이트 전체 내비게이션이
// 깨진다. 이 저장소 히스토리(EPIC-126/129/130 커밋 메시지)가 정확히
// 같은 이유로 "전역 크롬의 완전한 Craft 이전"을 세 번 명시적으로
// 미뤄온 것과 같은 판단 기준이라, 여기서도 더 안전한 쪽을 택한다:
// 이 뷰들은 Navbar.tsx를 전혀 import하거나 수정하지 않는 완전히
// 독립된 "스타일링 전용 복제품"이다 — 같은 설정 lib과 같은 hover 모션
// CSS 생성 함수(tabHoverMotionCss)를 재사용해 실제와 최대한 비슷하게
// 보이도록 하되, 실제 로그인 세션/드롭다운 메가메뉴/사이드바 열림 같은
// "기능"은 재현하지 않는다 — 이 에디터의 목적은 스타일(서체/색/크기/
// hover 모션/오프셋)을 눈으로 보며 편집하는 것이지 내비게이션 자체의
// 재구현이 아니다. Navbar.tsx가 실제로 렌더링될 때 이 뷰들과 조금이라도
// 어긋나 보이면(드리프트) 그건 이 뷰들을 다시 맞춰야 한다는 신호로
// 남겨둔다 — Navbar.tsx 쪽을 건드리는 것보다 이 편이 훨씬 안전하다.
import { useId, type CSSProperties } from "react";
import { SidebarTriggerMedia } from "@/components/SidebarTriggerMedia";
import { tabHoverMotionCss, DEFAULT_TAB_HOVER_MOTION } from "@/lib/tabHoverMotion";
import {
  DEFAULT_LOGO_HEIGHT_PX,
  DEFAULT_LOGO_FONT_SIZE_PX,
  DEFAULT_LOGO_TEXT_COLOR,
  type MainLogoConfig,
} from "@/lib/mainLogoSettings";
import { DEFAULT_ICON_SIZE_PX, type SidebarIconsConfig } from "@/lib/sidebarIconsSettings";
import type { TopTabStyleEntry } from "@/lib/topTabStyleSettings";
import type { AccountMenuStyleConfig } from "@/lib/accountMenuStyleSettings";

// useId()가 반환하는 ":r0:" 형태는 CSS 클래스 이름에 그대로 쓸 수 없는
// 콜론을 포함한다 — 제거해 안전한 식별자로 만든다.
function safeCssId(prefix: string, id: string): string {
  return `${prefix}-${id.replace(/[^a-zA-Z0-9_-]/g, "")}`;
}

// HOTFIX(사용자 신고 — "메인 로고 프리뷰가 실제랑 다른데?"): 이 뷰가
// Navbar.tsx의 커스텀 폰트 처리(customFonts 배열 + @font-face 동적
// 주입)를 빠뜨리고 fontFamily 직접입력 필드만 보고 있었다 — 실제
// 사이트는 업로드된 커스텀 폰트를 쓰는데 이 프리뷰는 기본 서체로
// 폴백되어 눈에 띄게 달라 보였다. Navbar.tsx의 동일한 폴백 체인
// (활성 커스텀 폰트들 → fontFamily 직접입력 → sans-serif)을 그대로
// 재현한다.
const LOGO_CUSTOM_FONT_PREFIX = "ChromePreviewLogoFont";

export function ChromeLogoView({ config }: { config: MainLogoConfig }) {
  const activeCustomFonts = config.customFonts.filter((f) => f.isActive && f.url);
  const fontFamilyValue =
    activeCustomFonts.length > 0
      ? activeCustomFonts
          .map((f) => `'${LOGO_CUSTOM_FONT_PREFIX}-${f.id}'`)
          .concat(config.fontFamily ? [config.fontFamily] : ["sans-serif"])
          .join(", ")
      : config.fontFamily || undefined;
  const textStyle: CSSProperties = {
    fontFamily: fontFamilyValue,
    fontWeight: config.bold ? "bold" : "normal",
    fontSize: `${config.fontSizePx || DEFAULT_LOGO_FONT_SIZE_PX}px`,
    color: config.textColor || DEFAULT_LOGO_TEXT_COLOR,
  };
  return (
    <div
      className="flex items-center gap-3 border-b border-gray-200 bg-white p-4"
      style={config.rowHeightPx ? { minHeight: config.rowHeightPx } : undefined}
    >
      {activeCustomFonts.length > 0 && (
        <style>
          {activeCustomFonts
            .map((f) => `@font-face { font-family: '${LOGO_CUSTOM_FONT_PREFIX}-${f.id}'; src: url('${f.url}'); font-display: swap; }`)
            .join("\n")}
        </style>
      )}
      <div className="min-w-0 flex-1 truncate text-right" style={textStyle}>
        {config.leftText}
      </div>
      <div className="shrink-0 font-bold">
        {config.type === "image" && config.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={config.imageUrl}
            alt={config.text || "로고"}
            className="w-auto"
            style={{ height: config.heightPx || DEFAULT_LOGO_HEIGHT_PX }}
          />
        ) : (
          config.text || "사일로 스토어"
        )}
      </div>
      <div className="min-w-0 flex-1 truncate text-left" style={textStyle}>
        {config.rightText}
      </div>
    </div>
  );
}

export function ChromeSidebarIconView({ side, config }: { side: "left" | "right"; config: SidebarIconsConfig }) {
  const url = side === "left" ? config.leftIconDefaultUrl : config.rightIconDefaultUrl;
  const fallback = side === "left" ? "🔑" : "🚪";
  const size = config.iconSizePx || DEFAULT_ICON_SIZE_PX;
  return (
    <div
      className={`flex items-center gap-2 border-b border-gray-100 bg-white px-4 py-2 text-xs text-gray-500 ${
        side === "left" ? "justify-start" : "justify-end"
      }`}
    >
      {side === "right" && <span>우측 사이드바 여닫이 아이콘</span>}
      <div className="flex items-center justify-center" style={{ width: size, height: size }}>
        {url ? (
          <SidebarTriggerMedia url={url} alt={side === "left" ? "왼쪽 사이드바" : "오른쪽 사이드바"} className="h-full w-full object-contain" />
        ) : (
          <span className="text-lg">{fallback}</span>
        )}
      </div>
      {side === "left" && <span>좌측 사이드바 여닫이 아이콘</span>}
    </div>
  );
}

// HOTFIX(로고와 동일한 원인 — 커스텀 폰트 폴백 체인 누락): 상단 탭도
// 탭별로 커스텀 폰트를 업로드할 수 있는데 이 뷰가 entry.customFonts를
// 무시하고 있었다.
const TOPTAB_CUSTOM_FONT_PREFIX = "ChromePreviewTopTabFont";

export function ChromeTopTabView({ label, entry }: { label: string; entry: TopTabStyleEntry }) {
  const cls = safeCssId("chrome-top-tab", useId());
  const activeCustomFonts = entry.customFonts.filter((f) => f.isActive && f.url);
  const fontFamilyValue =
    activeCustomFonts.length > 0
      ? activeCustomFonts
          .map((f) => `'${TOPTAB_CUSTOM_FONT_PREFIX}-${cls}-${f.id}'`)
          .concat(entry.fontFamily ? [entry.fontFamily] : ["inherit"])
          .join(", ")
      : entry.fontFamily || undefined;
  const rules: string[] = [];
  if (fontFamilyValue) rules.push(`font-family: ${fontFamilyValue} !important;`);
  if (entry.fontSizePx) rules.push(`font-size: ${entry.fontSizePx}px !important;`);
  if (entry.bold) rules.push(`font-weight: bold !important;`);
  if (entry.color) rules.push(`color: ${entry.color} !important;`);
  const colorRule = rules.length > 0 ? `.${cls} { ${rules.join(" ")} }` : "";
  const motionCss = tabHoverMotionCss(cls, entry.hoverMotion ?? DEFAULT_TAB_HOVER_MOTION);
  const fontFaceCss = activeCustomFonts
    .map((f) => `@font-face { font-family: '${TOPTAB_CUSTOM_FONT_PREFIX}-${cls}-${f.id}'; src: url('${f.url}'); font-display: swap; }`)
    .join("\n");
  return (
    <span className={`inline-block px-3 py-2 text-sm text-gray-700 ${cls}`}>
      {(fontFaceCss || colorRule || motionCss) && <style>{[fontFaceCss, colorRule, motionCss].filter(Boolean).join("\n")}</style>}
      {label}
      {entry.tier === 1 && <span className="ml-1 text-[10px] text-amber-600">(1단)</span>}
    </span>
  );
}

const ACCOUNT_MENU_PREVIEW_ITEMS = ["관리자", "Lautrec", "마이페이지", "회원 이름", "로그아웃"];

export function ChromeAccountMenuView({ config }: { config: AccountMenuStyleConfig }) {
  const cls = safeCssId("chrome-account-menu", useId());
  const rules: string[] = [];
  if (config.fontFamily) rules.push(`font-family: ${config.fontFamily} !important;`);
  if (config.fontSizePx) rules.push(`font-size: ${config.fontSizePx}px !important;`);
  if (config.bold) rules.push(`font-weight: bold !important;`);
  if (config.color) rules.push(`color: ${config.color} !important;`);
  const colorRule = rules.length > 0 ? `.${cls} { ${rules.join(" ")} }` : "";
  const motionCss = tabHoverMotionCss(cls, config.hoverMotion ?? DEFAULT_TAB_HOVER_MOTION);
  return (
    <div className="flex items-center justify-end gap-3 border-b border-gray-100 bg-white px-4 py-2">
      {(colorRule || motionCss) && <style>{[colorRule, motionCss].filter(Boolean).join("\n")}</style>}
      {ACCOUNT_MENU_PREVIEW_ITEMS.map((item) => (
        <span key={item} className={`text-sm text-gray-600 ${cls}`}>
          {item}
        </span>
      ))}
    </div>
  );
}
