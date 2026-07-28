import { PageHeaderContent } from "@/components/PageHeader";
import type { BreadcrumbItem } from "@/components/PageHeader";

// EPIC-056: Board Module 목록 ① Hero Module — 페이지 제목/설명/Breadcrumb.
// PageHeaderContent(EPIC-054A/054F)를 그대로 재사용한 이름 있는 alias다 —
// 새 마크업 없음, "Hero Module"이라는 이름으로 다른 Board Module들과
// 나란히 조합될 수 있도록 재노출(re-export)만 한다.
export function HeroModule(props: {
  title: string;
  subtitle?: string;
  breadcrumb: BreadcrumbItem[];
  description: string;
}) {
  return <PageHeaderContent {...props} />;
}

export type { BreadcrumbItem };
