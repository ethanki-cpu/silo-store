"use client";

import { useState } from "react";
import Link from "next/link";
import { useAuth } from "@/lib/AuthProvider";
import type { PageModuleRow, PageModuleType } from "@/lib/pageBuilder";
import type { BreadcrumbItem } from "@/components/PageHeader";
import { HeroModule } from "@/components/modules/HeroModule";
import { BreadcrumbWidget } from "@/components/modules/BreadcrumbWidget";
import { BoardModule } from "@/components/modules/BoardModule";
import { ApplicationModule } from "@/components/modules/ApplicationModule";
import { CalendarBoardWidget } from "@/components/modules/CalendarBoardWidget";
import { SearchInput } from "@/components/modules/SearchInput";
import { SortSelect } from "@/components/modules/SortSelect";
import { FilterModule } from "@/components/modules/FilterModule";
import { TextModule } from "@/components/modules/TextModule";
import { SpacerModule } from "@/components/modules/SpacerModule";
import { DividerModule } from "@/components/modules/DividerModule";
import { HtmlModule } from "@/components/modules/HtmlModule";
import { SurveyCard } from "@/components/modules/SurveyCard";
import { CtaButtons } from "@/components/modules/CtaButtons";
import { ButtonWidget } from "@/components/modules/ButtonWidget";
import { QuoteWidget } from "@/components/modules/QuoteWidget";
import { ImageWidget } from "@/components/modules/ImageWidget";
import { VideoWidget } from "@/components/modules/VideoWidget";
import { AudioWidget } from "@/components/modules/AudioWidget";
import { FaqWidget } from "@/components/modules/FaqWidget";
import { StatisticsWidget } from "@/components/modules/StatisticsWidget";
import { BadgeWidget } from "@/components/modules/BadgeWidget";
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
// EPIC-065: Visual Widget Builder — 위젯 23종(+레거시 sort/text) 전부를
// 여기서 처리한다. settings는 여전히 jsonb지만, 이 값을 만드는 유일한
// 경로는 AdminPageEditorPage의 Inspector 폼(체크박스/드롭다운/텍스트/목록)
// 이지 관리자가 직접 입력한 JSON이 아니다 — 그래서 각 FromSettings 함수는
// settings의 타입을 신뢰하지 않고 항상 타입가드를 거쳐 안전하게 꺼낸다.
//
// board_id를 쓰는 4종(board/slide/gallery/timeline)은 기존 Board System을
// 그대로 통과시킬 뿐이다 — Board는 여전히 "Page 안에서 쓰는 모듈"일 뿐 이
// 렌더러가 게시판 기능을 재구현하지 않는다.
//
// search/sort/filter 3종은 독립 모듈로 존재하되, 실제 목록 필터링과는
// 연동되지 않는 자기완결형 UI 데모다(각 Board 모듈은 이미 자체 검색/정렬을
// 내장하고 있음, src/components/boards/BoardHeader.tsx) — 로컬 state로
// 입력/선택 자체는 정상 동작하지만 어떤 데이터도 걸러내지 않는다는 뜻.

function str(v: unknown, fallback = ""): string {
  return typeof v === "string" ? v : fallback;
}
function num(v: unknown, fallback: number): number {
  return typeof v === "number" && Number.isFinite(v) ? v : fallback;
}
function bool(v: unknown, fallback: boolean): boolean {
  return typeof v === "boolean" ? v : fallback;
}
function arr<T>(v: unknown): T[] {
  return Array.isArray(v) ? (v as T[]) : [];
}

function HeroFromSettings({ settings }: { settings: Record<string, unknown> }) {
  const title = str(settings.title);
  const subtitle = settings.subtitle ? str(settings.subtitle) : undefined;
  const description = str(settings.description);
  const breadcrumb = arr<BreadcrumbItem>(settings.breadcrumb);
  return (
    <HeroModule
      title={title}
      subtitle={subtitle}
      breadcrumb={breadcrumb.length > 0 ? breadcrumb : [{ label: title }]}
      description={description}
    />
  );
}

function BreadcrumbFromSettings({ settings }: { settings: Record<string, unknown> }) {
  return <BreadcrumbWidget items={arr<BreadcrumbItem>(settings.items)} />;
}

