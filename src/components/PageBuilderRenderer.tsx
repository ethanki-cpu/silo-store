"use client";

import { useState } from "react";
import type { PageModuleRow, PageModuleType } from "@/lib/pageBuilder";
import type { BreadcrumbItem } from "@/components/PageHeader";
import { HeroModule } from "@/components/modules/HeroModule";
import { BoardModule } from "@/components/modules/BoardModule";
import { ApplicationModule } from "@/components/modules/ApplicationModule";
import { CalendarGrid } from "@/components/modules/CalendarGrid";
import { SearchInput } from "@/components/modules/SearchInput";
import { SortSelect } from "@/components/modules/SortSelect";
import { FilterModule } from "@/components/modules/FilterModule";
import { TextModule } from "@/components/modules/TextModule";
import { SpacerModule } from "@/components/modules/SpacerModule";
import { DividerModule } from "@/components/modules/DividerModule";
import { HtmlModule } from "@/components/modules/HtmlModule";
import { DbSlideModule, DbGalleryModule, DbTimelineModule } from "@/components/modules/DbFeedModules";
import { EmptyState } from "@/components/modules/EmptyState";
import type { SortOption } from "@/lib/boardLayout";

// EPIC-060: Page Builder — page_modules(DB) 행을 순서대로 렌더링하는 조합기.
// src/components/modules/PageModuleRenderer.tsx(EPIC-054B, compile-time
// PageModuleConfig[] 전용, /boards 페이지 하나만 사용)는 건드리지 않고 그대로
// 둔다 — 이 컴포넌트는 별도의 "DB 행 → 기존 Module 컴포넌트" 경로다. 두
// 렌더러 모두 결국 같은 leaf 컴포넌트(BoardModule/HeroModule/...)에 위임하므로
// 실제 렌더링 로직이 중복되지 않는다.
//
// board_id를 쓰는 4종(board/slide/gallery/timeline)은 기존 Board System을
// 그대로 통과시킬 뿐이다 — Board는 여전히 "Page 안에서 쓰는 모듈"일 뿐 이
// 렌더러가 게시판 기능을 재구현하지 않는다.
//
// search/sort/filter 3종은 독립 모듈로 존재하되, 실제 목록 필터링과는
// 연동되지 않는 자기완결형 UI 데모다(각 Board 모듈은 이미 자체 검색/정렬을
// 내장하고 있음, src/components/boards/BoardHeader.tsx) — 로컬 state로
// 입력/선택 자체는 정상 동작하지만 어떤 데이터도 걸러내지 않는다는 뜻.
// 실제 데이터와 연동하려면 이 페이지에 놓인 다른 모듈과 별도로 wiring하는
// 후속 작업이 필요하다(이번 EPIC 범위 밖 — 명시적으로 남겨둔 제한).

function HeroFromSettings({ settings }: { settings: Record<string, unknown> }) {
  const title = typeof settings.title === "string" ? settings.title : "";
  const subtitle = typeof settings.subtitle === "string" ? settings.subtitle : undefined;
  const description = typeof settings.description === "string" ? settings.description : "";
  const breadcrumb = Array.isArray(settings.breadcrumb)
    ? (settings.breadcrumb as BreadcrumbItem[])
    : [{ label: title }];
  return <HeroModule title={title} subtitle={subtitle} breadcrumb={breadcrumb} description={description} />;
}

function ApplicationFromSettings({ settings }: { settings: Record<string, unknown> }) {
  const actions = Array.isArray(settings.actions)
    ? (settings.actions as { label: string; href: string }[])
    : [];
  return <ApplicationModule actions={actions} />;
}

function CalendarFromSettings({ settings }: { settings: Record<string, unknown> }) {
  const now = new Date();
  const year = typeof settings.year === "number" ? settings.year : now.getFullYear();
  const month = typeof settings.month === "number" ? settings.month : now.getMonth() + 1;
  return <CalendarGrid year={year} month={month} />;
}

function SearchDemo({ settings }: { settings: Record<string, unknown> }) {
  const [value, setValue] = useState("");
  const placeholder = typeof settings.placeholder === "string" ? settings.placeholder : "검색";
  return <SearchInput value={value} onChange={setValue} placeholder={placeholder} />;
}

function SortDemo() {
  const [value, setValue] = useState<SortOption>("latest");
  return <SortSelect value={value} onChange={setValue} />;
}

function FilterDemo({ settings }: { settings: Record<string, unknown> }) {
  const options = Array.isArray(settings.options)
    ? (settings.options as { value: string; label: string }[])
    : [];
  const [value, setValue] = useState<string | null>(null);
  return <FilterModule options={options} value={value} onChange={setValue} />;
}

function TextFromSettings({ settings }: { settings: Record<string, unknown> }) {
  return <TextModule text={typeof settings.text === "string" ? settings.text : ""} />;
}

function HtmlFromSettings({ settings }: { settings: Record<string, unknown> }) {
  return <HtmlModule html={typeof settings.html === "string" ? settings.html : ""} />;
}

function SpacerFromSettings({ settings }: { settings: Record<string, unknown> }) {
  return <SpacerModule heightPx={typeof settings.heightPx === "number" ? settings.heightPx : 32} />;
}

function renderModule(module: PageModuleRow) {
  const { module_type, settings, board_id } = module;
  switch (module_type as PageModuleType) {
    case "hero":
      return <HeroFromSettings settings={settings} />;
    case "board":
      return board_id ? (
        <BoardModule boardId={board_id} showHero={false} />
      ) : (
        <EmptyState title="게시판이 연결되지 않았어요." description="/admin/pages에서 이 모듈에 게시판을 연결하세요." />
      );
    case "slide":
      return <DbSlideModule boardId={board_id} />;
    case "gallery":
      return <DbGalleryModule boardId={board_id} />;
    case "timeline":
      return <DbTimelineModule boardId={board_id} />;
    case "application":
      return <ApplicationFromSettings settings={settings} />;
    case "calendar":
      return <CalendarFromSettings settings={settings} />;
    case "search":
      return <SearchDemo settings={settings} />;
    case "sort":
      return <SortDemo />;
    case "filter":
      return <FilterDemo settings={settings} />;
    case "text":
      return <TextFromSettings settings={settings} />;
    case "html":
      return <HtmlFromSettings settings={settings} />;
    case "spacer":
      return <SpacerFromSettings settings={settings} />;
    case "divider":
      return <DividerModule />;
    default:
      return null;
  }
}

export function PageBuilderRenderer({ modules }: { modules: PageModuleRow[] }) {
  if (modules.length === 0) {
    return <EmptyState title="이 페이지에는 아직 배치된 모듈이 없어요." />;
  }

  return (
    <div className="space-y-10">
      {modules.map((module) => (
        <div key={module.id}>{renderModule(module)}</div>
      ))}
    </div>
  );
}
