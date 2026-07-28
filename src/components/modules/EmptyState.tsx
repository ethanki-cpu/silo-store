// EPIC-054C: Board/Page에 실제로 보여줄 콘텐츠가 없을 때 쓰는 공용 Empty
// State — "준비 중입니다"류 Placeholder Module과는 다르다(그건 화면 자체가
// 아직 없다는 뜻이고, 이건 화면은 있지만 데이터가 0건이라는 뜻). 게시글이
// 없는 게시판(BoardRenderer)과 모듈이 없는 Page(PageModuleRenderer)가 이
// 컴포넌트 하나를 공유한다.
export function EmptyState({
  title = "아직 콘텐츠가 없어요.",
  description,
}: {
  title?: string;
  description?: string;
}) {
  return (
    <div className="rounded-lg border border-dashed border-gray-200 py-16 text-center">
      <p className="text-gray-400">{title}</p>
      {description && <p className="text-sm text-gray-300 mt-1">{description}</p>}
    </div>
  );
}
