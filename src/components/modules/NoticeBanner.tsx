import type { NoticeModuleProps } from "@/lib/pageModules";

// EPIC-054B: Page Module "Notice" — docs/design-system.md §1의 기존
// 정보/오류 배너 팔레트(bg-blue-50/bg-red-50)를 그대로 재사용한 순수
// 프레젠테이션 컴포넌트. 데이터 조회 없음.
export function NoticeBanner({ title, body, tone = "info" }: NoticeModuleProps) {
  const toneClass =
    tone === "warning"
      ? "border-red-300 bg-red-50 text-red-700"
      : "border-blue-200 bg-blue-50 text-blue-700";

  return (
    <div className={`rounded-lg border p-4 ${toneClass}`}>
      <p className="font-semibold text-sm">{title}</p>
      <p className="text-sm mt-1">{body}</p>
    </div>
  );
}
