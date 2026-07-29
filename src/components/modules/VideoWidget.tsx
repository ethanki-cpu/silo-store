// EPIC-065: Widget Builder — Video 위젯. shop/projects/[id]/page.tsx가
// 이미 쓰던 <video controls> 마크업을 그대로 재사용한다(새 플레이어 없음).
//
// EPIC-067-HOTFIX: url이 비어 있을 때 조용히 null을 반환하던 것을 다른
// 데이터 의존 위젯(Board/Gallery/Timeline의 EmptyBoardHint 등)과 동일하게
// 안내 placeholder로 교체 — Video는 board_id 계열이 아니라 위젯 추가 시
// 설정 화면이 자동으로 열리지 않아(AdminPageEditorPage의 needsBoard 분기),
// url을 아직 입력하지 않은 상태에서 화면에 아무 표시도 없으면 운영자가
// "위젯이 고장났다"고 오인하기 쉬웠다.
export function VideoWidget({ url, caption }: { url: string; caption?: string }) {
  if (!url) {
    return (
      <p className="text-gray-400 text-sm">영상 URL이 아직 설정되지 않았어요.</p>
    );
  }
  return (
    <figure>
      <video src={url} controls className="w-full rounded-lg bg-black" />
      {caption && <figcaption className="mt-2 text-xs text-gray-500 text-center">{caption}</figcaption>}
    </figure>
  );
}
