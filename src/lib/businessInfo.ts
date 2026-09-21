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

// 2026-09-21(사용자 확정): 결제대행(토스페이먼츠) 계약 주체는 "살롱데상", "사일로상점"은 실물 상품을 무통장 입금으로만
// 받는다. 푸터 값은 "사일로상점 / 살롱데상" 순서로 " / "를 구분자로 둔 병기 문자열이라, 항목 수가 모두 같을 때만 상호별로 쪼갠다.
export type BusinessEntity = Pick<BusinessInfo, "name" | "representative" | "businessNumber" | "mailOrderNumber" | "address">;

// "…희우정로10길 32, 1층 / 2층"처럼 같은 건물의 층만 다른 병기는 "2층"만 남으므로, 층수만 있는 항목에는 첫 항목의 건물 주소(마지막 ", " 앞)를 붙인다.
function fullAddress(parts: string[], i: number): string {
  const part = parts[i];
  if (i === 0 || !/^[\dB]*\d*층$/.test(part)) return part;
  const comma = parts[0].lastIndexOf(",");
  return comma > 0 ? `${parts[0].slice(0, comma)}, ${part}` : part;
}

export function splitBusinessEntities(b: BusinessInfo): BusinessEntity[] | null {
  const split = (v: string) => v.split("/").map((x) => x.trim());
  const names = split(b.name);
  if (names.length < 2) return null;
  const cols = [b.representative, b.businessNumber, b.mailOrderNumber, b.address].map(split);
  if (cols.some((c) => c.length !== names.length)) return null;
  return names.map((name, i) => ({
    name,
    representative: cols[0][i],
    businessNumber: cols[1][i],
    mailOrderNumber: cols[2][i],
    address: fullAddress(cols[3], i),
  }));
}

export const ENTITY_ROLE: Record<string, string> = {
  "살롱데상": "멤버십·온라인 도슨트 판매 및 결제 대행(토스페이먼츠 카드·간편결제) 계약 사업자",
  "사일로상점": "사일로 상점 실물 상품 판매(무통장 입금·계좌이체 전용, 토스페이먼츠 결제 미사용)",
};
