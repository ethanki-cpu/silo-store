import type { AdminTreeRow } from "@/lib/adminTreeGrouping";

// EPIC-075: 관리자 트리 화면(페이지 관리/게시판 관리)의 드래그앤드롭 순서
// 변경은 "같은 브랜치 아래 항목들끼리만" 허용한다(다른 브랜치로 옮기는
// 재분류는 /admin/navigation의 CategoryTreeManager가 이미 담당하는 영역이라
// 여기서는 다루지 않음). `buildAdminTree`가 만드는 평평한 행 목록은 브랜치
// 헤더 다음에 그 브랜치의 직속 항목들이 곧바로 이어지는 순서를 보장하므로
// (adminTreeGrouping.ts 참고), 이 배열을 한 번 훑으며 "직전 브랜치 헤더"를
// 기준으로 항목 id를 묶기만 하면 각 브랜치의 형제 그룹을 정확히 복원할 수
// 있다.
export type AdminTreeSection = { branchId: string; itemIds: string[] };

export function computeAdminTreeSections<T extends { id: string }>(
  treeRows: AdminTreeRow<T>[],
): AdminTreeSection[] {
  const sections: AdminTreeSection[] = [];
  let current: AdminTreeSection | null = null;

  for (const row of treeRows) {
    if (row.kind === "branch") {
      current = { branchId: row.id, itemIds: [] };
      sections.push(current);
    } else if (current) {
      current.itemIds.push(row.item.id);
    }
  }

  return sections;
}

// 항목 id -> 그 항목이 속한 형제 그룹(같은 브랜치의 다른 항목 id 목록).
export function buildSiblingMap(sections: AdminTreeSection[]): Map<string, string[]> {
  const map = new Map<string, string[]>();
  for (const section of sections) {
    for (const id of section.itemIds) map.set(id, section.itemIds);
  }
  return map;
}
