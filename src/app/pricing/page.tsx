import type { Metadata } from "next";
import Link from "next/link";
import { LegalDocument, LegalSection } from "@/components/legal/LegalDocument";
import { fetchBusinessInfo } from "@/lib/businessInfo";
import { supabase } from "@/lib/supabaseClient";

export const metadata: Metadata = { title: "상품 및 가격 안내" };
// 방문마다 DB를 다시 읽지 않도록 1시간 캐시(무료 플랜 데이터 사용량 절약).
export const revalidate = 3600;

// EPIC-158.0(토스페이먼츠 심사 요건): 판매 상품과 가격 명시 — 멤버십/온라인 도슨트/사일로 상점.
// 금액은 DB(membership_tiers, docent_contents, items)의 실제 값을 그대로 보여준다(하드코딩 없음).
type Tier = {
  rank: number;
  name: string;
  price: number;
  is_lifetime: boolean;
  club_monthly_free_sessions: number | null;
  docent_monthly_free_count: number | null;
  docent_per_item_discount_pct: number | null;
  shop_purchase_discount_pct: number | null;
  monthly_salon_meeting_invite: boolean | null;
  club_priority_booking: boolean | null;
};

function benefits(t: Tier): string[] {
  const out: string[] = [];
  if (t.docent_monthly_free_count) out.push(`온라인 도슨트 월 ${t.docent_monthly_free_count}건 무료`);
  if (t.docent_per_item_discount_pct) out.push(`온라인 도슨트 ${t.docent_per_item_discount_pct}% 할인`);
  if (t.club_monthly_free_sessions) out.push(`클럽 모임 월 ${t.club_monthly_free_sessions}회 무료`);
  if (t.club_priority_booking) out.push("클럽 우선 예약");
  if (t.shop_purchase_discount_pct) out.push(`사일로 상점 구매 ${t.shop_purchase_discount_pct}% 할인`);
  if (t.monthly_salon_meeting_invite) out.push("월별 살롱 모임 초대");
  return out;
}

const won = (n: number) => `${n.toLocaleString("ko-KR")}원`;
const range = (nums: number[]) => (Math.min(...nums) === Math.max(...nums) ? won(nums[0]) : `${won(Math.min(...nums))} ~ ${won(Math.max(...nums))}`);

export default async function PricingPage() {
  const business = await fetchBusinessInfo();

  const [{ data: tierRows }, { data: docentRows }, { data: itemRows }] = await Promise.all([
    supabase
      .from("membership_tiers")
      .select(
        "rank, name, price, is_lifetime, club_monthly_free_sessions, docent_monthly_free_count, docent_per_item_discount_pct, shop_purchase_discount_pct, monthly_salon_meeting_invite, club_priority_booking",
      )
      .order("rank", { ascending: true }),
    supabase.from("docent_contents").select("price").eq("is_free", false).gt("price", 0),
    supabase.from("items").select("price, rental_price_per_day"),
  ]);

  const tiers = ((tierRows ?? []) as Tier[]).filter((t) => t.price > 0 && !t.is_lifetime && t.rank < 99);
  const docentPrices = ((docentRows ?? []) as { price: number }[]).map((d) => d.price);
  const itemPrices = ((itemRows ?? []) as { price: number; rental_price_per_day: number }[]).map((i) => i.price).filter((p) => p > 0);

  return (
    <LegalDocument title="상품 및 가격 안내" business={business}>
      <p>사일로 스토어에서 판매하는 상품과 결제 방식을 안내합니다. 환불·해지 조건은 <Link href="/refund-policy" className="underline">환불 및 구독 해지 안내</Link>를 참고해 주세요.</p>

      <LegalSection title="1. 멤버십 정기구독 — 카드 정기결제(준비 중) 또는 계좌이체 접수">
        {tiers.length === 0 ? (
          <p>멤버십 요금 정보를 불러오지 못했어요. 잠시 후 다시 확인해 주세요.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[480px] border-collapse text-left text-sm">
              <thead>
                <tr className="border-b border-gray-300 text-gray-500">
                  <th className="py-2 pr-4 font-medium">등급</th>
                  <th className="py-2 pr-4 font-medium">월 요금</th>
                  <th className="py-2 font-medium">주요 혜택</th>
                </tr>
              </thead>
              <tbody>
                {tiers.map((t) => (
                  <tr key={t.rank} className="border-b border-gray-100 align-top">
                    <td className="py-2 pr-4 font-medium text-gray-900">{t.name}</td>
                    <td className="py-2 pr-4">{won(t.price)}</td>
                    <td className="py-2">{benefits(t).join(" · ") || "등급 전용 혜택"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <p>구독은 <Link href="/membership" className="underline">멤버십 페이지</Link>에서 카드를 등록하면 시작되며, 첫 결제 즉시 등급이 적용됩니다.</p>
      </LegalSection>

      <LegalSection title="2. 온라인 도슨트 — 카드 결제(준비 중, 단건 결제)">
        <p>
          콘텐츠별로 가격이 다르며 각 콘텐츠 상세 페이지에 표시됩니다.
          {docentPrices.length > 0 && ` 유료 콘텐츠 ${docentPrices.length}건, ${range(docentPrices)}.`}
          무료로 공개된 콘텐츠도 있으며, 등급에 따라 할인 또는 월 무료 이용 혜택이 적용될 수 있습니다.
        </p>
        <p>결제 즉시 열람할 수 있는 디지털 콘텐츠이며 배송은 없습니다.</p>
      </LegalSection>

      <LegalSection title="3. 사일로 상점 (빈티지·앤틱 실물 상품) — 무통장 입금(계좌이체)">
        <p>
          상품마다 가격이 다르며 상품 상세 페이지에 구매가와 일 대여가가 표시됩니다.
          {itemPrices.length > 0 && ` 현재 등록된 상품 ${itemPrices.length}점, 구매가 ${range(itemPrices)}.`}
        </p>
        <p>사일로 상점은 카드 결제 없이 주문서를 제출한 뒤 안내된 계좌로 입금하는 방식이며, 입금이 확인되면 주문이 확정됩니다. 등급에 따라 할인이 적용될 수 있습니다.</p>
        <p>
          <Link href="/shop" className="underline">사일로 상점 바로가기</Link>
        </p>
      </LegalSection>

      <LegalSection title="표시 가격 안내">
        <p>모든 금액은 원화(KRW) 기준이며, 결제 화면에 표시되는 최종 금액이 실제 결제 금액입니다.</p>
      </LegalSection>
    </LegalDocument>
  );
}
