"use client";

import { formatBytes, useFileSizes } from "@/lib/useFileSizes";
import type { SidebarIconsValue } from "@/lib/sidebarIconsSettings";
import type { TopBarIconsValue } from "@/lib/topBarIconsSettings";
import type { TopSidebarValue } from "@/lib/topSidebarSettings";

type Row = { group: string; label: string; url: string };

const DEVICES = [
  ["pc", "PC"],
  ["tablet", "태블릿"],
  ["mobile", "모바일"],
] as const;

function fileName(url: string): string {
  try {
    return decodeURIComponent(new URL(url).pathname.split("/").pop() ?? url);
  } catch {
    return url;
  }
}

/** 홈페이지 설정에 등록된 사이드바/상단 바 아이콘 파일 전부와 용량을 보여준다. */
export function IconFileSizesPanel({
  sidebarIcons,
  topBarIcons,
  topSidebar,
}: {
  sidebarIcons: SidebarIconsValue;
  topBarIcons: TopBarIconsValue;
  topSidebar: TopSidebarValue;
}) {
  const rows: Row[] = [];
  for (const [key, name] of DEVICES) {
    const c = sidebarIcons[key];
    const add = (group: string, label: string, url: string) => url && rows.push({ group, label: `${name} · ${label}`, url });
    add("좌/우 사이드바 아이콘", "왼쪽 기본", c.leftIconDefaultUrl);
    add("좌/우 사이드바 아이콘", "왼쪽 hover", c.leftIconHoverUrl);
    add("좌/우 사이드바 아이콘", "오른쪽 기본", c.rightIconDefaultUrl);
    add("좌/우 사이드바 아이콘", "오른쪽 hover", c.rightIconHoverUrl);
    const t = topSidebar[key];
    add("상단 사이드바 열기 버튼", "기본", t.triggerIconDefaultUrl);
    add("상단 사이드바 열기 버튼", "hover", t.triggerIconHoverUrl);
  }
  topBarIcons.icons.forEach((icon, i) => {
    if (icon.imageUrl) rows.push({ group: "상단 아이콘", label: `아이콘 ${i + 1} · 기본`, url: icon.imageUrl });
    if (icon.hoverImageUrl) rows.push({ group: "상단 아이콘", label: `아이콘 ${i + 1} · hover`, url: icon.hoverImageUrl });
  });

  const sizes = useFileSizes(rows.map((r) => r.url));
  // 같은 파일을 여러 기기/자리에서 쓰면 합계에는 한 번만 센다.
  const unique = [...new Set(rows.map((r) => r.url))];
  const total = unique.reduce((sum, u) => sum + (sizes[u] ?? 0), 0);
  const unknown = unique.filter((u) => sizes[u] === null).length;
  const pending = unique.filter((u) => sizes[u] === undefined).length;
  const groups = [...new Set(rows.map((r) => r.group))];

  return (
    <div className="space-y-3 text-xs text-gray-600">
      <p className="font-semibold text-gray-500">등록된 아이콘 파일 용량</p>
      {rows.length === 0 ? (
        <p>등록된 사이드바/상단 바 아이콘 파일이 없어요.</p>
      ) : (
        <>
          <p className="rounded bg-gray-100 px-2 py-1.5 text-[12px] text-gray-800">
            합계(중복 제외 {unique.length}개) <strong>{pending > 0 ? "계산 중..." : formatBytes(total)}</strong>
            {unknown > 0 && <span className="text-red-500"> · 용량을 못 읽은 파일 {unknown}개</span>}
          </p>
          {groups.map((g) => (
            <div key={g} className="space-y-1">
              <p className="font-medium text-gray-700">{g}</p>
              <ul className="space-y-1">
                {rows
                  .filter((r) => r.group === g)
                  .map((r, i) => {
                    const size = sizes[r.url];
                    const heavy = typeof size === "number" && size >= 2 * 1024 * 1024;
                    return (
                      <li key={`${r.label}-${i}`} className="flex items-start justify-between gap-2 border-b border-gray-100 pb-1">
                        <span className="min-w-0">
                          <span className="block text-gray-700">{r.label}</span>
                          <span className="block truncate text-[10px] text-gray-400" title={r.url}>
                            {fileName(r.url)}
                          </span>
                        </span>
                        <span className={`shrink-0 font-medium ${heavy ? "text-red-600" : "text-gray-700"}`}>
                          {size === undefined ? "…" : size === null ? "알 수 없음" : formatBytes(size)}
                        </span>
                      </li>
                    );
                  })}
              </ul>
            </div>
          ))}
          <p className="text-[10px] text-gray-400">2MB 이상은 빨간색으로 표시돼요. GIF는 webm/mp4로 바꾸면 훨씬 작아져요.</p>
        </>
      )}
    </div>
  );
}
