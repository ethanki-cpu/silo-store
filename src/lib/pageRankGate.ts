"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/AuthProvider";
import { supabase } from "@/lib/supabaseClient";

// EPIC-087-PHASE-C: 페이지별 최소 열람 등급 게이트 — page_builder.min_rank_to_read.
// 이 프로젝트엔 middleware가 없어(client-only auth, CLAUDE.md 참고) 각 페이지의
// Client Component 안에서 useAuth()로 직접 판정한다. 게시판의 기존
// inline-lock 관례와 달리, 여기는 안내 메시지+리다이렉트로 처리한다(사용자
// 확인 완료). src/app/[...slug]/page.tsx(catch-all)와, 그 도입 이전부터
// 있던 74개 "손으로 만든" 정적 page.tsx(fetchPublishedPageBySlug를 페이지
// 전체 콘텐츠로 직접 호출하는 단순 템플릿)가 공유해서 쓴다 — 게시글/상품
// 상세처럼 fetchPublishedPageBySlug가 페이지의 "일부"(보조 위젯 슬롯)일
// 뿐인 하이브리드 페이지(예: boards/[board_slug], shop/[id], clubs/[id])는
// 이 훅을 쓰지 않는다(그 슬롯 하나 때문에 페이지 전체를 리다이렉트하면
// 안 됨 — 게시판은 자체 min_rank_to_read+inline-lock으로 이미 게이팅됨).
export function usePageRankGate(minRankToRead: number | null | undefined) {
  const router = useRouter();
  const { session, member, loading, memberLoading } = useAuth();

  useEffect(() => {
    if (minRankToRead == null) return;
    // memberLoading까지 기다려야 한다 — session은 있는데 member row가 아직
    // 안 채워진 순간(rank=null 취급)에 성급히 리다이렉트하면 등급 충분한
    // 로그인 사용자도 튕겨나간다(CLAUDE.md에 기록된 기존 재발 버그와 동일 종류).
    if (loading || memberLoading) return;

    const rank = session && member ? member.membership_rank : -1;
    if (rank >= minRankToRead) return;

    let cancelled = false;
    supabase
      .from("site_settings")
      .select("setting_value")
      .eq("setting_key", "membership_guide_redirect")
      .maybeSingle()
      .then(({ data }) => {
        if (cancelled) return;
        const url = (data?.setting_value as { url?: string } | null)?.url || "/membership";
        router.replace(`${url}?gate=${minRankToRead}`);
      });
    return () => {
      cancelled = true;
    };
  }, [minRankToRead, session, member, loading, memberLoading, router]);
}
