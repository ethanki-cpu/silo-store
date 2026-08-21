// HOTFIX(사용자 지시 — "각 탭 위에 커서가 hover 되었을 때의 모션들을
// 6가지로 설정할 수 있게 해, 고급스러운 느낌이 나도록 네가 임의로
// 판단해서"): 상단 탭 하나하나에 적용할 수 있는 hover 인터랙션 프리셋
// 6종 + "없음". Navbar.tsx가 각 탭의 className에 해당 프리셋 클래스를
// 붙이고, 이 파일이 생성하는 CSS를 <style> 블록으로 주입해 적용한다 —
// 스크롤 진입 시 재생되는 모션(src/lib/useScrollReveal.ts, Craft 블록
// 전용)과는 별개의, 순수 마우스 hover 전용 시스템이다.
//
// 6종 선정 기준(사용자가 판단을 위임 — "Antique & Vintage" 톤에 맞춰
// 절제된 것부터 화려한 것까지 스펙트럼을 두었다): 밑줄 슬라이드(가장
// 절제된 클래식), 자간 확장(타이포그래피 중심), 은은한 부상(입체감),
// 배경 와이프(면 강조), 확대+글로우(생동감), 금빛 그라디언트 밑줄
// (브랜드 골드 컬러를 쓴 시그니처 프리미엄 버전 — 기본값).
// HOTFIX-141.1(사용자 지시 — "hover 모션에 5개 더 추가해 달라니까?"):
// 기존 6종에 5종을 더 추가 — 마찬가지로 절제~화려 스펙트럼을 이어가되
// 이번엔 "빈티지 인쇄물/전시 라벨" 쪽 질감(세리프 기울임, 이중 밑줄,
// 모서리 브래킷)과 "부드러운 움직임/광택" 쪽(페이드 이동, 샤인 스침)을
// 섞어 겹치지 않게 골랐다.
export type TabHoverMotion =
  | "none"
  | "underline-sweep"
  | "letter-spacing"
  | "elevate-shadow"
  | "background-wipe"
  | "scale-glow"
  | "underline-glow"
  | "serif-italic"
  | "double-underline"
  | "corner-brackets"
  | "fade-shift"
  | "shimmer-sweep";

export const TAB_HOVER_MOTION_LABELS: Record<TabHoverMotion, string> = {
  none: "없음",
  "underline-sweep": "밑줄 슬라이드",
  "letter-spacing": "자간 확장",
  "elevate-shadow": "은은한 부상 + 그림자",
  "background-wipe": "배경 와이프",
  "scale-glow": "확대 + 글로우",
  "underline-glow": "금빛 그라디언트 밑줄 (추천)",
  "serif-italic": "기울임 + 자간(빈티지 인쇄체)",
  "double-underline": "이중 밑줄(전시 라벨풍)",
  "corner-brackets": "모서리 브래킷(전시 액자풍)",
  "fade-shift": "은은한 페이드 이동",
  "shimmer-sweep": "샤인 스침 효과",
};

export const TAB_HOVER_MOTIONS: TabHoverMotion[] = [
  "none",
  "underline-sweep",
  "letter-spacing",
  "elevate-shadow",
  "background-wipe",
  "scale-glow",
  "underline-glow",
  "serif-italic",
  "double-underline",
  "corner-brackets",
  "fade-shift",
  "shimmer-sweep",
];

// 사이트 전체 기본값 — 관리자가 개별 탭에서 아무것도 고르지 않았을 때도
// 상단 탭 전체가 "고급스러운 느낌"을 갖도록 기본으로 적용한다.
export const DEFAULT_TAB_HOVER_MOTION: TabHoverMotion = "underline-glow";

