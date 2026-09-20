import { createHmac } from "node:crypto";
import { supabase } from "@/lib/supabaseClient";

// EPIC-158: 토스페이먼츠 서버 공용 헬퍼. service-role 키가 없는 프로젝트라(CLAUDE.md) 사용자 신원이
// 없는 토스 리다이렉트/결제 확정 쓰기는 SECURITY DEFINER RPC + 서버 전용 공유 비밀(TOSS_DB_RPC_SECRET)로
// 보호한다(docs/sql/EPIC-158-toss-payments.sql).

const TOSS_API = "https://api.tosspayments.com";

// 정기구독 결제 시 적립하는 포인트 비율(%) — 정책 미확정이라 전 등급 공통 임시 1%(NEXT_TASK.md 확인 필요).
export const SUBSCRIPTION_POINT_PCT = 1;
export const PATRON_RANK = 3;

export type PaidTier = { rank: number; name: string; price: number };

export class TossConfigError extends Error {}

function requireEnv(name: string): string {
  const v = process.env[name];
  if (!v) throw new TossConfigError(`${name} 환경 변수가 설정되지 않았어요.`);
  return v;
}

export function dbRpcSecret(): string {
  return requireEnv("TOSS_DB_RPC_SECRET");
}

/** 회원 id로부터 추측 불가능한 customerKey를 만든다(HMAC — id 자체를 노출/추측 가능하게 쓰지 않음). */
export function customerKeyFor(memberId: string): string {
  const digest = createHmac("sha256", dbRpcSecret()).update(`toss-customer:${memberId}`).digest("hex");
  return `silo_${digest.slice(0, 40)}`;
}

export type TossResult<T> = { ok: true; data: T } | { ok: false; status: number; code: string; message: string };

export async function tossRequest<T = Record<string, unknown>>(path: string, body: unknown): Promise<TossResult<T>> {
  const secretKey = requireEnv("TOSS_SECRET_KEY");
  const res = await fetch(`${TOSS_API}${path}`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${Buffer.from(`${secretKey}:`).toString("base64")}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
  const json = (await res.json().catch(() => ({}))) as Record<string, unknown>;
  if (!res.ok) {
    return {
      ok: false,
      status: res.status,
      code: String(json.code ?? "UNKNOWN"),
      message: String(json.message ?? "토스페이먼츠 요청에 실패했어요."),
    };
  }
  return { ok: true, data: json as T };
}

export async function rpc<T = unknown>(fn: string, args: Record<string, unknown>): Promise<{ data: T | null; error: string | null }> {
  const { data, error } = await supabase.rpc(fn, { p_secret: dbRpcSecret(), ...args });
  return { data: (data as T) ?? null, error: error?.message ?? null };
}

/** 정기결제로 구독할 수 있는 유료 등급 목록(가격 > 0, 평생 등급 제외) — membership_tiers 기준(서버 산출). */
export async function paidTiers(): Promise<PaidTier[]> {
  const { data } = await supabase
    .from("membership_tiers")
    .select("rank, name, price, is_lifetime")
    .gt("price", 0)
    .order("rank", { ascending: true });
  return ((data ?? []) as { rank: number; name: string; price: number; is_lifetime: boolean }[])
    .filter((t) => !t.is_lifetime && t.rank > 0 && t.rank < 99)
    .map((t) => ({ rank: t.rank, name: t.name, price: t.price }));
}

/** 특정 등급의 구독 정보(유료 등급이 아니면 null). */
export async function paidTier(rank: number): Promise<PaidTier | null> {
  return (await paidTiers()).find((t) => t.rank === rank) ?? null;
}
