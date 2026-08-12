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
// EPIC-092(요구사항 3/4): 기본 위치를 화면 우측 상단 고정에서 헤더 바로
// 아래 좌측 상단 고정으로 옮기고, 배경색을 #166534로 강제 지정한다.
// 게시글 상세 페이지 등 개별 호출부는 페이지 유형에 맞는 label을 넘겨
// "페이지 수정" 외의 문구를 노출할 수 있다(예: "게시글 보여지는 방식 수정").
//
// HOTFIX-093-B: "아이콘과 겹쳐서 떠다닌다"는 신고의 근본 원인을 라이브
// site_settings로 확인함 — LeftSidebar 트리거 아이콘(fixed left-0)이
// 관리자 설정(`sidebar_icons.topOffsetPx`/`iconSizePx`)에 따라 화면 왼쪽
// 어디든 놓일 수 있는데, 이 버튼의 top 값(top-20=80px)이 고정값이라
// 현재 라이브 설정(topOffsetPx:100, iconSizePx:100 — 아이콘이 대략
// y:100~216px, x:0~116px 범위를 차지)과 정확히 겹쳤다. 좌표를 클래스로
// 고정하는 대신 실제 아이콘 설정을 읽어 그 아래로 항상 비켜가도록
// 동적으로 계산한다(관리자가 아이콘 크기/위치를 나중에 또 바꿔도 다시
// 겹치지 않는다).
const DEFAULT_TOP_PX = 80; // 기존 top-20과 동일한 기본값(설정 로딩 전/미설정 시)
const ICON_PADDING_PX = 16; // LeftSidebar 트리거의 p-2(양쪽 8px)
const CLEARANCE_PX = 12;

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
  const [topPx, setTopPx] = useState(DEFAULT_TOP_PX);

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

  useEffect(() => {
    let cancelled = false;
    supabase
      .from("site_settings")
      .select("setting_value")
      .eq("setting_key", "sidebar_icons")
      .maybeSingle()
      .then(({ data }) => {
        if (cancelled) return;
        const value = data?.setting_value as
          | { topOffsetPx?: number; iconSizePx?: number }
          | null
          | undefined;
        const iconTop = value?.topOffsetPx ?? 160; // LeftSidebar/RightSidebar 기본값(Navbar.tsx DEFAULT_TOP_OFFSET_PX)
        const iconBottom = iconTop + (value?.iconSizePx ?? 32) + ICON_PADDING_PX;
        const overlaps = iconTop < DEFAULT_TOP_PX + 48 && iconBottom > DEFAULT_TOP_PX;
        setTopPx(overlaps ? iconBottom + CLEARANCE_PX : DEFAULT_TOP_PX);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (memberLoading || !member?.is_admin) return null;
  if (!hrefOverride && !pageId) return null;

  return (
    <Link
      href={hrefOverride ?? `/admin/pages/${pageId}`}
      className={
        className ??
        "fixed left-4 z-50 rounded-md bg-[#166534] text-white px-3 py-1.5 text-sm shadow-md hover:opacity-90"
      }
      style={className ? undefined : { top: topPx }}
    >
      {label}
    </Link>
  );
}
