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
// 배치해야 한다 — 나머지 112개 호출부의 기본 동작(우측 상단 고정)은 그대로
// 두고, 이 페이지만 className을 override한다.
const DEFAULT_CLASS_NAME =
  "fixed top-20 right-4 z-30 rounded-md bg-gray-800 text-white px-3 py-1.5 text-sm shadow-md hover:bg-gray-700";

export function PageEditButton({
  slug,
  className = DEFAULT_CLASS_NAME,
}: {
  slug: string;
  className?: string;
}) {
  const { member, memberLoading } = useAuth();
  const [pageId, setPageId] = useState<string | null>(null);

  useEffect(() => {
    if (!member?.is_admin) return;
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
  }, [slug, member?.is_admin]);

  if (memberLoading || !member?.is_admin || !pageId) return null;

  return (
    <Link href={`/admin/pages/${pageId}`} className={className}>
      페이지 수정
    </Link>
  );
}
