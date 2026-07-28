// EPIC-060: Page Builder Module — HTML. 관리자가 직접 입력한 raw HTML을
// 그대로 렌더링한다. 신뢰 경계: page_modules.settings는 RLS상 is_admin만
// 쓸 수 있으므로(docs/sql/EPIC-060-page-builder.sql의 admin_write 정책),
// 여기 들어오는 HTML은 항상 관리자 본인이 입력한 콘텐츠다 — site_settings의
// main_logo 등 기존 관리자 전용 자유 입력값들과 동일한 신뢰 모델이며,
// 일반 회원 입력값을 이 경로로 절대 흘려보내면 안 된다.
export function HtmlModule({ html }: { html: string }) {
  return <div dangerouslySetInnerHTML={{ __html: html }} />;
}
