import { supabase } from "@/lib/supabaseClient";

// HOTFIX-168(사용자 신고 — "ethanki@silostore.net으로 로그인했는데 온라인 도슨트 게시글을 못 본다"): 이 앱의 인증은 쿠키가 아니라 브라우저 localStorage 세션이라,
// Route Handler는 클라이언트가 Authorization 헤더를 직접 실어 보낼 때만 "누가 요청했는지" 안다. 타임라인 API 호출이 헤더 없이 나가
// 로그인한 Lautrec·관리자도 비회원으로 판정돼 "Alice 등급부터 열람 가능" 오류가 났다 — 로그인 세션이 있으면 토큰을 붙여 fetch하는 공용 헬퍼.
export async function authFetch(input: string, init: RequestInit = {}): Promise<Response> {
  let token: string | undefined;
  try {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    token = session?.access_token;
  } catch {
    token = undefined;
  }
  if (!token) return fetch(input, init);
  const headers = new Headers(init.headers);
  if (!headers.has("Authorization")) headers.set("Authorization", `Bearer ${token}`);
  return fetch(input, { ...init, headers });
}
