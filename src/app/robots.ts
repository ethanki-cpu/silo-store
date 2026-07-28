import type { MetadataRoute } from "next";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

// EPIC-054D(사이트 감사 §9): 관리자 페이지/개인정보 설정/인증 폼/
// 로그인 필요 개인 영역은 검색 노출 가치가 없거나(로그인 게이트) 개인
// 데이터라 색인에서 제외한다 — sitemap.ts의 EXCLUDED_TOP_SEGMENTS와
// 동일한 기준.
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: [
        "/api/",
        "/admin/",
        "/mypage/",
        "/me",
        "/me/",
        "/settings",
        "/login",
        "/signup",
      ],
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
