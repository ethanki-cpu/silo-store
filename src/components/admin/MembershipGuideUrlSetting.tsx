"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

// EPIC-087-PHASE-D: "멤버십 안내 페이지 설정" — PHASE-C의 리다이렉트 게이트
// (src/lib/pageRankGate.ts)가 읽는 site_settings.membership_guide_redirect를
// 관리자가 직접 바꿀 수 있는 작은 모달. site_settings 쓰기는 이미 admin
// bypass RLS 정책이 있어(admin/navigation/settings/page.tsx의 upsertSetting과
// 동일 패턴) 새 API 라우트가 필요 없다.
const SETTING_KEY = "membership_guide_redirect";

export function MembershipGuideUrlSetting({ onClose }: { onClose: () => void }) {
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    supabase
      .from("site_settings")
      .select("setting_value")
      .eq("setting_key", SETTING_KEY)
      .maybeSingle()
      .then(({ data }) => {
        const value = data?.setting_value as { url?: string } | null;
        setUrl(value?.url ?? "/membership");
        setLoading(false);
      });
  }, []);

  async function handleSave() {
    setSaving(true);
    setError(null);
    const { error: saveError } = await supabase.from("site_settings").upsert(
      {
        setting_key: SETTING_KEY,
        setting_value: { url: url.trim() || "/membership" },
        updated_at: new Date().toISOString(),
      },
      { onConflict: "setting_key" },
    );
    setSaving(false);
    if (saveError) {
      setError(saveError.message);
      return;
    }
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-sm rounded-lg bg-white p-6 space-y-4">
        <h3 className="text-lg font-medium">멤버십 안내 페이지 설정</h3>
        <p className="text-xs text-gray-500">
          등급 미달로 열람 제한된 페이지에 접속하면 이 URL로 리다이렉트돼요.
        </p>
        {loading ? (
          <p className="text-sm text-gray-400">불러오는 중...</p>
        ) : (
          <input
            type="text"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="/membership"
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
          />
        )}
        {error && <p className="text-sm text-red-600">{error}</p>}
        <div className="flex gap-2 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 rounded-md border border-gray-300 bg-white text-gray-800 px-3 py-2 hover:bg-gray-50"
          >
            취소
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving || loading}
            className="flex-1 rounded-md bg-gray-800 text-white px-3 py-2 disabled:opacity-50"
          >
            {saving ? "저장 중..." : "저장"}
          </button>
        </div>
      </div>
    </div>
  );
}
