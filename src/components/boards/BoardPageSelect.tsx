"use client";

import type { BoardOption } from "@/lib/useBoardOptions";
import type { AdminTreeRow } from "@/lib/adminTreeGrouping";

// EPIC-079-PHASE-4: "게시될 페이지 선택" 드롭다운 — 글쓰기(write)에서만
// 쓰이던 것을 글 수정(edit)에서도 동일하게 재사용한다(하드코딩된 옛
// "카테고리" 드롭다운 대체).
//
// EPIC-079-PHASE-5: (1) 예전엔 "목록에 현재 값이 없으면 로딩 중"이라고
// 추론해 잠긴 게시판처럼 진짜로 목록에 없는 값이면 "불러오는 중..."에
// 영원히 갇혔다 — 이제 useBoardOptions가 넘겨주는 실제 loading/error를
// 그대로 쓴다. (2) 단순 나열 대신 "사이트 구성 관리"와 동일한
// site_navigations 트리 순서/깊이(adminTreeGrouping.ts)로 들여쓰기해
// 보여준다 — 브랜치(가지) 행은 선택 불가능한 섹션 헤더로, 그 아래 게시판은
// depth만큼 들여쓴다.
export function BoardPageSelect({
  tree,
  loading,
  error,
  value,
  onChange,
  label = "게시될 페이지 선택",
}: {
  tree: AdminTreeRow<BoardOption>[];
  loading: boolean;
  error: string | null;
  value: string;
  onChange: (slug: string) => void;
  label?: string;
}) {
  const hasValueOption = tree.some(
    (row) => row.kind === "item" && (row.item.slug ?? row.item.id) === value,
  );

  return (
    <div>
      <label className="block text-sm mb-1">{label}</label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={loading}
        className="w-full rounded-md border border-gray-300 px-3 py-2 disabled:bg-gray-50 disabled:text-gray-400"
      >
        {loading && <option value={value}>불러오는 중...</option>}
        {/* EPIC-084: Contextual Write(/write, boardId 없이 진입)처럼 아직
            아무 게시판도 선택 안 된 상태(value === "") — 빈 문자열 옵션을
            명시적으로 넣어 "선택 안 됨"이 브라우저에서 빈 화면 대신 안내
            문구로 보이게 한다. */}
        {!loading && !value && <option value="">게시판을 선택하세요</option>}
        {/* 로딩은 끝났는데 현재 값이 목록에 없는 경우(예: 이 사용자에게
            잠긴 게시판) — 선택값 자체는 잃지 않도록 임시 옵션을 끼워 넣되,
            "불러오는 중"이라는 오해를 주지 않는다. */}
        {!loading && !hasValueOption && value && <option value={value}>{value}</option>}
        {!loading &&
          tree.map((row) =>
            row.kind === "branch" ? (
              <option key={`branch-${row.id}`} disabled>
                {"　".repeat(row.depth)}▸ {row.title}
              </option>
            ) : (
              <option key={row.item.id} value={row.item.slug ?? row.item.id}>
                {"　".repeat(row.depth)}
                {row.item.name}
              </option>
            ),
          )}
      </select>
      {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
    </div>
  );
}
