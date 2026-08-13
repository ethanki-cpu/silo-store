"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { PageBuilderRenderer } from "@/components/PageBuilderRenderer";
import { PageEditButton } from "@/components/admin/PageEditButton";
import { fetchPublishedPageBySlug, type PageModuleRow } from "@/lib/pageBuilder";
import { usePageRankGate } from "@/lib/pageRankGate";
import { CraftShopRenderer } from "@/components/craft/shop/CraftShopRenderer";
import { CraftDocentRenderer } from "@/components/craft/docent/CraftDocentRenderer";

// EPIC-099(항목 3, Phase 2): 이 catch-all이 담당하는 slug 중 일부는
// builder_type='craft'일 수 있다 — 슬러그별로 어느 Craft 렌더러를 쓸지
// 여기 한 곳에만 등록한다(새 허브 페이지를 Craft로 옮길 때마다 이 목록에
// 한 줄만 추가하면 된다). 홈페이지(src/app/page.tsx)는 이 catch-all이
// 아니라 별도 파일이라 여기 포함되지 않는다.
const CRAFT_RENDERERS: Record<string, React.ComponentType<{ craftState?: string | null }>> = {
  "silo-store": CraftShopRenderer,
  "online-docent": CraftDocentRenderer,
};

// EPIC-068: 이 파일 이전까지는 src/app 전체가 138개의 손으로 만든 정적
// page.tsx뿐이었고, DB(site_navigations)에서 카테고리를 새로 만들어도 그
// href에 해당하는 물리적 라우트 파일이 없으면 그냥 404였다. 이 catch-all은
// 그 틈을 메운다 — 기존 정적/동적 라우트(예: /shop/[id], /boards/[id]) 전부
// Next.js가 이 catch-all보다 항상 먼저 매칭하므로, 이 파일은 "다른 어떤
// page.tsx와도 매치되지 않는 경로"에서만 동작한다(기존 138개 라우트는 전혀
// 영향받지 않음).
//
// 경로 세그먼트를 대시로 이어붙여 기존 138개 slug와 동일한 규칙
// (pageTemplates.ts의 hrefToSlug와 동일 로직)으로 slug를 만들고,
// page_builder에 그 slug의 published 행이 있으면 위젯을 그대로 렌더링한다
// — 나머지 57개 순수 위젯 페이지(예: src/app/gallery/page.tsx)와 동일한
// 패턴. 다만 이 페이지 하나가 모든 slug를 담당하므로(다른 페이지들처럼
// slug가 고정이 아니라 params에 따라 바뀜) fetch 결과를 slug와 함께
// 저장해서, 아직 새 slug의 데이터가 도착하지 않았을 때 이전 slug의 화면이
// 잠깐 남아있는 것(stale flash)을 막는다 — effect 안에서 곧바로
// setState하지 않고(react-hooks/set-state-in-effect 규칙과 충돌) 렌더링
// 시점에 state.slug와 현재 slug를 비교하는 방식으로 처리했다.
type PageState =
  | {
      slug: string;
      status: "ready";
      modules: PageModuleRow[];
      minRankToRead: number | null;
      builderType: "native" | "craft";
      craftState: string | null;
    }
  | { slug: string; status: "notfound" };

export default function DynamicPage() {
  const params = useParams<{ slug: string[] }>();
  const slug = (params.slug ?? []).join("-").toLowerCase();

  const [state, setState] = useState<PageState>({ slug: "", status: "notfound" });

  useEffect(() => {
    let cancelled = false;
    fetchPublishedPageBySlug(slug).then((result) => {
      if (cancelled) return;
      if (!result) {
        setState({ slug, status: "notfound" });
        return;
      }
      setState({
        slug,
        status: "ready",
        modules: result.modules ?? [],
        minRankToRead: result.page.min_rank_to_read ?? null,
        builderType: result.page.builder_type,
        craftState: result.page.craft_state ?? null,
      });
    });
    return () => {
      cancelled = true;
    };
  }, [slug]);

  usePageRankGate(state.slug === slug && state.status === "ready" ? state.minRankToRead : undefined);

  if (state.slug !== slug) {
    return <main className="flex-1 p-8 bg-white">불러오는 중...</main>;
  }

  if (state.status === "notfound") {
    return (
      <main className="flex-1 p-8 bg-white">
        <p className="text-gray-500">페이지를 찾을 수 없어요.</p>
      </main>
    );
  }

  // EPIC-099(항목 3, Phase 2): builder_type이 'craft'고 이 slug용 Craft
  // 렌더러가 등록돼 있으면(CRAFT_RENDERERS) 그 렌더러 하나가 페이지 전체를
  // 그린다 — 홈페이지(src/app/page.tsx)와 동일한 분기 원칙. 등록되지 않은
  // slug가 실수로 'craft'가 되면(아직 이 catch-all에 렌더러를 안 붙인 페이지)
  // 조용히 native로 폴백해 빈 화면 대신 기존 위젯이 그대로 보이게 한다.
  const CraftRenderer = state.builderType === "craft" ? CRAFT_RENDERERS[slug] : undefined;

  if (CraftRenderer) {
    return (
      <>
        <PageEditButton slug={slug} />
        <CraftRenderer craftState={state.craftState} />
      </>
    );
  }

  return (
    <>
      <PageEditButton slug={slug} />
      {/* EPIC-093(요구사항 1.2): 새로 만들어지는(page_builder 기반) 페이지의
          기본 컨테이너가 max-w-3xl + px-6로 화면 양옆에 원치 않는 여백을
          만들던 것 — 이 catch-all이 그런 페이지 전부의 "기본값"이므로 여기서
          여백을 0으로 강제한다. 위젯 각각(HeroModule 등)이 자체 내부
          여백/max-width를 가진 경우 그 값은 그대로 유지된다. */}
      <main className="flex-1 bg-white p-0">
        <div className="w-full">
          <PageBuilderRenderer modules={state.modules} />
        </div>
      </main>
    </>
  );
}
