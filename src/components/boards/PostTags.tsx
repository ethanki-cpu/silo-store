// EPIC-046: 태그 영역 — posts 테이블에 별도 태그 컬럼을 추가하지 않고
// (스키마 변경 최소화 원칙), 이미 존재하는 게시판/글 메타데이터(게시판
// 카테고리, 도슨트/개념글 여부)를 태그 칩으로 파생 표시한다.
export function PostTags({ tags }: { tags: string[] }) {
  if (tags.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-2 mt-4">
      {tags.map((tag) => (
        <span
          key={tag}
          className="rounded-full border border-gray-300 text-gray-500 text-xs px-2.5 py-1"
        >
          #{tag}
        </span>
      ))}
    </div>
  );
}
