import type { Metadata } from "next";
import Link from "next/link";
import { LegalDocument, LegalSection } from "@/components/legal/LegalDocument";
import { fetchBusinessInfo } from "@/lib/businessInfo";
import { supabase } from "@/lib/supabaseClient";
import { describeTierAccess, describeTierBenefits, benefitLine, type TierRow, type BoardPermissionRow } from "@/lib/tierAccess";

export const metadata: Metadata = { title: "상품 및 가격 안내" };
// 방문마다 DB를 다시 읽지 않도록 1시간 캐시(무료 플랜 데이터 사용량 절약).
export const revalidate = 3600;

// EPIC-158.0(토스페이먼츠 심사 요건) → EPIC-160(상세화) → HOTFIX-161.7(온라인 도슨트 등급별 고정가+
// 하루 무료건수 모델로 전면 개편, 사일로 상점 실제 상품 목록/가격 노출 제거, "표시 가격" 안내는
// /terms로 이동): 판매 상품과 가격을 등급별로 안내 — 멤버십(무료 입문 등급 Silo Angel 포함)/온라인
// 도슨트/사일로 상점. 금액과 혜택은 DB(membership_tiers, boards) 실제 값에서 계산해 보여준다(하드코딩
// 없음 — 화면 안내와 실제 적용값이 어긋나지 않는다).
const won = (n: number) => `${n.toLocaleString("ko-KR")}원`;

