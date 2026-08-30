"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { PageBuilderRenderer } from "@/components/PageBuilderRenderer";
import { PageEditButton } from "@/components/admin/PageEditButton";
import { fetchPublishedPageBySlug, type PageModuleRow } from "@/lib/pageBuilder";
import { usePageRankGate } from "@/lib/pageRankGate";
import { CraftShopRenderer } from "@/components/craft/shop/CraftShopRenderer";
import { CraftDocentRenderer } from "@/components/craft/docent/CraftDocentRenderer";
import { CraftSalonRenderer } from "@/components/craft/salon/CraftSalonRenderer";
import { CraftGenericRenderer } from "@/components/craft/generic/CraftGenericRenderer";

// EPIC-099(항목 3, Phase 2): 이 catch-all이 담당하는 slug 중 일부는
// builder_type='craft'일 수 있다 — 슬러그별로 어느 Craft 렌더러를 쓸지
// 여기 한 곳에만 등록한다(새 허브 페이지를 Craft로 옮길 때마다 이 목록에
// 한 줄만 추가하면 된다). 홈페이지(src/app/page.tsx)처럼 정적 라우트 파일이
// 따로 있는 slug(studio/mypage)는 Next.js가 이 catch-all보다 먼저 그 파일을
// 매칭해 여기 등록해도 절대 호출되지 않는다 — 그런 slug는 각자의
// page.tsx(src/app/studio/page.tsx 등)에 직접 분기를 넣었으므로 여기 포함하지
// 않는다(죽은 코드 방지).
const CRAFT_RENDERERS: Record<string, React.ComponentType<{ craftState?: string | null }>> = {
  "silo-store": CraftShopRenderer,
  "online-docent": CraftDocentRenderer,
  "salon-des-cent": CraftSalonRenderer,
  // HOTFIX-147.3(사용자 지시 — "고대~왕정/혁명~제국/프로이트~대중문화/
  // 디지털~A.i 문화 페이지들에도 craft 에디터가 페이지 수정에 가능하게
  // 해줘"): 이 4개는 온라인 도슨트의 2단계 카테고리 페이지 — craft_state를
  // 직접 채워뒀으므로(HeroSlideshowWidgetBlock+SiloTimelineEmbedBlock,
  // group 모드) docentDefaultTree(EraGridBlock 등, 최상위 온라인 도슨트
  // 전용)는 폴백으로도 쓰이지 않는다. resolver/렌더러 셸 자체는 이미
  // 범용이라 CraftDocentRenderer를 그대로 재사용한다.
  "online-docent-ancient-monarchy": CraftDocentRenderer,
  "online-docent-revolution-empire": CraftDocentRenderer,
  "online-docent-freud-pop": CraftDocentRenderer,
  "online-docent-digital-ai": CraftDocentRenderer,
  // HOTFIX-151.3(사용자 지시 — 사이트 구성관리에서 새 카테고리 "고대 문명 ~
  // 침략"을 만들고 craft_state를 채워줬는데, 이 목록에 등록하지 않으면
  // builder_type='craft'여도 조용히 native로 폴백해(위 주석) 애써 만든
  // 타임라인이 안 보인다.
  "online-docent-ancient-invade": CraftDocentRenderer,
  // HOTFIX-151.12(사용자 지시 — "5개 카테고리의 '페이지 수정'에 craft
  // 에디터가 없잖아"): 지금까지 리프(하위) 카테고리 페이지는 전부
  // builder_type='native'라 애초에 Craft 에디터 자체가 없었다(허브
  // 페이지만 craft였음) — 이 5개를 craft로 전환하고 기존 게시판 임베드는
  // SiloTimelineEmbedBlock(mode="board")로 그대로 옮겨 시각적으로 동일하게
  // 유지하면서 자유편집(배경/모션/자세히 보기 등)을 쓸 수 있게 했다.
  "online-docent-ancient-invade-egyptians": CraftDocentRenderer,
  "online-docent-ancient-invade-babylon": CraftDocentRenderer,
  "online-docent-ancient-invade-greeks": CraftDocentRenderer,
  "online-docent-empire-monarchy-romans": CraftDocentRenderer,
  "online-docent-empire-monarchy-byzantine": CraftDocentRenderer,
  // HOTFIX-152.17(사용자 신고 — "온라인 도슨트의 최하위 카테고리중에
  // 르네상스/바로크/로코코가 craft 에디터가 연결이 안되어있어, 그리고
  // 혁명~식민지의 하위 카테고리부터 craft 에디터가 안나와 전부"):
  // HOTFIX-151.12가 "제국~군주"/"고대 문명~침략" 밑 5개 리프만 craft로
  // 전환하고 나머지 두 허브("혁명~식민지"/"프로이트~대중문화") 밑 리프
  // 12개는 그대로 native로 남겨뒀던 것 — 같은 패턴(기존 board 위젯을
  // SiloTimelineEmbedBlock mode="board"로 그대로 옮김)으로 전부 전환.
  "online-docent-empire-monarchy-renaissance": CraftDocentRenderer,
  "online-docent-empire-monarchy-baroque": CraftDocentRenderer,
  "online-docent-empire-monarchy-rococo": CraftDocentRenderer,
  "online-docent-revolution-colonial-neoclassicism": CraftDocentRenderer,
  "online-docent-revolution-colonial-regency": CraftDocentRenderer,
  "online-docent-revolution-colonial-victorian": CraftDocentRenderer,
  "online-docent-revolution-colonial-impressionism": CraftDocentRenderer,
  "online-docent-freud-pop-art-nouveau": CraftDocentRenderer,
  "online-docent-freud-pop-art-deco": CraftDocentRenderer,
  "online-docent-freud-pop-beat-generation": CraftDocentRenderer,
  "online-docent-freud-pop-counterculture": CraftDocentRenderer,
  "online-docent-freud-pop-pop-culture": CraftDocentRenderer,
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
  // 그린다 — 홈페이지(src/app/page.tsx)와 동일한 분기 원칙.
  // HOTFIX-152.18(사용자 지시 — "페이지가 만들어질때 craft 에디터를
  // default로 깔아"): 이전엔 화이트리스트에 없는 slug가 'craft'면 "조용히
  // native로 폴백"했다 — 이제 새 카테고리는 전부 craft로 만들어지므로(아래
  // ensurePageForSlug), 화이트리스트에 없는 대부분의 새 페이지가 이 폴백을
  // 타게 된다. native로 폴백하는 대신 CraftGenericRenderer(페이지 전용
  // 블록 없이 범용 요소만 쓰는 Craft 렌더러)로 폴백해, 굳이 이 파일에
  // 한 줄씩 등록하지 않아도 모든 새 페이지가 곧바로 Craft로 보인다.
  // 특정 섹션 전용 블록(SiloTimelineEmbedBlock 등 특별한 조합)이 필요해지면
  // 그때 CraftDocentRenderer 같은 전용 렌더러를 만들어 여기 등록하면 된다.
  const CraftRenderer = state.builderType === "craft" ? (CRAFT_RENDERERS[slug] ?? CraftGenericRenderer) : undefined;

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
