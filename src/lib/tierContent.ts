// HOTFIX-162.13(사용자 지시 — "carousel 안의 모든 걸 설정할 수 있게", "소개·편지를 이미지/영상 캐러셀·임베드까지 편집",
// "편지는 진짜 편지처럼 배경 이미지도"): 멤버십 등급 카드의 콘텐츠·표시 설정 타입과 기본값.
// 저장 위치는 전부 membership_tiers 컬럼(관리자만 쓰기 — RLS membership_tiers_admin_write).
export type MissionQuestion = { id: string; text: string; type: "text" | "photo" };

export type TierMediaSettings = {
  widthPx?: number;
  aspect?: string; // "4:5" | "1:1" | "3:4" | "16:9" | "9:16" | "auto"
  fit?: "contain" | "cover";
  radiusPx?: number;
};

export type LetterFont = "serif" | "sans" | "mono" | "custom";
export type LetterStyle = {
  frame?: "paper" | "plain" | "dark";
  paperColor?: string;
  textColor?: string;
  bgImageUrl?: string;
  bgOverlayPct?: number; // 배경 이미지 위 종이색 덮개 진하기(0~100, 클수록 글이 잘 보임)
  fontFamily?: LetterFont;
  customFont?: string;
  fontSizePx?: number;
  lineHeight?: number;
  align?: "left" | "center" | "right";
  paddingPx?: number;
  maxWidthPx?: number;
  signature?: string;
  seal?: boolean;
};

export type TierContent = {
  rank: number;
  name: string;
  price: number;
  is_lifetime: boolean;
  image_url: string | null;
  animation_url: string | null;
  intro_text: string | null;
  letter_text: string | null;
  intro_json: unknown | null;
  intro_html: string | null;
  letter_json: unknown | null;
  letter_html: string | null;
  letter_style: LetterStyle | null;
  media_settings: TierMediaSettings | null;
  mission_questions: MissionQuestion[] | null;
};

export const TIER_SELECT =
  "rank, name, price, is_lifetime, image_url, animation_url, intro_text, letter_text, intro_json, intro_html, letter_json, letter_html, letter_style, media_settings, mission_questions";

export const DEFAULT_LETTER_STYLE: Required<Omit<LetterStyle, "bgImageUrl" | "customFont" | "signature">> = {
  frame: "paper",
  paperColor: "#fbf6ea",
  textColor: "#3b2f24",
  bgOverlayPct: 70,
  fontFamily: "serif",
  fontSizePx: 15,
  lineHeight: 2,
  align: "left",
  paddingPx: 32,
  maxWidthPx: 640,
  seal: false,
};

export const LETTER_FONT_STACKS: Record<Exclude<LetterFont, "custom">, string> = {
  serif: '"Noto Serif KR", "Nanum Myeongjo", "Batang", Georgia, serif',
  sans: 'system-ui, -apple-system, "Segoe UI", "Malgun Gothic", sans-serif',
  mono: 'ui-monospace, "SFMono-Regular", Menlo, Consolas, monospace',
};

export const ASPECT_OPTIONS = ["4:5", "1:1", "3:4", "16:9", "9:16", "auto"] as const;

export function aspectCss(aspect: string | undefined): string | undefined {
  if (!aspect || aspect === "auto") return undefined;
  const [w, h] = aspect.split(":").map(Number);
  return w > 0 && h > 0 ? `${w} / ${h}` : undefined;
}

export const isVideoUrl = (url: string) => /\.(mp4|webm|mov|m4v)(\?|$)/i.test(url);

// 평문(예전 intro_text/letter_text)을 리치 에디터가 읽을 수 있는 HTML로 — 줄바꿈 유지.
export function plainToHtml(text: string | null | undefined): string {
  if (!text) return "";
  const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  return text
    .split(/\n{2,}/)
    .map((p) => `<p>${esc(p).replace(/\n/g, "<br>")}</p>`)
    .join("");
}
