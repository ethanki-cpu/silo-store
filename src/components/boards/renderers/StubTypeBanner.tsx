// EPIC-066: Survey/Calendar/Application 3개 Board Type은 이 코드베이스에
// 데이터 모델이 아직 없다(Page Builder의 survey/calendar 위젯도 boards와
// 무관한 정적 데모) — 관리자가 즉시 선택/전환은 할 수 있도록 안내 배너 +
// 기존 글 목록으로 스텁 처리하고, 실제 투표 집계/날짜별 보기/신청서 제출
// 흐름은 별도 후속 EPIC으로 NEXT_TASK.md에 남긴다.
export function StubTypeBanner({ emoji, message }: { emoji: string; message: string }) {
  return (
    <div className="mb-6 rounded-lg border border-dashed border-amber-300 bg-amber-50 p-4 text-sm text-amber-700">
      {emoji} {message}
    </div>
  );
}
