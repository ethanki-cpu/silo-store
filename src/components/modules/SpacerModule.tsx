// EPIC-060: Page Builder Module — Spacer. 다른 모듈 사이에 빈 세로 간격만
// 넣는다(콘텐츠 없음).
export function SpacerModule({ heightPx = 32 }: { heightPx?: number }) {
  return <div style={{ height: heightPx }} aria-hidden="true" />;
}
