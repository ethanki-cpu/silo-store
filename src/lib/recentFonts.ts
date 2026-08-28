// HOTFIX-151.3(사용자 지시 — "폰트를 골랐으면, 최근 마지막으로 폰트를
// 고른곳부터 드롭다운이 시작되도록 하고, 가장 맨 위에는, 최근 사용된
// 폰트를 보이도록 해. 8개까지"): FontPicker 드롭다운 맨 위에 "최근 사용"
// 섹션을 고정해 항상 스크롤 없이 바로 보이게 한다(별도의 "목록을 특정
// 위치로 자동 스크롤"보다 간단하고 요구를 그대로 충족). 여러 기기를 오가는
// 프로젝트지만 이건 순수 UI 편의 기능이라 DB 컬럼/마이그레이션 없이
// localStorage로 가볍게 구현 — 기기별로 달라도 무방하다.
const KEY = "silo:recentFontNames";
const MAX = 8;

export function getRecentFontNames(): string[] {
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((v): v is string => typeof v === "string") : [];
  } catch {
    return [];
  }
}

export function recordFontUsage(fontName: string): void {
  if (!fontName) return;
  try {
    const next = [fontName, ...getRecentFontNames().filter((name) => name !== fontName)].slice(0, MAX);
    window.localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    // 시크릿 모드 등 localStorage를 못 쓰는 환경 — 조용히 무시(순수 편의 기능이라 필수 아님)
  }
}