function ApplicationFromSettings({ settings }: { settings: Record<string, unknown> }) {
  const actions = arr<{ label: string; href: string }>(settings.actions);
  return <ApplicationModule actions={actions} />;
}

function SurveyFromSettings({ settings }: { settings: Record<string, unknown> }) {
  const question = str(settings.question);
  const options = arr<{ label: string; votes?: number }>(settings.options);
  return <SurveyCard question={question} options={options} />;
}

function ButtonFromSettings({ settings }: { settings: Record<string, unknown> }) {
  const style = settings.style === "secondary" ? "secondary" : "primary";
  return <ButtonWidget label={str(settings.label)} href={str(settings.href)} style={style} />;
}

function CtaFromSettings({ settings }: { settings: Record<string, unknown> }) {
  return <CtaButtons ctas={arr<{ label: string; href: string }>(settings.ctas)} />;
}

function QuoteFromSettings({ settings }: { settings: Record<string, unknown> }) {
  return <QuoteWidget text={str(settings.text)} author={settings.author ? str(settings.author) : undefined} />;
}

function ImageFromSettings({ settings }: { settings: Record<string, unknown> }) {
  return (
    <ImageWidget
      url={str(settings.url)}
      alt={settings.alt ? str(settings.alt) : undefined}
      caption={settings.caption ? str(settings.caption) : undefined}
    />
  );
}

function VideoFromSettings({ settings }: { settings: Record<string, unknown> }) {
  return <VideoWidget url={str(settings.url)} caption={settings.caption ? str(settings.caption) : undefined} />;
}

function AudioFromSettings({ settings }: { settings: Record<string, unknown> }) {
  return <AudioWidget url={str(settings.url)} caption={settings.caption ? str(settings.caption) : undefined} />;
}

function FaqFromSettings({ settings }: { settings: Record<string, unknown> }) {
  return <FaqWidget items={arr<{ question: string; answer: string }>(settings.items)} />;
}

function StatisticsFromSettings({ settings }: { settings: Record<string, unknown> }) {
  return <StatisticsWidget items={arr<{ label: string; value: string }>(settings.items)} />;
}

function BadgeFromSettings({ settings }: { settings: Record<string, unknown> }) {
  return <BadgeWidget items={arr<{ label: string }>(settings.items)} />;
}

// EPIC-092(요구사항 5)/HOTFIX-093-B: board_id 연결 여부와 무관하게 항상
// CalendarBoardWidget으로 렌더링한다 — 이전에는 board_id가 비어 있으면
// 필터 체크박스/"+ 글 등록" 버튼이 아예 없는 순수 셸(CalendarGrid)로
// 조용히 폴백해서, 위젯을 아직 게시판에 연결하지 않은 캘린더는 이 UI들이
// "코드는 있지만 화면엔 없는" 상태가 됐다(실사용 신고로 확인됨).
// CalendarBoardWidget이 boardId=null을 직접 받아 데이터 조회만 건너뛰고
// 나머지 UI(필터/글쓰기 버튼)는 항상 그리도록 바뀌었다.
function CalendarFromSettings({ boardId }: { boardId: string | null }) {
  return <CalendarBoardWidget boardId={boardId} />;
}

function SearchDemo({ settings }: { settings: Record<string, unknown> }) {
  const [value, setValue] = useState("");
  return <SearchInput value={value} onChange={setValue} placeholder={str(settings.placeholder, "검색")} />;
}

function SortDemo() {
  const [value, setValue] = useState<SortOption>("latest");
  return <SortSelect value={value} onChange={setValue} />;
}

function FilterDemo({ settings }: { settings: Record<string, unknown> }) {
  const options = arr<{ value: string; label: string }>(settings.options);
  const [value, setValue] = useState<string | null>(null);
  return <FilterModule options={options} value={value} onChange={setValue} />;
}

function TextFromSettings({ settings }: { settings: Record<string, unknown> }) {
  return <TextModule text={str(settings.text)} />;
}

function HtmlFromSettings({ settings }: { settings: Record<string, unknown> }) {
  return <HtmlModule html={str(settings.html)} />;
}

