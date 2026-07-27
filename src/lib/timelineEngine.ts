// Timeline Engine (EPIC-050/052): 연→월 순으로 항목을 묶는 범용 그룹핑
// 로직. 처음엔 "타임라인" 게시판(BoardRenderer.tsx)만을 위해 만들었지만,
// 마이페이지 타임라인 탭(EPIC-052)도 게시글이 아닌 다양한 활동(글 작성/
// 댓글/좋아요/출석/예약/팔로우 등)을 같은 방식으로 묶어야 해서, "정렬된
// {id, createdAt} 목록"이라는 최소 계약만 요구하도록 게시판 도메인에서
// 분리했다 — BoardRenderer.tsx의 TimelineView와 마이페이지 타임라인 패널이
// 이 함수 하나를 그대로 공유한다(중복 구현 없음).
export type TimelineEntry = {
  id: string;
  createdAt: string;
};

export function groupByYearMonth<T extends TimelineEntry>(
  entries: T[],
): Map<string, Map<string, T[]>> {
  const byYear = new Map<string, Map<string, T[]>>();

  for (const entry of entries) {
    const date = new Date(entry.createdAt);
    const year = String(date.getFullYear());
    const month = String(date.getMonth() + 1).padStart(2, "0");

    if (!byYear.has(year)) byYear.set(year, new Map());
    const byMonth = byYear.get(year)!;
    if (!byMonth.has(month)) byMonth.set(month, []);
    byMonth.get(month)!.push(entry);
  }

  return byYear;
}
