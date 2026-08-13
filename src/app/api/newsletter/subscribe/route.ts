import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabaseClient";

// EPIC-099(항목 1, 최소 범위): 홈페이지 Craft `NewsletterBlock`의 구독 폼이
// 부르는 엔드포인트 — 로그인 여부와 무관하게 이메일만 저장한다(발송 채널
// 연동은 스코프 밖). 서버에서 이메일 형식을 한 번 더 검증해 클라이언트
// 조작으로 빈 값/이상한 문자열이 그대로 저장되는 걸 막는다.
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  const email = typeof body?.email === "string" ? body.email.trim().toLowerCase() : "";

  if (!EMAIL_PATTERN.test(email)) {
    return NextResponse.json({ error: "올바른 이메일 주소를 입력해주세요." }, { status: 400 });
  }

  // upsert(onConflict)는 PostgREST가 내부적으로 INSERT ... ON CONFLICT DO
  // UPDATE로 번역하는데, 이 경로는 충돌 행을 먼저 "읽어야" 해서 SELECT RLS
  // 정책까지 함께 통과해야 한다 — 이 테이블의 SELECT는 관리자 전용이라
  // anon 요청이 42501로 막힌다(로컬에서 직접 재현 확인). 대신 평범한 insert만
  // 시도하고, unique 위반(이미 구독 중)은 에러가 아니라 그대로 성공 취급한다
  // — SELECT 정책을 건드리지 않아도 되는 훨씬 단순한 우회.
  const { error } = await supabase.from("newsletter_subscribers").insert({ email });

  if (error && error.code !== "23505") {
    return NextResponse.json({ error: "구독 처리에 실패했어요." }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
