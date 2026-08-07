import type { Metadata } from "next";
import { Suspense } from "react";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/lib/AuthProvider";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

// EPIC-054D: 사이트 전체 SEO 감사 결과, 이 root metadata가 create-next-app
// 스캐폴드 placeholder("Create Next App")를 그대로 쓰고 있었고 어떤 개별
// page.tsx도 metadata를 override하지 않아(전수 조사 완료) 모든 페이지가
// 이 값을 그대로 상속했다. 페이지별 metadata는 70개 페이지 각각에 대한
// 콘텐츠 작성이 필요한 별도 작업이라 이번 감사 범위 밖(NEXT_TASK.md 기록)
// — 우선 전체가 상속하는 기본값만 실제 사이트 정보로 교체한다.
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
const SITE_NAME = "사일로 스토어";
const SITE_DESCRIPTION =
  "사일로 스토어 — 멤버십 기반 커뮤니티 플랫폼. 사일로상점(물품 소매/대여), 살롱데상(클럽 모임·게시판·살롱 공간), 스튜디오(공간 대관)를 함께 제공합니다.";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: SITE_NAME,
    template: `%s | ${SITE_NAME}`,
  },
  description: SITE_DESCRIPTION,
  openGraph: {
    title: SITE_NAME,
    description: SITE_DESCRIPTION,
    siteName: SITE_NAME,
    type: "website",
    locale: "ko_KR",
  },
  twitter: {
    card: "summary",
    title: SITE_NAME,
    description: SITE_DESCRIPTION,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="ko"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col" suppressHydrationWarning>
        <AuthProvider>
          <Suspense fallback={null}>
            <Navbar />
          </Suspense>
          {children}
          <Footer />
        </AuthProvider>
      </body>
    </html>
  );
}
