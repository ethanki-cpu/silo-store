"use client";

// HOTFIX-132.1(사용자 신고 — BuilderJS 레퍼런스 스크린샷과 비교하며
// "그동안 네가 만든게 너무 맘에 안들어서 다시 만들라"): 실제로 캔버스를
// 클릭하면 선택은 되고(우측 설정 패널이 뜸) 값도 실시간으로 바뀌지만,
// 클릭한 블록 자체에 아무 시각적 표시가 없어서 "지금 뭘 선택했는지"가
// 안 보였다 — BuilderJS 등 상용 페이지 빌더는 선택된 블록에 테두리+
// 이름표가 뜬다. 각 편집 가능한 요소 안에 이 오버레이를 겹쳐(pointer-events:
// none이라 실제 클릭/hover는 그대로 콘텐츠에 전달됨) 선택/호버 상태를
// 보이게 한다.
// EPIC-136(헤더 재구축): 원래 Craft.js 전용(chrome/ 폴더)이었으나, 이
// 컴포넌트 자체는 Craft에 의존하지 않는 순수 프레젠테이션이라 헤더가
// Craft를 쓰지 않는 방식으로 바뀐 뒤에도 그대로 재사용할 수 있어 공용
// 위치로 옮겼다(이름은 하위 호환을 위해 유지하지 않고 SelectionOverlay로
// 정리 — 이 시점 기준 Craft 크롬 블록 전체가 삭제되어 옛 이름을 참조하는
// 곳이 없다).
export function SelectionOverlay({
  selected,
  hovered,
  label,
}: {
  selected: boolean;
  hovered: boolean;
  label: string;
}) {
  if (!selected && !hovered) return null;
  return (
    <>
      <div
        className={`pointer-events-none absolute inset-0 rounded-sm ${
          selected ? "ring-2 ring-blue-500" : "ring-1 ring-blue-300"
        }`}
      />
      {selected && (
        <div className="pointer-events-none absolute -top-6 left-0 z-10 whitespace-nowrap rounded bg-blue-500 px-2 py-0.5 text-[10px] font-medium text-white shadow">
          {label}
        </div>
      )}
    </>
  );
}
