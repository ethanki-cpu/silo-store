import { EmptyState } from "@/components/modules/EmptyState";

// EPIC-066: "Board Empty Component" — 요구된 문구("아직 게시글이
// 없습니다"/"첫 글을 작성해보세요")로 EmptyState를 감싸는 이름 있는
// 래퍼. 글쓰기가 막힌 게시판(공지/자료 등)에서는 "작성해보세요" 문구가
// 어색해 allowPosting일 때만 description을 붙인다.
export function BoardEmptyState({ allowPosting = true }: { allowPosting?: boolean }) {
  return (
    <EmptyState
      title="아직 게시글이 없습니다."
      description={allowPosting ? "첫 글을 작성해보세요." : undefined}
    />
  );
}