export function tabHoverMotionCss(className: string, motion: TabHoverMotion): string {
  switch (motion) {
    case "underline-sweep":
      return `
.${className} { position: relative; }
.${className}::after { content: ""; position: absolute; left: 0; right: 0; bottom: -2px; height: 2px; background: currentColor; transform: scaleX(0); transform-origin: left; transition: transform 0.35s cubic-bezier(.4,0,.2,1); }
.${className}:hover::after { transform: scaleX(1); }`;
    case "letter-spacing":
      return `
.${className} { transition: letter-spacing 0.3s ease, opacity 0.3s ease; }
.${className}:hover { letter-spacing: 0.08em; opacity: 0.85; }`;
    case "elevate-shadow":
      return `
.${className} { transition: transform 0.25s ease, text-shadow 0.25s ease; }
.${className}:hover { transform: translateY(-2px); text-shadow: 0 6px 12px rgba(0,0,0,0.18); }`;
    case "background-wipe":
      return `
.${className} { position: relative; z-index: 0; overflow: hidden; }
.${className}::before { content: ""; position: absolute; inset: 0; background: currentColor; opacity: 0.08; transform: scaleX(0); transform-origin: left; transition: transform 0.3s ease; z-index: -1; }
.${className}:hover::before { transform: scaleX(1); }`;
    case "scale-glow":
      return `
.${className} { transition: transform 0.25s ease, text-shadow 0.25s ease; }
.${className}:hover { transform: scale(1.08); text-shadow: 0 0 12px currentColor; }`;
    case "underline-glow":
      return `
.${className} { position: relative; }
.${className}::after { content: ""; position: absolute; left: 0; right: 0; bottom: -3px; height: 2px; background: linear-gradient(90deg, #c9a24b, #f0dfa8, #c9a24b); background-size: 200% 100%; background-position: 0 0; transform: scaleX(0); transform-origin: left; transition: transform 0.4s cubic-bezier(.4,0,.2,1), background-position 0.6s ease; box-shadow: 0 0 8px rgba(201,162,75,0.6); }
.${className}:hover::after { transform: scaleX(1); background-position: 100% 0; }`;
    case "serif-italic":
      return `
.${className} { transition: font-style 0.25s ease, letter-spacing 0.25s ease, opacity 0.25s ease; }
.${className}:hover { font-style: italic; letter-spacing: 0.03em; opacity: 0.85; }`;
    case "double-underline":
      return `
.${className} { position: relative; }
.${className}::after { content: ""; position: absolute; left: 0; right: 0; bottom: -2px; height: 1px; background: currentColor; transform: scaleX(0); transform-origin: left; transition: transform 0.35s cubic-bezier(.4,0,.2,1); }
.${className}::before { content: ""; position: absolute; left: 0; right: 0; bottom: -5px; height: 1px; background: #c9a24b; transform: scaleX(0); transform-origin: right; transition: transform 0.45s cubic-bezier(.4,0,.2,1) 0.05s; }
.${className}:hover::after { transform: scaleX(1); }
.${className}:hover::before { transform: scaleX(1); }`;
    case "corner-brackets":
      return `
.${className} { position: relative; padding-left: 0.4em; padding-right: 0.4em; }
.${className}::before, .${className}::after { content: ""; position: absolute; top: -3px; bottom: -3px; width: 6px; border: 1px solid currentColor; opacity: 0; transition: opacity 0.3s ease, transform 0.3s ease; }
.${className}::before { left: -2px; border-right: none; transform: translateX(4px); }
.${className}::after { right: -2px; border-left: none; transform: translateX(-4px); }
.${className}:hover::before, .${className}:hover::after { opacity: 0.7; transform: translateX(0); }`;
    case "fade-shift":
      return `
.${className} { transition: transform 0.3s ease, opacity 0.3s ease, letter-spacing 0.3s ease; }
.${className}:hover { transform: translateY(-2px); opacity: 0.75; letter-spacing: 0.04em; }`;
    case "shimmer-sweep":
      return `
.${className} { position: relative; overflow: hidden; display: inline-block; }
.${className}::after { content: ""; position: absolute; top: 0; left: -150%; width: 60%; height: 100%; background: linear-gradient(115deg, transparent 20%, rgba(255,255,255,0.75) 50%, transparent 80%); transform: skewX(-20deg); transition: left 0.6s ease; }
.${className}:hover::after { left: 150%; }`;
    default:
      return "";
  }
}
