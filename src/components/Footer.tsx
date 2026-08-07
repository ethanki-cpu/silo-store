"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";

// EPIC-087-PHASE-G: Footer(FNB) — 지금까지 사이트 전체에 footer가 아예
// 없었다. site_settings.footer_config(EPIC-023부터 있던 key-value jsonb
// 저장소, admin/navigation/settings/page.tsx가 이미 쓰는 방식과 동일)를
// /admin/footer에서 편집하고 여기서 읽어 렌더링한다.
export type FooterLink = { label: string; url: string };
export type FooterConfig = {
  company: {
    name: string;
    representative: string;
    businessNumber: string;
    address: string;
    email: string;
    phone: string;
  };
  legalLinks: FooterLink[];
  faqLinks: FooterLink[];
  extraLinks: FooterLink[];
  socialLinks: FooterLink[];
};

export const DEFAULT_FOOTER_CONFIG: FooterConfig = {
  company: { name: "", representative: "", businessNumber: "", address: "", email: "", phone: "" },
  legalLinks: [],
  faqLinks: [],
  extraLinks: [],
  socialLinks: [],
};

function isEmptyConfig(config: FooterConfig): boolean {
  return (
    Object.values(config.company).every((v) => !v) &&
    config.legalLinks.length === 0 &&
    config.faqLinks.length === 0 &&
    config.extraLinks.length === 0 &&
    config.socialLinks.length === 0
  );
}

export function Footer() {
  const [config, setConfig] = useState<FooterConfig | null>(null);

  useEffect(() => {
    supabase
      .from("site_settings")
      .select("setting_value")
      .eq("setting_key", "footer_config")
      .maybeSingle()
      .then(({ data }) => {
        const value = data?.setting_value as Partial<FooterConfig> | null;
        setConfig({ ...DEFAULT_FOOTER_CONFIG, ...value });
      });
  }, []);

  // 관리자가 아직 아무것도 입력하지 않았으면(모든 필드가 비어있는 초기
  // 시드 상태) 빈 footer를 그려 넣지 않는다 — 로딩 중(null)에도 마찬가지.
  if (!config || isEmptyConfig(config)) return null;

  const { company, legalLinks, faqLinks, extraLinks, socialLinks } = config;
  const hasCompanyInfo = Object.values(company).some((v) => v);

  return (
    <footer className="border-t border-gray-200 bg-gray-50 mt-auto">
      <div className="max-w-4xl mx-auto w-full px-8 py-8 text-xs text-gray-500 space-y-4">
        {hasCompanyInfo && (
          <div className="space-y-0.5">
            {company.name && <p className="font-medium text-gray-700">{company.name}</p>}
            <p>
              {[
                company.representative && `대표 ${company.representative}`,
                company.businessNumber && `사업자등록번호 ${company.businessNumber}`,
              ]
                .filter(Boolean)
                .join(" · ")}
            </p>
            {company.address && <p>{company.address}</p>}
            <p>{[company.email, company.phone].filter(Boolean).join(" · ")}</p>
          </div>
        )}

        {(legalLinks.length > 0 || faqLinks.length > 0 || extraLinks.length > 0) && (
          <div className="flex flex-wrap gap-x-4 gap-y-1">
            {[...legalLinks, ...faqLinks, ...extraLinks].map((link, i) => (
              <Link key={`${link.url}-${i}`} href={link.url} className="hover:text-gray-800 hover:underline">
                {link.label}
              </Link>
            ))}
          </div>
        )}

        {socialLinks.length > 0 && (
          <div className="flex gap-3">
            {socialLinks.map((link, i) => (
              <a
                key={`${link.url}-${i}`}
                href={link.url}
                target="_blank"
                rel="noreferrer"
                className="hover:text-gray-800 hover:underline"
              >
                {link.label}
              </a>
            ))}
          </div>
        )}
      </div>
    </footer>
  );
}
