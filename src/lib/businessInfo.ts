import { fetchPublishedPageBySlug } from "@/lib/pageBuilder";

// EPIC-158.0(토스페이먼츠 심사 요건): 사업자 정보의 단일 출처는 하단 푸터(page_builder slug="footer")의
// FooterCompanyInfoBlock이다 — 관리자가 /admin/footer에서 더블클릭으로 편집한 값을 약관/개인정보처리방침/
// 환불 정책/가격 페이지가 그대로 읽어 쓴다(별도 테이블을 두면 푸터와 값이 어긋난다).
export type BusinessInfo = {
  name: string;
  representative: string;
  businessNumber: string;
  mailOrderNumber: string;
  address: string;
  email: string;
  phone: string;
  privacyOfficer: string;
  hostingProvider: string;
};

export const BUSINESS_INFO_FALLBACK: BusinessInfo = {
  name: "사일로상점 / 살롱데상",
  representative: "",
  businessNumber: "",
  mailOrderNumber: "",
  address: "",
  email: "ethanki@silostore.net",
  phone: "",
  privacyOfficer: "",
  hostingProvider: "Vercel Inc.",
};

export async function fetchBusinessInfo(): Promise<BusinessInfo> {
  try {
    const footer = await fetchPublishedPageBySlug("footer");
    const raw = footer?.page.craft_state;
    const tree = typeof raw === "string" ? JSON.parse(raw) : raw;
    if (!tree || typeof tree !== "object") return BUSINESS_INFO_FALLBACK;
    for (const node of Object.values(tree as Record<string, { type?: { resolvedName?: string } | string; props?: Record<string, unknown> }>)) {
      const name = typeof node?.type === "string" ? node.type : node?.type?.resolvedName;
      if (name !== "FooterCompanyInfoBlock" || !node.props) continue;
      const p = node.props;
      const str = (k: string, fb: string) => (typeof p[k] === "string" ? (p[k] as string).trim() : fb);
      return {
        name: str("name", BUSINESS_INFO_FALLBACK.name) || BUSINESS_INFO_FALLBACK.name,
        representative: str("representative", ""),
        businessNumber: str("businessNumber", ""),
        mailOrderNumber: str("mailOrderNumber", ""),
        address: str("address", ""),
        email: str("email", BUSINESS_INFO_FALLBACK.email) || BUSINESS_INFO_FALLBACK.email,
        phone: str("phone", ""),
        privacyOfficer: str("privacyOfficer", ""),
        hostingProvider: str("hostingProvider", BUSINESS_INFO_FALLBACK.hostingProvider) || BUSINESS_INFO_FALLBACK.hostingProvider,
      };
    }
  } catch {
    /* 아래 fallback */
  }
  return BUSINESS_INFO_FALLBACK;
}
