import type { Metadata } from "next";
import { supabase } from "@/lib/supabaseClient";
import { extractPostMetadata } from "@/lib/utils/extractPostMetadata";
import type { JSONContent } from "@/lib/blockEditorCore";
import { getNavNodeForBoardId, getAncestorChain } from "@/lib/siteTree";
import type { BreadcrumbItem } from "@/components/PageHeader";
import { PostDetailClient } from "./PostDetailClient";

// EPIC-085: Dynamic SEO & Open Graph — 실제 화면(PostDetailClient)은 여전히
// 전부 클라이언트에서 fetch하지만, generateMetadata는 Server Component에서만
// 동작하므로 이 얇은 서버 래퍼가 그 역할만 따로 맡는다. 여기서 하는 조회는
// anon 클라이언트 하나뿐(별도 인증 없음 — posts의 공개 select RLS로 충분,
// patron 전용 등 비공개 글은 조회 결과가 없어 기본 사이트 설명으로 자연히
// 폴백된다)이라 실제 페이지 렌더링에 필요한 무거운 조회(댓글/좋아요 등)와는
// 무관하다.
export async function generateMetadata({
  params,
}: {
  params: Promise<{ board_slug: string; post_slug: string }>;
}): Promise<Metadata> {
  const { board_slug: boardSlug, post_slug: postSlug } = await params;

  const { data: board } = await supabase
    .from("boards")
    .select("id")
    .eq("slug", boardSlug)
    .maybeSingle();

  if (!board) return {};

  const { data: post } = await supabase
    .from("posts")
    .select("title, body_json, featured_image_url")
    .eq("board_id", (board as { id: string }).id)
    .eq("slug", postSlug)
    .maybeSingle();

  if (!post) return {};

  const { title, body_json, featured_image_url } = post as {
    title: string;
    body_json: JSONContent | null;
    featured_image_url: string | null;
  };

  const { description, ogImage } = extractPostMetadata(body_json, {
    fallbackImage: featured_image_url,
  });

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: "article",
      ...(ogImage ? { images: [{ url: ogImage }] } : {}),
    },
    twitter: {
      card: ogImage ? "summary_large_image" : "summary",
      title,
      description,
      ...(ogImage ? { images: [ogImage] } : {}),
    },
  };
}

// EPIC-092(요구사항 8): 게시글 상세의 브레드크럼은 board_id → site_navigations
// 역추적이 필요해(직접 FK 없음, src/lib/siteTree.ts 참고) 전역 <Breadcrumb>
// (layout.tsx, pathname 매칭)이 처리하지 못한다 — 여기서 서버 사이드로 미리
// 계산해 클라이언트에 prop으로 내려줘 별도 클라이언트 fetch를 피한다.
export default async function PostDetailPage({
  params,
}: {
  params: Promise<{ board_slug: string; post_slug: string }>;
}) {
  const { board_slug: boardSlug } = await params;

  let breadcrumb: BreadcrumbItem[] = [];
  const { data: board } = await supabase.from("boards").select("id").eq("slug", boardSlug).maybeSingle();
  if (board) {
    const navNode = await getNavNodeForBoardId((board as { id: string }).id);
    if (navNode) breadcrumb = await getAncestorChain(navNode.id);
  }

  return <PostDetailClient breadcrumb={breadcrumb} />;
}
