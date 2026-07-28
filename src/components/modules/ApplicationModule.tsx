import { CtaButtons } from "@/components/modules/CtaButtons";

// EPIC-056: Board Module 목록 ⑫ Application Module — 신청 버튼/예약 버튼.
// CtaButtons(EPIC-054B, "문의하기"/"예약하기" 등 BoardDefinition.ctas를
// 그대로 렌더링하던 컴포넌트)를 그대로 재사용한 이름 있는 alias다 — 새
// 예약 시스템/새 버튼 컴포넌트를 만들지 않는다.
export function ApplicationModule({
  actions,
}: {
  actions: { label: string; href: string }[];
}) {
  return <CtaButtons ctas={actions} />;
}