function SpacerFromSettings({ settings }: { settings: Record<string, unknown> }) {
  return <SpacerModule heightPx={num(settings.heightPx, 32)} />;
}

function renderModule(module: PageModuleRow) {
  const { module_type, settings, board_id } = module;
  switch (module_type as PageModuleType) {
    case "hero":
      return <HeroFromSettings settings={settings} />;
    case "breadcrumb":
      return <BreadcrumbFromSettings settings={settings} />;
    case "board":
      return board_id ? (
        <BoardModule
          boardId={board_id}
          showHero={false}
          searchEnabled={bool(settings.searchEnabled, true)}
          sortEnabled={bool(settings.sortEnabled, true)}
          paginationEnabled={bool(settings.paginationEnabled, true)}
          pageSizeOverride={typeof settings.pageSize === "number" ? settings.pageSize : undefined}
          showThumbnail={bool(settings.showThumbnail, true)}
          showWriteButton={bool(settings.showWriteButton, true)}
          includeChildBoards={bool(settings.includeChildBoards, true)}
        />
      ) : (
        <EmptyState title="게시판이 연결되지 않았어요." description="'페이지 수정'에서 이 위젯에 게시판을 연결하세요." />
      );
    case "slide": {
      const sort = settings.sort === "popular" ? "popular" : "latest";
      const title = settings.title ? str(settings.title) : undefined;
      return <DbSlideModule boardId={board_id} sort={sort} title={title} />;
    }
    case "gallery":
      return <DbGalleryModule boardId={board_id} />;
    case "timeline":
      return <DbTimelineModule boardId={board_id} />;
    case "application":
      return <ApplicationFromSettings settings={settings} />;
    case "survey":
      return <SurveyFromSettings settings={settings} />;
    case "button":
      return <ButtonFromSettings settings={settings} />;
    case "cta":
      return <CtaFromSettings settings={settings} />;
    case "quote":
      return <QuoteFromSettings settings={settings} />;
    case "image":
      return <ImageFromSettings settings={settings} />;
    case "video":
      return <VideoFromSettings settings={settings} />;
    case "audio":
      return <AudioFromSettings settings={settings} />;
    case "faq":
      return <FaqFromSettings settings={settings} />;
    case "statistics":
      return <StatisticsFromSettings settings={settings} />;
    case "badge":
      return <BadgeFromSettings settings={settings} />;
    case "calendar":
      return <CalendarFromSettings boardId={board_id} />;
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

// EPIC-065: includeHidden=true는 관리자 화면(Live Preview) 전용 — 숨긴
// 위젯도 계속 보여주되 흐리게 표시해 "숨겨진 상태"를 알 수 있게 한다.
// 공개 페이지(기본값 false)는 숨긴 위젯을 아예 건너뛴다.
export function PageBuilderRenderer({
  modules,
  includeHidden = false,
}: {
  modules: PageModuleRow[];
  includeHidden?: boolean;
}) {
  const { member } = useAuth();
  const visible = includeHidden ? modules : modules.filter((m) => !m.is_hidden);

  if (visible.length === 0) {
    return <EmptyState title="이 페이지에는 아직 배치된 모듈이 없어요." />;
  }

  return (
    <div className="space-y-10">
      {visible.map((module) => (
        <div
          key={module.id}
          className={`relative${module.is_hidden ? " opacity-40" : ""}`}
        >
          {module.is_hidden && (
            <p className="mb-1 text-xs font-medium text-amber-600">🙈 숨겨진 위젯(공개 페이지에는 안 보임)</p>
          )}
          {/* EPIC-092(요구사항 3): 관리자에게만 위젯별 설정으로 바로 연결되는
              작은 톱니바퀴 버튼을 우측 상단에 띄운다. */}
          {member?.is_admin && (
            <Link
              href={`/admin/pages/${module.page_id}?module=${module.id}`}
              className="absolute top-1 right-1 z-10 rounded-full bg-gray-800/80 p-1 text-white hover:bg-gray-700"
              title="위젯 수정"
            >
              ⚙
            </Link>
          )}
          {renderModule(module)}
        </div>
      ))}
    </div>
  );
}
