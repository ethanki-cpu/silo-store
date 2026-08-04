import type { MetadataRoute } from "next";
import fs from "node:fs";
import path from "node:path";
import { supabase } from "@/lib/supabaseClient";
import {
  HERITAGE_GRANDMA_NAMES,
  HERITAGE_GRANDPA_NAMES,
  SALON_TOPIC_BOARD_NAMES,
  SALON_WEEKDAY_CLUB_NAMES,
} from "@/lib/navConfig";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

// EPIC-054D(사이트 감사 §8): 로그인/관리자 전용 등 검색 노출이 의미 없는
// 라우트는 robots.ts와 동일한 기준으로 제외한다.
const EXCLUDED_TOP_SEGMENTS = new Set([
  "api",
  "admin",
  "mypage",
  "me",
  "settings",
  "login",
  "signup",
]);

const APP_DIR = path.join(process.cwd(), "src", "app");

// src/app을 직접 스캔해 정적 페이지 목록을 만든다 — 새 page.tsx를
// 추가해도 이 파일을 손대지 않아도 자동으로 sitemap에 포함된다("새 Page가
// 추가되면 자동으로 Sitemap에 포함되도록 한다" 요구 반영).
function collectStaticRoutes(dir: string, segments: string[] = []): string[] {
  let entries: fs.Dirent[];
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    return [];
  }

  const routes: string[] = [];
  const hasPage = entries.some(
    (e) => e.isFile() && (e.name === "page.tsx" || e.name === "page.ts"),
  );
  if (hasPage) {
    routes.push(segments.length === 0 ? "/" : "/" + segments.join("/"));
  }

  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    if (entry.name.startsWith("_") || entry.name.startsWith("(")) continue;
    if (entry.name.startsWith("[")) continue; // 동적 라우트는 아래에서 별도로 채운다
    if (segments.length === 0 && EXCLUDED_TOP_SEGMENTS.has(entry.name)) continue;

    routes.push(
      ...collectStaticRoutes(path.join(dir, entry.name), [...segments, entry.name]),
    );
  }

  return routes;
}

// 이름 목록이 하드코딩된 동적 라우트(heritage/community) — navConfig.ts의
// 기존 배열을 그대로 재사용해 열거한다(새 데이터 중복 없음).
function collectNamedRoutes(): string[] {
  return [
    ...HERITAGE_GRANDMA_NAMES.map((name) => `/heritage/grandma/${encodeURIComponent(name)}`),
    ...HERITAGE_GRANDPA_NAMES.map((name) => `/heritage/grandpa/${encodeURIComponent(name)}`),
    ...SALON_TOPIC_BOARD_NAMES.map((name) => `/community/club/${encodeURIComponent(name)}`),
    ...SALON_WEEKDAY_CLUB_NAMES.map((name) => `/community/club/${encodeURIComponent(name)}`),
  ];
}

// DB에서 조회해야 하는 동적 라우트 — 테이블 하나가 실패해도 나머지는
// 그대로 포함되도록 개별적으로 방어한다(사이트맵 전체가 깨지지 않게).
async function collectDynamicRoutes(): Promise<string[]> {
  const sources: { table: string; select: string; toPath: (row: { id: string; slug?: string }) => string }[] = [
    // EPIC-079-PHASE-2: /boards는 이제 slug로 라우팅한다 — slug가 아직
    // 없는(마이그레이션 전) 행은 id로 폴백.
    { table: "boards", select: "id, slug", toPath: (row) => `/boards/${row.slug ?? row.id}` },
    { table: "items", select: "id", toPath: (row) => `/shop/${row.id}` },
    { table: "docent_contents", select: "id", toPath: (row) => `/docent/${row.id}` },
    { table: "clubs", select: "id", toPath: (row) => `/clubs/${row.id}` },
  ];

  const routes: string[] = [];
  for (const { table, select, toPath } of sources) {
    try {
      const { data } = await supabase.from(table).select(select).limit(1000);
      for (const row of (data ?? []) as unknown as { id: string; slug?: string }[]) {
        routes.push(toPath(row));
      }
    } catch {
      // 해당 테이블 조회 실패는 그 테이블만 건너뛴다.
    }
  }
  return routes;
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticRoutes = collectStaticRoutes(APP_DIR);
  const namedRoutes = collectNamedRoutes();
  const dynamicRoutes = await collectDynamicRoutes();

  const all = [...new Set([...staticRoutes, ...namedRoutes, ...dynamicRoutes])];

  return all.map((route) => ({
    url: `${SITE_URL}${route === "/" ? "" : route}`,
    lastModified: new Date(),
  }));
}
