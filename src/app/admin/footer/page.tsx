"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { DEFAULT_FOOTER_CONFIG, type FooterConfig, type FooterLink } from "@/components/Footer";

// EPIC-087-PHASE-G: "하단 메뉴 관리" — site_settings.footer_config를
// admin/navigation/settings/page.tsx의 upsertSetting()과 동일한 direct
// supabase 쓰기로 편집(이미 site_settings_update_admin RLS 정책 존재,
// 새 API 라우트 불필요).
const SETTING_KEY = "footer_config";

function LinkListEditor({
  title,
  links,
  onChange,
  labelPlaceholder,
}: {
  title: string;
  links: FooterLink[];
  onChange: (next: FooterLink[]) => void;
  labelPlaceholder: string;
}) {
  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <label className="block text-sm font-medium text-gray-700">{title}</label>
        <button
          type="button"
          onClick={() => onChange([...links, { label: "", url: "" }])}
          className="text-xs text-blue-600 hover:underline"
        >
          + 항목 추가
        </button>
      </div>
      <div className="space-y-2">
        {links.map((link, i) => (
          <div key={i} className="flex gap-2">
            <input
              type="text"
              value={link.label}
              onChange={(e) => onChange(links.map((l, j) => (j === i ? { ...l, label: e.target.value } : l)))}
              placeholder={labelPlaceholder}
              className="w-40 rounded-md border border-gray-300 px-2 py-1.5 text-sm"
            />
            <input
              type="text"
              value={link.url}
              onChange={(e) => onChange(links.map((l, j) => (j === i ? { ...l, url: e.target.value } : l)))}
              placeholder="URL"
              className="flex-1 rounded-md border border-gray-300 px-2 py-1.5 text-sm"
            />
            <button
              type="button"
              onClick={() => onChange(links.filter((_, j) => j !== i))}
              className="rounded-md border border-gray-300 px-2 py-1.5 text-xs text-red-600 hover:bg-red-50"
            >
              삭제
            </button>
          </div>
        ))}
        {links.length === 0 && <p className="text-xs text-gray-400">아직 등록된 항목이 없어요.</p>}
      </div>
    </div>
  );
}

export default function AdminFooterPage() {
  const [config, setConfig] = useState<FooterConfig>(DEFAULT_FOOTER_CONFIG);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    supabase
      .from("site_settings")
      .select("setting_value")
      .eq("setting_key", SETTING_KEY)
      .maybeSingle()
      .then(({ data }) => {
        const value = data?.setting_value as Partial<FooterConfig> | null;
        setConfig({ ...DEFAULT_FOOTER_CONFIG, ...value });
        setLoading(false);
      });
  }, []);

  async function handleSave() {
    setSaving(true);
    setSaved(false);
    setError(null);
    const { error: saveError } = await supabase.from("site_settings").upsert(
      { setting_key: SETTING_KEY, setting_value: config, updated_at: new Date().toISOString() },
      { onConflict: "setting_key" },
    );
    setSaving(false);
    if (saveError) {
      setError(saveError.message);
      return;
    }
    setSaved(true);
  }

  if (loading) {
    return (
      <main className="flex-1 p-8 max-w-3xl mx-auto w-full">
        <p className="text-gray-500">불러오는 중...</p>
      </main>
    );
  }

  return (
    <main className="flex-1 p-8 max-w-3xl mx-auto w-full space-y-8">
      <h1 className="text-2xl font-bold">하단 메뉴(Footer) 관리</h1>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">회사 및 운영자 정보</h2>
        <div className="grid grid-cols-2 gap-3">
          <input
            type="text"
            value={config.company.name}
            onChange={(e) => setConfig({ ...config, company: { ...config.company, name: e.target.value } })}
            placeholder="회사명"
            className="rounded-md border border-gray-300 px-3 py-2 text-sm"
          />
          <input
            type="text"
            value={config.company.representative}
            onChange={(e) =>
              setConfig({ ...config, company: { ...config.company, representative: e.target.value } })
            }
            placeholder="대표자"
            className="rounded-md border border-gray-300 px-3 py-2 text-sm"
          />
          <input
            type="text"
            value={config.company.businessNumber}
            onChange={(e) =>
              setConfig({ ...config, company: { ...config.company, businessNumber: e.target.value } })
            }
            placeholder="사업자등록번호"
            className="rounded-md border border-gray-300 px-3 py-2 text-sm"
          />
          <input
            type="text"
            value={config.company.phone}
            onChange={(e) => setConfig({ ...config, company: { ...config.company, phone: e.target.value } })}
            placeholder="연락처"
            className="rounded-md border border-gray-300 px-3 py-2 text-sm"
          />
          <input
            type="text"
            value={config.company.email}
            onChange={(e) => setConfig({ ...config, company: { ...config.company, email: e.target.value } })}
            placeholder="이메일"
            className="rounded-md border border-gray-300 px-3 py-2 text-sm col-span-2"
          />
          <input
            type="text"
            value={config.company.address}
            onChange={(e) => setConfig({ ...config, company: { ...config.company, address: e.target.value } })}
            placeholder="주소"
            className="rounded-md border border-gray-300 px-3 py-2 text-sm col-span-2"
          />
        </div>
      </section>

      <LinkListEditor
        title="법적 고지 링크 (이용약관, 개인정보처리방침, 저작권 표시)"
        links={config.legalLinks}
        onChange={(legalLinks) => setConfig({ ...config, legalLinks })}
        labelPlaceholder="예: 이용약관"
      />

      <LinkListEditor
        title="FAQ (자주 묻는 질문, 문의 게시판 링크)"
        links={config.faqLinks}
        onChange={(faqLinks) => setConfig({ ...config, faqLinks })}
        labelPlaceholder="예: 자주 묻는 질문"
      />

      <LinkListEditor
        title="부가 메뉴 (사이트맵, 고객센터, 패밀리사이트 목록)"
        links={config.extraLinks}
        onChange={(extraLinks) => setConfig({ ...config, extraLinks })}
        labelPlaceholder="예: 사이트맵"
      />

      <LinkListEditor
        title="소셜 미디어 아이콘 (인스타그램, 유튜브 등)"
        links={config.socialLinks}
        onChange={(socialLinks) => setConfig({ ...config, socialLinks })}
        labelPlaceholder="예: Instagram"
      />

      {error && <p className="text-sm text-red-600">{error}</p>}

      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="rounded-md bg-gray-800 text-white px-4 py-2 text-sm disabled:opacity-50"
        >
          {saving ? "저장 중..." : "저장"}
        </button>
        {saved && <span className="text-sm text-green-600">저장됐어요.</span>}
      </div>
    </main>
  );
}
