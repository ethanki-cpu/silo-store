import type { Metadata } from "next";
import { LegalDocument, LegalSection } from "@/components/legal/LegalDocument";
import { fetchBusinessInfo } from "@/lib/businessInfo";

export const metadata: Metadata = { title: "환불 및 구독 해지 안내" };
export const revalidate = 3600;

// EPIC-158.0(토스페이먼츠 심사 요건): 환불·구독 해지 정책 명시. 전자상거래법 기준의 초안이며 세부 조건(기간,
// 일할 계산 여부 등)은 대표님이 최종 확정한다(NEXT_TASK.md "입력 필요").
export default async function RefundPolicyPage() {
  const business = await fetchBusinessInfo();
  const contact = business.email ? `${business.email}${business.phone ? ` / ${business.phone}` : ""}` : "고객센터";

  return (
    <LegalDocument title="환불 및 구독 해지 안내" effectiveDate="2026년 9월 21일" business={business}>
      <LegalSection title="1. 멤버십 정기구독 (Alice / Great Gatsby / Patron / Lautrec)">
        <p>가. 결제: 선택한 등급의 월 요금이 신용·체크카드로 등록한 카드에 매월 같은 날짜에 자동 결제됩니다.</p>
        <p>
          나. 청약철회(환불): 결제일로부터 7일 이내이고 멤버십 혜택(등급 전용 콘텐츠·할인·무료 이용권 등)을 이용하지 않은 경우 전액
          환불됩니다. 혜택을 이용한 경우에는 이용한 혜택의 가치를 공제한 금액이 환불될 수 있습니다.
        </p>
        <p>다. 구독 해지: 언제든지 해지를 요청할 수 있으며, 다음 결제일 24시간 전까지 요청하시면 다음 달 요금이 청구되지 않습니다.</p>
        <p>라. 해지 후 이용: 해지하더라도 이미 결제한 기간이 끝날 때까지 해당 등급의 혜택은 유지되며, 기간 종료 후 기본 등급으로 전환됩니다.</p>
        <p>마. 결제 실패: 카드 한도 초과·유효기간 만료 등으로 결제가 실패하면 구독이 일시 중지되고, 카드를 다시 등록하면 재개할 수 있습니다.</p>
        <p>바. 해지·환불 요청 방법: {contact}로 회원 이메일과 요청 내용을 보내 주세요. 영업일 기준 3일 이내에 처리 결과를 안내드립니다.</p>
      </LegalSection>

      <LegalSection title="2. 온라인 도슨트 (디지털 콘텐츠 단건 결제)">
        <p>가. 결제 즉시 열람이 가능한 디지털 콘텐츠로, 구매 화면에서 열람을 시작하면 청약철회가 제한될 수 있음을 사전에 안내합니다(전자상거래 등에서의 소비자보호에 관한 법률 제17조 제2항).</p>
        <p>나. 열람을 시작하지 않은 경우 결제일로부터 7일 이내 전액 환불됩니다.</p>
        <p>다. 콘텐츠에 하자가 있거나 표시·광고와 다르게 제공된 경우에는 열람 여부와 관계없이 환불 또는 교환을 요청할 수 있습니다(콘텐츠를 안 날부터 3개월, 그 사실을 안 날부터 30일 이내).</p>
      </LegalSection>

      <LegalSection title="3. 사일로 상점 (실물 상품 — 무통장 입금)">
        <p>가. 주문 방법: 주문서를 제출한 뒤 안내된 계좌로 입금하면, 회사가 입금을 확인한 후 주문이 확정됩니다. 입금 확인 전에는 주문이 보류되며 기한 내 미입금 시 주문이 취소될 수 있습니다.</p>
        <p>나. 반품·환불: 상품을 수령한 날부터 7일 이내에 요청할 수 있습니다. 단순 변심에 의한 반품의 배송비는 구매자가 부담하며, 상품이 훼손·멸실된 경우에는 제한될 수 있습니다.</p>
        <p>다. 빈티지·앤틱 상품의 특성: 세월에 따른 사용감, 미세한 흠집, 색 바램 등은 상품 상세에 안내된 범위 내에서 하자에 해당하지 않습니다. 상품 설명과 다르거나 안내되지 않은 하자가 있는 경우 반품·환불(배송비 회사 부담)이 가능합니다.</p>
        <p>라. 환불 방법: 입금하신 계좌로 반품 상품 확인 후 영업일 기준 3일 이내에 환불하며, 환불 계좌 정보를 요청드릴 수 있습니다.</p>
        <p>마. 대여 상품: 대여 기간·연체·파손 시 정산 기준은 상품 상세 및 주문 시 안내된 조건을 따릅니다.</p>
      </LegalSection>

      <LegalSection title="4. 환불 처리 기간">
        <p>카드 결제 취소는 회사의 환불 승인 후 카드사 사정에 따라 통상 3~7영업일이 소요됩니다.</p>
      </LegalSection>

      <LegalSection title="5. 문의">
        <p>환불·해지 관련 문의: {contact}</p>
      </LegalSection>
    </LegalDocument>
  );
}
