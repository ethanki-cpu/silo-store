"use client";

// EPIC-105: "하단 메뉴(Footer) 관리" — 기존 폼 기반 편집(site_settings.
// footer_config)을 Craft.js 비주얼 에디터로 교체(사용자 확인 후 결정,
// EPIC-102 계획 문서 참고). footer는 URL을 가진 실제 "페이지"가 아니라
// 전역 레이아웃 조각이라, 다른 Craft 페이지들처럼 목록에서 고르는 대신
// page_builder(slug="footer") 행 하나만 쓰고 없으면 이 화면 진입 시 만든다.
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { CraftFooterEditor } from "@/components/admin/craft/CraftFooterEditor";

const FOOTER_SLUG = "footer";

export default function AdminFooterPage() {
  const router = useRouter();
  const [pageId, setPageId] = useState<string | null>(null);
  const [craftState, setCraftState] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setError(null);
    const { data: existing, error: fetchError } = await supabase
      .from("page_builder")
      .select("id, craft_state")
      .eq("slug", FOOTER_SLUG)
      .maybeSingle();

    if (fetchError) {
      setError(fetchError.message);
      setLoading(false);
      return;
    }

    if (existing) {
      setPageId(existing.id);
      setCraftState(existing.craft_state ?? null);
      setLoading(false);
      return;
    }

    const { data: created, error: createError } = await supabase
      .from("page_builder")
      .insert({ slug: FOOTER_SLUG, title: "하단 Footer", status: "published", builder_type: "craft" })
      .select("id, craft_state")
      .single();

    if (createError) {
      setError(createError.message);
      setLoading(false);
      return;
    }

    setPageId(created.id);
    setCraftState(created.craft_state ?? null);
    setLoading(false);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (loading) {
    return (
      <main className="flex-1 p-8 max-w-3xl mx-auto w-full">
        <p className="text-gray-500">불러오는 중...</p>
      </main>
    );
  }

  if (error || !pageId) {
    return (
      <main className="flex-1 p-8 max-w-3xl mx-auto w-full">
        <p className="text-red-600">{error ?? "하단 Footer 페이지를 불러오지 못했어요."}</p>
      </main>
    );
  }

  return (
    <CraftFooterEditor
      pageId={pageId}
      initialState={craftState}
      onClose={() => router.push("/admin/site-structure")}
      onSaved={() => load()}
    />
  );
}