export default async function PricingPage() {
  const business = await fetchBusinessInfo();

  const [{ data: tierRows }, { data: boardRows }] = await Promise.all([
    supabase.from("membership_tiers").select("*").order("rank", { ascending: true }),
    supabase
      .from("boards")
      .select(
        "name, min_rank_to_read, min_rank_to_view_post, min_rank_to_comment, min_rank_to_like, min_rank_to_bookmark, min_rank_to_write, min_rank_to_propose, badge_min_rank",
      ),
  ]);

  const tiers = ((tierRows ?? []) as TierRow[]).filter((t) => (t.price > 0 || t.rank === 0) && !t.is_lifetime && t.rank < 99);
  const boards = (boardRows ?? []) as BoardPermissionRow[];

  const clubText = (t: TierRow) =>
    t.club_all_free
      ? "전체 무료"
      : [t.club_monthly_free_sessions ? `월 ${t.club_monthly_free_sessions}회 무료` : "", t.club_participation_discount_pct ? `${t.club_participation_discount_pct}% 할인` : ""]
          .filter(Boolean)
          .join(" + ") || "정가";
  // HOTFIX-161.7: 콘텐츠 정가 기준 할인이 아니라 등급별 고정가 + 하루 무료건수 모델.
  const docentText = (t: TierRow) => {
    const flat = t.docent_flat_price != null ? won(t.docent_flat_price) : "정가";
    return t.docent_daily_free_count ? `하루 ${t.docent_daily_free_count}건 무료, 이후 ${flat}` : `단품 ${flat}`;
  };
  const shopText = (t: TierRow) =>
    [t.shop_purchase_discount_pct ? `구매 ${t.shop_purchase_discount_pct}%` : "", t.shop_rental_discount_pct ? `대여 ${t.shop_rental_discount_pct}%` : ""]
      .filter(Boolean)
      .join(" · ") || "할인 없음";

  return (
    <LegalDocument title="상품 및 가격 안내" business={business}>
      <p>
        사일로 스토어에서 판매하는 상품과 결제 방식을 자세히 안내합니다. 환불·해지 조건은{" "}
        <Link href="/refund-policy" className="underline">환불 및 구독 해지 안내</Link>를 참고해 주세요.
      </p>

      <LegalSection title="1. 멤버십 — 무료로 시작하고, 필요할 때 유료로 올려요">
        <p>
          모든 방문자는 <strong>무료 등급(Silo Angel)</strong>으로 먼저 시작할 수 있어요. 회원가입만 하면 되고 결제 정보는 필요 없어요. 더 많은
          게시판에 참여하고 모임·살롱·도슨트·상점 혜택을 누리고 싶을 때 유료 등급으로 언제든 올릴 수 있어요.
        </p>

        {tiers.length === 0 ? (
          <p>멤버십 요금 정보를 불러오지 못했어요. 잠시 후 다시 확인해 주세요.</p>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[640px] border-collapse text-left text-sm">
                <thead>
                  <tr className="border-b border-gray-300 text-gray-500">
                    <th className="py-2 pr-3 font-medium">등급</th>
                    <th className="py-2 pr-3 font-medium">월 요금</th>
                    <th className="py-2 pr-3 font-medium">클럽 모임</th>
                    <th className="py-2 pr-3 font-medium">온라인 도슨트</th>
                    <th className="py-2 pr-3 font-medium">사일로 상점</th>
                  </tr>
                </thead>
                <tbody>
                  {tiers.map((t) => (
                    <tr key={t.rank} className="border-b border-gray-100 align-top">
                      <td className="py-2 pr-3 font-medium text-gray-900">{t.name}</td>
                      <td className="py-2 pr-3">{t.price === 0 ? "무료" : `${won(t.price)} (부가세 포함)`}</td>
                      <td className="py-2 pr-3">{clubText(t)}</td>
                      <td className="py-2 pr-3">{docentText(t)}</td>
                      <td className="py-2 pr-3">{shopText(t)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              {tiers.map((t) => {
                const a = describeTierAccess(t);
                // HOTFIX-161.7(사용자 지시 — "지금 표시된게 너무 적어"): 게시판별
                // 실제 권한 설정(/admin/board-permissions)을 그대로 반영한 상세 목록.
                const groups: [string, string[]][] = [
                  ["이전 등급에 더해 새로 열리는 권한", describeTierBenefits(boards, t.rank).map(benefitLine)],
                  ["이용 가능한 활동", a.activities],
                  ["할인·혜택", a.perks],
                ];
                return (
                  <div key={t.rank} className="rounded-md border border-gray-200 p-4">
                    {t.image_url && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={t.image_url} alt={t.name} className="mb-3 max-h-72 w-full rounded bg-white object-contain" />
                    )}
                    <p className="text-base font-semibold text-gray-900">
                      {t.name} <span className="text-sm font-normal text-gray-500">{t.price === 0 ? "무료" : `월 ${won(t.price)}`}</span>
                    </p>
                    {groups.map(([title, list]) => {
                      if (list.length === 0) return null;
                      // HOTFIX-161.7: 게시판별 상세 권한이 게시판 수만큼(수십 줄까지)
                      // 늘어날 수 있어 앞부분만 보여주고 나머지는 <details>로 접는다.
                      const PREVIEW = 6;
                      const preview = list.slice(0, PREVIEW);
                      const rest = list.slice(PREVIEW);
                      return (
                        <div key={title} className="mt-3">
                          <p className="text-xs font-semibold text-gray-500">{title}</p>
                          <ul className="mt-1 space-y-0.5 text-xs leading-5">
                            {preview.map((line) => (
                              <li key={line}>· {line}</li>
                            ))}
                          </ul>
                          {rest.length > 0 && (
                            <details className="mt-0.5">
                              <summary className="cursor-pointer text-xs text-gray-400 hover:text-gray-600">{rest.length}개 더보기</summary>
                              <ul className="mt-1 space-y-0.5 text-xs leading-5">
                                {rest.map((line) => (
                                  <li key={line}>· {line}</li>
                                ))}
                              </ul>
                            </details>
                          )}
                        </div>
                      );
                    })}
                  </div>
                );
              })}
            </div>
          </>
        )}

        <p>
          <strong>가입 방법</strong>: 무료 등급은 <Link href="/signup" className="underline">회원가입</Link>만 하면 바로 시작돼요. 유료 등급은{" "}
          <Link href="/membership" className="underline">멤버십 페이지</Link>에서 등급을 고르고, 카드 정기결제(준비 중) 또는 계좌이체 접수로
          가입해요.
        </p>
        <p>
          <strong>결제·청구</strong>: 카드 정기결제는 가입 당일 첫 결제 후 매월 같은 날짜에 같은 금액이 자동 결제되고, 첫 결제 즉시 등급이
          적용돼요. 계좌이체는 1개월 이용권으로 자동 갱신되지 않으며 입금 확인 후 영업일 기준 1일 이내에 등급을 적용해 드려요. 해지는 언제든
          가능하고 결제한 기간이 끝날 때까지 혜택이 유지돼요.
        </p>
      </LegalSection>

      <LegalSection title="2. 온라인 도슨트 — 콘텐츠별 단건 결제 (디지털 콘텐츠, 배송 없음)">
        <p>
          콘텐츠 자체의 정가와 무관하게, 등급별로 정해진 단품 가격을 적용해요(무료로 공개된 콘텐츠는 등급과 무관하게 항상 무료예요).
          결제 즉시 열람할 수 있어요.
        </p>
        <table className="w-full min-w-[420px] border-collapse text-left text-sm">
          <thead>
            <tr className="border-b border-gray-300 text-gray-500">
              <th className="py-2 pr-3 font-medium">등급</th>
              <th className="py-2 font-medium">단품 가격</th>
            </tr>
          </thead>
          <tbody>
            <tr className="border-b border-gray-100">
              <td className="py-2 pr-3">비회원</td>
              <td className="py-2">3,000원(참고용 — 열람하려면 최소 무료 등급 Silo Angel 가입이 필요해요)</td>
            </tr>
            {tiers.map((t) => (
              <tr key={t.rank} className="border-b border-gray-100">
                <td className="py-2 pr-3">{t.name}</td>
                <td className="py-2">{docentText(t)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </LegalSection>

      <LegalSection title="3. 사일로 상점 (빈티지·앤틱 실물 상품) — 무통장 입금(계좌이체)">
        <p>상품별 실제 가격은 각 상품 상세 페이지에 표시돼요. 등급이 높을수록 구매·대여 시 아래 할인이 적용돼요.</p>
        <ul className="list-disc space-y-0.5 pl-5">
          {tiers.map((t) => (
            <li key={t.rank}>
              {t.name}: 구매 {t.shop_purchase_discount_pct ? `${t.shop_purchase_discount_pct}% 할인` : "할인 없음"}, 대여{" "}
              {t.shop_rental_discount_pct ? `${t.shop_rental_discount_pct}% 할인` : "할인 없음"}
            </li>
          ))}
        </ul>
        <p>
          사일로 상점은 카드 결제 없이 주문서를 제출한 뒤 안내된 계좌로 입금하는 방식이며, 입금이 확인되면 주문이 확정돼요. 반품·환불 조건은{" "}
          <Link href="/refund-policy" className="underline">환불 및 구독 해지 안내</Link>를 따라요.{" "}
          <Link href="/shop" className="underline">사일로 상점 바로가기</Link>
        </p>
      </LegalSection>
    </LegalDocument>
  );
}
