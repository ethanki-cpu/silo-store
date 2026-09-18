"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/lib/AuthProvider";
import { supabase } from "@/lib/supabaseClient";

// EPIC-060: "모든 페이지 우측 상단 '페이지 수정' 버튼(admin만)" — Page
// Builder로 등록된 페이지(page_builder.slug)에 한해, 관리자에게만 우측
// 상단 고정 버튼을 보여주고 /admin/pages/[id]로 연결한다. page_builder에
// 해당 slug 행이 없으면(테이블 미생성 포함) 버튼 자체를 렌더링하지 않는다
// — 존재하지 않는 페이지로 링크를 걸지 않기 위함.
// EPIC-089(요구사항 3): 게시글 상세 페이지는 이 버튼을 기존 우측 상단
// 고정 위치 대신 본문 상단 좌측(원래 "목록으로"가 있던 자리)에 인라인으로
// 배치해야 한다 — 나머지 호출부의 기본 동작은 그대로 두고, 이 페이지만
// className을 override한다.
//
// HOTFIX-093-B는 이 기본 위치를 "헤더 바로 아래 좌측 상단 고정"으로
// 두고, 거기서 좌측 사이드바 여닫이 아이콘(sidebar_icons)과 안 겹치도록
// 그 설정을 읽어 top을 동적으로 계산했다 — 그런데 그 계산은 { pc, mobile }
// 중 하나를 고르지 않고 최상위에서 topOffsetPx를 읽어(사실상 항상
// undefined) 늘 fallback 값(top:80px)으로 굳어 있었고, EPIC-136에서
// 헤더 전체가 관리자 자유 드래그 배치로 바뀐 뒤로는 그 fallback 위치
// 자체가 로고/아이콘 등 헤더 내부 요소와 자주 겹쳤다(사용자 반복 신고 —
// "모바일에서 페이지 수정 버튼이 헤더 위에 이상하게 떠 있다"). 헤더가
// PC/태블릿/모바일 세 계층 전부 관리자 마음대로 재배치될 수 있는 지금은
// "헤더의 특정 지점을 피해서 고정 좌표를 계산"하는 접근 자체가 근본적으로
// 깨지기 쉽다 — 헤더 레이아웃이 바뀔 때마다 또 겹칠 수 있다.
// 대신 헤더와 아예 겹칠 수 없는 화면 우측 하단으로 옮긴다: 어떤 헤더
// 디자인/뷰포트 폭이든 상관없이 항상 안전하고, 좌측 하단에 이미 떠 있는
// 게시글 상세의 PostFloatingActionBar(다른 위치를 쓰므로 겹치지 않음)와도
// 무관하다.
const DEFAULT_CLASSNAME =
  "fixed bottom-4 right-4 z-50 rounded-md bg-[#166534] text-white px-3 py-1.5 text-sm shadow-md hover:opacity-90";

export function PageEditButton({
  slug,
  className,
  label = "페이지 수정",
  hrefOverride,
}: {
  slug: string;
  className?: string;
  label?: string;
  // 사용자 신고(2026-08-12): 게시글 상세의 "게시물 출력방식" 버튼이 이
  // slug("boards-id-postid", 모든 게시판이 공유하는 placeholder Page
  // Builder 위젯 페이지)로 보내고 있었는데, 실제 "게시물 출력방식"
  // 설정(날짜/작성자 스타일, 블록 레이아웃 순서)은 거기가 아니라
  // /admin/boards/[id](BoardForm.tsx)에 있다 — 완전히 엉뚱한 화면으로
  // 보내고 있던 버그. hrefOverride가 있으면 page_builder 조회 자체를
  // 건너뛰고 그 주소로 바로 연결한다(호출부가 정확한 목적지를 이미 아는
  // 경우 — PostDetailClient.tsx가 board.id로 board 설정 화면을 직접 지정).
  hrefOverride?: string;
}) {
  const { member, memberLoading } = useAuth();
  const [pageId, setPageId] = useState<string | null>(null);

  useEffect(() => {
    if (!member?.is_admin || hrefOverride) return;
    let cancelled = false;
    supabase
      .from("page_builder")
      .select("id")
      .eq("slug", slug)
      .maybeSingle()
      .then(({ data }) => {
        if (!cancelled) setPageId(data?.id ?? null);
      });
    return () => {
      cancelled = true;
    };
  }, [slug, member?.is_admin, hrefOverride]);

  if (memberLoading || !member?.is_admin) return null;
  if (!hrefOverride && !pageId) return null;

  return (
    <Link href={hrefOverride ?? `/admin/pages/${pageId}`} className={className ?? DEFAULT_CLASSNAME}>
      {label}
    </Link>
  );
}
