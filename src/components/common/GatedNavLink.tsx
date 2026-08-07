"use client";

import Link from "next/link";
import type { ComponentProps, MouseEvent } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/AuthProvider";
import { supabase } from "@/lib/supabaseClient";
import { RANK_OPTIONS } from "@/lib/membershipTiers";

// EPIC-088: 메뉴별 티어 접근 제어 — 사이트 메뉴 항목은 등급과 무관하게
// 항상 노출하되(요구사항 원문), 클릭한 순간 로그인 회원의 등급이 그 메뉴에
// 연결된 페이지의 min_rank_to_read(navConfig.ts의 minRankToRead, "사이트
// 구성 관리"에서 페이지/게시판별로 직접 편집)에 못 미치면 이동을 막고
// 안내 후 멤버십 안내 페이지로 보낸다. src/lib/pageRankGate.ts(도착 후
// 게이트)와 같은 site_settings.membership_guide_redirect를 재사용해 두
// 경로가 항상 같은 안내 페이지로 귀결되게 한다.
function rankLabel(rank: number): string {
  return RANK_OPTIONS.find((o) => o.rank === rank)?.label ?? `등급 ${rank}`;
}

export function GatedNavLink({
  href,
  minRankToRead,
  onClick,
  children,
  ...rest
}: {
  href: string;
  minRankToRead?: number | null;
  onClick?: (e: MouseEvent<HTMLAnchorElement>) => void;
  children: React.ReactNode;
} & Omit<ComponentProps<typeof Link>, "href" | "onClick">) {
  const router = useRouter();
  const { session, member, loading, memberLoading } = useAuth();

  async function handleClick(e: MouseEvent<HTMLAnchorElement>) {
    if (minRankToRead == null) {
      onClick?.(e);
      return;
    }
    // 로그인/회원 정보 로딩 중엔 등급 미달로 성급히 판단하지 않는다
    // (usePageRankGate와 동일한 memberLoading 가드 — 목적지 페이지가 있다면
    // 거기서 다시 한 번 최종 판정한다).
    if (loading || memberLoading) {
      onClick?.(e);
      return;
    }
    const rank = session && member ? member.membership_rank : -1;
    if (rank >= minRankToRead) {
      onClick?.(e);
      return;
    }

    e.preventDefault();
    alert(`이 메뉴는 ${rankLabel(minRankToRead)} 등급부터 이용할 수 있어요.`);
    const { data } = await supabase
      .from("site_settings")
      .select("setting_value")
      .eq("setting_key", "membership_guide_redirect")
      .maybeSingle();
    const url = (data?.setting_value as { url?: string } | null)?.url || "/membership";
    router.push(`${url}?gate=${minRankToRead}`);
  }

  return (
    <Link href={href} onClick={handleClick} {...rest}>
      {children}
    </Link>
  );
}
