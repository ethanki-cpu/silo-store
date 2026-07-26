import { EmptyState } from "../EmptyState";

// 이번 EPIC(EPIC-022)에서 데이터 소스가 지정되지 않은 탭(나의 살롱 / 나의
// 도슨트 수료증 / 나의 공간 / 나의 전시회 / 타임라인)에 공통으로 쓰는
// Empty State 전용 패널. 추측성 스키마/연동 없이 "준비 중" 상태만 표시한다.
export function PlaceholderPanel({ label }: { label: string }) {
  return <EmptyState message={`${label} 기능은 준비 중입니다.`} />;
}
