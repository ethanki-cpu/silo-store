// EPIC-105: 기존 site_settings.footer_config를 읽던 클라이언트 컴포넌트
// Footer.tsx를, 다른 Craft 페이지들과 동일한 page_builder(slug="footer")
// 기반 Craft 렌더러로 교체 — 관리자가 이제 /admin/footer에서 폼이 아니라
// 자유 레이아웃 Craft 에디터로 편집한다. 루트 레이아웃이 Server Component라
// 여기서도 그대로 서버에서 조회해 내려준다(홈페이지 page.tsx와 동일한 패턴).
import { fetchPublishedPageBySlug } from "@/lib/pageBuilder";
import { CraftPageRenderer } from "@/components/craft/shared/CraftPageRenderer";
import { craftFooterResolver } from "@/components/craft/footer/resolver";
import { footerDefaultTree } from "@/components/craft/footer/defaultTree";

export async function GlobalFooter() {
  const footerPage = await fetchPublishedPageBySlug("footer");

  return (
    <CraftPageRenderer
      resolver={craftFooterResolver}
      craftState={footerPage?.page.craft_state}
      defaultTree={footerDefaultTree}
    />
  );
}
