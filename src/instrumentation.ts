import type { Instrumentation } from "next";

// HOTFIX-152.4: 모바일 실기기에서 헤더가 통째로 사라지던 버그(HOTFIX-152.2)를
// NavbarBoundary(Error Boundary)로 막았지만, 정확히 어떤 에러가 그 Suspense
// 구간에서 발생했는지는 서버 로그에 아무 흔적도 안 남아 끝내 특정하지
// 못했다 — Vercel 프로덕션 런타임 로그에 직접 접근할 수단이 이 세션엔 없어
// 재발 시에도 같은 한계에 부딪힌다. onRequestError는 Next.js가 서버에서
// 잡은 렌더링 에러를 그대로 넘겨주는 공식 훅(Next 15+)이라, 이걸 최소
// 텔레메트리로 client_error_logs 테이블에 남겨두면 다음에 이 버그(혹은
// 다른 조용한 SSR 에러)가 재발했을 때 실제 message/digest/요청 정보를
// 확보할 수 있다.
export const onRequestError: Instrumentation.onRequestError = async (
  err,
  request,
  context,
) => {
  try {
    const message = err instanceof Error ? err.message : String(err);
    const digest =
      typeof err === "object" && err !== null && "digest" in err
        ? String((err as { digest?: unknown }).digest)
        : undefined;

    const { supabase } = await import("@/lib/supabaseClient");
    await supabase.from("client_error_logs").insert({
      source: "server-request-error",
      message,
      digest,
      path: request.path,
      method: request.method,
      route_type: context.routeType,
      render_source: context.renderSource ?? null,
      revalidate_reason: context.revalidateReason ?? null,
      render_type: null,
      user_agent: Array.isArray(request.headers["user-agent"])
        ? request.headers["user-agent"][0]
        : request.headers["user-agent"],
      extra: { routerKind: context.routerKind, routePath: context.routePath },
    });
  } catch {
    // 로깅 자체가 실패해도 실제 요청 처리를 막으면 안 된다 — 조용히 무시.
  }
};
