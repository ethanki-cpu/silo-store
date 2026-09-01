// EPIC-155: 에디토리얼 매거진 스타일 인터랙티브 캘린더 — 타입 + 더미 데이터.
// 출석체크(attendance)와 사일로 이벤트(event) 두 목적을 동일한 구조로 표현한다.
export type CalendarEntryType = "attendance" | "event";

export type CalendarEntry = {
  /** YYYY-MM-DD */
  date: string;
  type: CalendarEntryType;
  title: string;
  description?: string;
  /** 리워드 텍스트(출석) 또는 시간/장소(이벤트) */
  meta?: string;
  /** 썸네일 그리드에 쓸 결정론적 그라디언트 시드(0~360) — 실제 이미지 URL 없이도
   * 항상 같은 톤이 나오게 날짜 문자열에서 해시로 뽑는다. */
  huesSeed?: number;
};

function hashToHue(seed: string): number {
  let h = 0;
  for (let i = 0; i < seed.length; i++) {
    h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  }
  return h % 360;
}

/** 데모/시연용 더미 데이터 — 실제 연동 전까지 이 컴포넌트가 자체적으로 완결된
 * 상태를 보여주기 위한 것. year/month(0-based)를 기준으로 몇 개의 출석/이벤트
 * 항목을 결정론적으로 흩뿌린다. */
export function buildDummyEntries(year: number, month: number): CalendarEntry[] {
  const pad = (n: number) => String(n).padStart(2, "0");
  const d = (day: number) => `${year}-${pad(month + 1)}-${pad(day)}`;

  const raw: Omit<CalendarEntry, "huesSeed">[] = [
    { date: d(2), type: "attendance", title: "출석 완료", meta: "+10P 적립" },
    { date: d(3), type: "attendance", title: "출석 완료", meta: "+10P 적립" },
    { date: d(4), type: "event", title: "Gardening Workshop", description: "사일로 정원에서 여는 소규모 원예 워크숍이에요.", meta: "10:00 · 사일로상점 2층" },
    { date: d(6), type: "event", title: "Family Fun Fair", description: "가족 단위 방문객을 위한 하루 종일 진행되는 축제.", meta: "종일 · 사일로 마당" },
    { date: d(8), type: "attendance", title: "출석 완료", meta: "+10P 적립" },
    { date: d(8), type: "event", title: "Open Mic Night", description: "누구나 무대에 설 수 있는 밤. 예약 필요.", meta: "22:00 · 살롱데상" },
    { date: d(11), type: "attendance", title: "출석 완료", meta: "+10P 적립" },
    { date: d(11), type: "event", title: "Seniors' Social Tea", description: "차와 함께하는 담소 모임.", meta: "15:30 · 살롱데상" },
    { date: d(14), type: "attendance", title: "출석 완료", meta: "+10P 적립" },
    { date: d(17), type: "event", title: "Culinary Cooking Class", description: "제철 재료로 배우는 계절 요리 클래스.", meta: "19:00 · 사일로상점" },
    { date: d(18), type: "event", title: "Gardening Workshop", description: "사일로 정원에서 여는 소규모 원예 워크숍이에요.", meta: "10:00 · 사일로상점 2층" },
    { date: d(20), type: "event", title: "Outdoor Adventure Day", description: "야외에서 즐기는 사일로의 하루.", meta: "종일" },
    { date: d(22), type: "attendance", title: "출석 완료", meta: "+10P 적립" },
    { date: d(23), type: "event", title: "Open Mic Night", description: "누구나 무대에 설 수 있는 밤. 예약 필요.", meta: "22:00 · 살롱데상" },
    { date: d(25), type: "attendance", title: "오늘 출석하기", meta: "출석하면 +10P" },
  ];

  return raw
    .filter((r) => {
      const day = Number(r.date.slice(-2));
      return day >= 1 && day <= new Date(year, month + 1, 0).getDate();
    })
    .map((r) => ({ ...r, huesSeed: hashToHue(r.date + r.title) }));
}
