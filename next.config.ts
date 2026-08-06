import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "drive.google.com",
      },
      {
        protocol: "https",
        hostname: "*.supabase.co",
      },
    ],
  },
  turbopack: {
    root: __dirname,
  },
  // EPIC-080: 내비게이션 이중 구조(Dual-Nav) 정리 — 이 정적 페이지들은
  // site_navigations가 실제로 가리키는 다른 URL과 내용이 겹치는 그림자
  // placeholder였다(예: "할머니"는 /shop/heritage/grandma가 "준비 중"만
  // 보여주는 동안 실제 게시판은 /heritage/grandmas에 연결돼 있었음). 그
  // 페이지 파일 자체는 삭제했고, 혹시 남아있는 외부 링크/북마크가 깨지지
  // 않도록 실제 목적지로 301 리다이렉트한다.
  async redirects() {
    return [
      { source: "/shop/heritage/grandma", destination: "/heritage/grandmas", permanent: true },
      { source: "/shop/heritage/grandpa", destination: "/heritage/grandpas", permanent: true },
      { source: "/gallery/awards", destination: "/salon/gallery/awards", permanent: true },
      { source: "/gallery/parties", destination: "/salon/gallery/parties", permanent: true },
      { source: "/gallery/patrons", destination: "/salon/gallery/patrons", permanent: true },
      { source: "/gallery/performance", destination: "/salon/gallery/performances", permanent: true },
      { source: "/gallery/visitors", destination: "/salon/gallery/visitors", permanent: true },
      { source: "/membership/artist-intro", destination: "/salon/artist-intro", permanent: true },
      { source: "/membership/mind-diary", destination: "/salon/mind-diary", permanent: true },
      { source: "/membership/my-treasures", destination: "/salon/my-treasure-story", permanent: true },
      { source: "/membership/one-sentence-novel", destination: "/salon/one-sentence-novel", permanent: true },
      { source: "/membership/secret-room", destination: "/salon/secret-room", permanent: true },
      { source: "/archive/brochure", destination: "/downloads", permanent: true },
      { source: "/archive/posters", destination: "/downloads", permanent: true },
    ];
  },
};

export default nextConfig;
