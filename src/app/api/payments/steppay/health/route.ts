import { NextResponse } from "next/server";
import { rpc } from "@/lib/steppayServer";

// EPIC-159: 배포 환경 진단용 — 스텝페이 관련 환경 변수가 이 배포에 들어갔는지, 그리고 DB 서버 비밀이 DB에 등록된 해시와 맞는지를
// 예/아니오로만 알려준다(값은 절대 노출하지 않음). Vercel 환경 변수 범위(Production/Preview) 문제를 밖에서 확인하기 위한 용도.
export const dynamic = "force-dynamic";

export async function GET() {
  const configured = {
    secretToken: Boolean(process.env.STEPPAY_SECRET_TOKEN),
    planId: Boolean(process.env.NEXT_PUBLIC_STEPPAY_PLAN_ID),
    priceCode: Boolean(process.env.STEPPAY_PRICE_CODE),
    dbRpcSecret: Boolean(process.env.STEPPAY_DB_RPC_SECRET),
    webhookSecret: Boolean(process.env.STEPPAY_WEBHOOK_SECRET),
    salonBankAccount: Boolean(process.env.NEXT_PUBLIC_SALON_BANK_ACCOUNT),
  };

  // DB 서버 비밀 검증: 존재하지 않는 회원으로 읽기 전용 RPC를 호출 — 비밀이 맞으면 null, 틀리면 forbidden 오류.
  let dbSecretValid = false;
  if (configured.dbRpcSecret) {
    const res = await rpc("steppay_get_customer", { p_member_id: "00000000-0000-0000-0000-000000000000" });
    dbSecretValid = res.error === null;
  }

  return NextResponse.json({
    ...configured,
    dbSecretValid,
    cardPaymentReady: configured.secretToken && configured.planId && configured.dbRpcSecret && dbSecretValid,
  });
}
