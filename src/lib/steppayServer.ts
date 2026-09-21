import { createHmac, timingSafeEqual } from "node:crypto";
import { supabase } from "@/lib/supabaseClient";

// EPIC-159: 스텝페이(Steppay) 서버 공용 헬퍼. service-role 키가 없는 프로젝트라(CLAUDE.md) 웹훅처럼 사용자 신원이 없는
// 쓰기는 SECURITY DEFINER RPC + 서버 전용 공유 비밀(STEPPAY_DB_RPC_SECRET)로 보호한다(docs/sql/EPIC-159-steppay.sql).
// 스텝페이 문서: https://docs.steppay.kr/llms.txt

const STEPPAY_API = "https://api.steppay.kr";

/** Patron 등급 — 스텝페이 구독이 유효하면 이 등급으로 승급, 구독이 끝나면(현재 등급이 이 값일 때만) 기본 등급으로 강등. */
export const PATRON_RANK = 3;
/** 웹훅 서명의 timestamp 허용 오차(초) — 재전송 공격 방지. */
const SIGNATURE_TOLERANCE_SEC = 10 * 60;

export class SteppayConfigError extends Error {}

function requireEnv(name: string): string {
  const v = process.env[name];
  if (!v) throw new SteppayConfigError(`${name} 환경 변수가 설정되지 않았어요.`);
  return v;
}

export function steppayConfigured(): boolean {
  return Boolean(process.env.STEPPAY_SECRET_TOKEN && process.env.NEXT_PUBLIC_STEPPAY_PLAN_ID && process.env.STEPPAY_DB_RPC_SECRET);
}

export type SteppayResult<T> = { ok: true; data: T } | { ok: false; status: number; message: string };

/** 스텝페이 V1 API 호출(Secret-Token 헤더 — 서버 전용). */
export async function steppayRequest<T = Record<string, unknown>>(
  method: "GET" | "POST",
  path: string,
  body?: unknown,
): Promise<SteppayResult<T>> {
  const res = await fetch(`${STEPPAY_API}${path}`, {
    method,
    headers: { "Secret-Token": requireEnv("STEPPAY_SECRET_TOKEN"), "Content-Type": "application/json", accept: "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
    cache: "no-store",
  });
  const json = (await res.json().catch(() => ({}))) as Record<string, unknown>;
  if (!res.ok) return { ok: false, status: res.status, message: String(json.message ?? json.error ?? "스텝페이 요청에 실패했어요.") };
  return { ok: true, data: json as T };
}

export async function rpc<T = unknown>(fn: string, args: Record<string, unknown>): Promise<{ data: T | null; error: string | null }> {
  const { data, error } = await supabase.rpc(fn, { p_secret: requireEnv("STEPPAY_DB_RPC_SECRET"), ...args });
  return { data: (data as T) ?? null, error: error?.message ?? null };
}

type PriceDto = { code: string; price?: number; type?: string; recurring?: unknown };
type ProductDto = { code: string; name?: string; prices?: PriceDto[] };

/** 구독 상품(NEXT_PUBLIC_STEPPAY_PLAN_ID=상품 코드)의 가격 플랜 코드 — STEPPAY_PRICE_CODE가 있으면 그것, 없으면 상품에서 정기(FLAT) 플랜을 조회. */
export async function subscriptionPriceCode(): Promise<SteppayResult<{ productCode: string; priceCode: string; price: number | null }>> {
  const productCode = requireEnv("NEXT_PUBLIC_STEPPAY_PLAN_ID");
  const fixed = process.env.STEPPAY_PRICE_CODE;
  if (fixed) return { ok: true, data: { productCode, priceCode: fixed, price: null } };
  const product = await steppayRequest<ProductDto>("GET", `/api/v1/products/${encodeURIComponent(productCode)}`);
  if (!product.ok) return product;
  const prices = product.data.prices ?? [];
  const plan = prices.find((p) => p.type === "FLAT" || p.recurring) ?? prices[0];
  if (!plan?.code) return { ok: false, status: 404, message: "구독 상품의 가격 플랜을 찾지 못했어요." };
  return { ok: true, data: { productCode, priceCode: plan.code, price: plan.price ?? null } };
}

/**
 * 웹훅 서명 검증 — 헤더 `Steppay-Signature: timestamp=<초>,key=<base64>[;<base64>...]`,
 * key = Base64(HmacSHA256(secret, `${timestamp}.${rawBody}`)). 키가 여러 개면(시크릿 교체 중) 하나라도 맞으면 통과.
 */
export function verifySteppaySignature(header: string | null, rawBody: string, secret: string, nowSec = Math.floor(Date.now() / 1000)): boolean {
  if (!header) return false;
  const tsMatch = /(?:^|,)\s*timestamp=(\d+)/.exec(header);
  const keyMatch = /(?:^|,)\s*key=(.+)$/.exec(header);
  if (!tsMatch || !keyMatch) return false;
  const timestamp = tsMatch[1];
  if (Math.abs(nowSec - Number(timestamp)) > SIGNATURE_TOLERANCE_SEC) return false;
  const expected = createHmac("sha256", secret).update(`${timestamp}.${rawBody}`).digest("base64");
  const expectedBuf = Buffer.from(expected);
  return keyMatch[1].split(";").some((k) => {
    const candidate = Buffer.from(k.trim());
    return candidate.length === expectedBuf.length && timingSafeEqual(candidate, expectedBuf);
  });
}
