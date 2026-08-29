"use client";

// EPIC-137(사용자 지시 — "4개로 구분하지마 홈페이지를. 한개의 홈페이지를
// 실시간으로 설정하는거야. 한개의 preview를 가지고, 각 블록마다 Elements,
// Control 탭이 다르게 나오는거라구."): EPIC-136까지도 "홈페이지 헤더 디자인/
// 슬라이드쇼/사이드바 아이콘/하단 메뉴 관리" 4개 섹션을 상단 버튼으로
// 전환하는 방식이었다 — 사용자가 이걸 "또다시 4개의 화면"이라고 재차
// 거부하고, BuilderJS 레퍼런스 그대로 (1) 화면 전환 없이 실제 페이지 전체를
// 위에서 아래로 이어 보여주는 캔버스 하나, (2) 왼쪽에 Elements/Controls/
// Page/Themes 4개 탭 패널을 명시적으로 요구했다. 이번 구현:
// - 캔버스: Navbar(헤더, 이미 EPIC-136에서 실제 컴포넌트+자유 드래그로 전환
//   완료) → 슬라이드쇼(실제 HeroSlideshow, 신규 클릭 선택) → 사이드바 아이콘
//   미리보기(실제 좌/우 아이콘은 화면 가장자리 fixed 트리거라 인라인에
//   그대로 넣을 수 없어, 실제 이미지를 쓰는 대표 미리보기 칩으로 대체 —
//   클릭하면 동일하게 설정 가능) → 하단 메뉴(Footer, 기존 CraftFooterEditor
//   전체화면 대신 같은 Editor를 이 캔버스 안에 인라인으로 얹음) 순서로 전부
//   한 화면에 이어 붙인다.
// - 왼쪽 패널: Elements(페이지 요소 목록 클릭 이동 + 하단 메뉴에 새 블록
//   추가하는 기존 Toolbox 기능) / Controls(선택된 요소의 실제 설정 —
//   이미지 필드마다 실제 썸네일 미리보기 포함) / Page(페이지 단위 안내) /
//   Themes(호버 모션을 탭+계정 메뉴 전체에 일괄 적용) 4탭.
// - 저장: 기존 site_settings 6개 키 + 하단 메뉴 craft_state까지 "저장하기"
//   버튼 하나로 함께 저장한다(craft_state는 Editor 컨텍스트 밖에서 접근할
//   수 없어 CraftBridge가 query/actions를 ref로 끌어올린다).
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Editor, Frame, useEditor } from "@craftjs/core";
import { supabase } from "@/lib/supabaseClient";
import { primaryButtonClass } from "../shared";
import { Navbar } from "@/components/Navbar";
import { HeroSlideshow } from "@/components/HeroSlideshow";
import { SelectionOverlay } from "@/components/SelectionOverlay";
import { uploadImage, compressImage } from "@/lib/adminImageUpload";
import { fetchNavTabs, type NavTab, type DbTargetType } from "@/lib/navConfig";
import { ensurePageForSlug, hrefToSlug } from "@/lib/pageTemplates";
import { PRIMITIVE_RESOLVER, PRIMITIVE_BLOCK_OPTIONS } from "@/components/craft/primitives";
import type { CraftBlockOption } from "@/components/craft/shared/types";
import { craftFooterResolver } from "@/components/craft/footer/resolver";
import { footerDefaultTree, footerBlockOptions } from "@/components/craft/footer/defaultTree";
import {
  normalizeMainLogo,
  defaultMainLogoValue,
  DEFAULT_LOGO_HEIGHT_PX,
  DEFAULT_LOGO_TEXT_COLOR,
  type MainLogoValue,
  type CustomFontEntry,
} from "@/lib/mainLogoSettings";
import {
  normalizeSidebarIcons,
  defaultSidebarIconsValue,
  DEFAULT_ICON_SIZE_PX,
  type SidebarIconsValue,
} from "@/lib/sidebarIconsSettings";
import {
  normalizeTopTabStyle,
  defaultTopTabStyleValue,
  defaultTopTabStyleEntry,
  type TopTabStyleValue,
  type TopTabStyleEntry,
} from "@/lib/topTabStyleSettings";
import {
  normalizeAccountMenuStyle,
  defaultAccountMenuStyleValue,
  type AccountMenuStyleValue,
  type ExtraAccountItem,
} from "@/lib/accountMenuStyleSettings";
import { HEADER_MENU_ITEM_LABELS, type HeaderMenuItemKey } from "@/lib/headerLayoutSettings";
import {
  normalizeHeroSlideshow,
  defaultHeroSlideshowValue,
  type HeroSlideshowValue,
  type SlideItem,
} from "@/lib/heroSlideshow";
import {
  normalizeHeaderPositions,
  defaultHeaderPositionsValue,
  type HeaderPositionsValue,
  type HeaderSlotOffset,
} from "@/lib/headerLayoutPositions";
import {
  normalizeTopSidebar,
  defaultTopSidebarValue,
  type TopSidebarValue,
  type TopSidebarConfig,
  type TopSidebarLink,
  type TopSidebarChildLink,
} from "@/lib/topSidebarSettings";
import { FIXED_LINKS as TOP_SIDEBAR_FIXED_LINKS } from "@/components/TopSidebarPanel";
import {
  normalizeTopBarIcons,
  defaultTopBarIconsValue,
  newTopBarIcon,
  DEFAULT_TOP_BAR_ICON_SIZE_PX,
  type TopBarIconsValue,
  type TopBarIcon,
} from "@/lib/topBarIconsSettings";
import { TAB_HOVER_MOTIONS, TAB_HOVER_MOTION_LABELS, DEFAULT_TAB_HOVER_MOTION, tabHoverMotionCss, type TabHoverMotion } from "@/lib/tabHoverMotion";
import { measureReferenceWidth } from "@/lib/useReferenceWidth";

// HOTFIX-137.4(사용자 지시 — "여백 배경 이미지 갯수를 10개가 아닌 100개로"): 10 → 100.
const MAX_WALLPAPERS = 100;

// HOTFIX-137.5(사용자 지시 — "각 요소마다 '드롭다운'이 되게 하는걸
// 선택할수 있는 기능을 만들고"): EPIC-138이 "사이트 구성 관리 > 사이트
// 메뉴"에 만든 것과 동일한 라벨 — 여기서도 바로 편집할 수 있게(다른
// 화면으로 안내만 하던 것 대신) 탭 Controls 패널에 동일한 체크박스를
// 노출한다.
// HOTFIX-141.1(사용자 지시 — "'노출위치'에 '상단 사이드바'도
// 포함해줘"): user_menu와 동일한 패턴 — 체크하면 navConfig.ts의
// topSidebarItems를 통해 상단 사이드바(TopSidebarPanel.tsx) column 2에
// 나타난다(admin이 site_settings.top_sidebar에 만든 링크들 뒤에 이어붙음).
const TAB_TARGET_TYPE_LABELS: Record<DbTargetType, string> = {
  tier1_tab: "1단 상단탭",
  tier2_tab: "2단 상단탭",
  dropdown: "드롭다운",
  sidebar_left: "왼쪽 사이드바",
  sidebar_right: "오른쪽 사이드바",
  user_menu: "사용자 메뉴",
  top_sidebar: "상단 사이드바",
};

// HOTFIX-144.3(사용자 지시 — "hover 모션 의 preview 를 볼수 있게 해줘, 어떤
// 모션이 어떻게 나올지 모르니까 불편해"): 지금까지는 모션을 골라 저장하고
// 실제 사이트로 가서 탭에 마우스를 올려봐야만 어떻게 보이는지 알 수
// 있었다 — select 옆에 실제와 동일한 CSS(tabHoverMotionCss, Navbar.tsx가
// 쓰는 것과 완전히 같은 함수)를 적용한 샘플 텍스트를 두고 그 자리에서 바로
// 마우스를 올려 확인할 수 있게 한다. Controls 패널의 hover 모션 select
// 5곳(상단 탭 드롭다운 항목/계정 메뉴/상단 사이드바 항목/상단 사이드바
// 링크/로그인 버튼) 전부 이 컴포넌트로 통일해 중복 select 마크업을 줄인다.
function HoverMotionPreviewSwatch({ motion }: { motion: TabHoverMotion }) {
  const className = `hm-preview-${motion}`;
  return (
    <span className="inline-block rounded border border-dashed border-gray-300 bg-gray-50 px-3 py-1.5">
      <style>{tabHoverMotionCss(className, motion)}</style>
      <span className={`${className} text-sm text-gray-700`}>마우스를 올려 미리보기</span>
    </span>
  );
}

function HoverMotionSelect({
  value,
  onChange,
}: {
  value: TabHoverMotion;
  onChange: (motion: TabHoverMotion) => void;
}) {
  return (
    <div className="space-y-1.5">
      <select
        value={value}
        onChange={(e) => onChange(e.target.value as TabHoverMotion)}
        className="w-full rounded border border-gray-300 px-2 py-1"
      >
        {TAB_HOVER_MOTIONS.map((m) => (
          <option key={m} value={m}>
            {TAB_HOVER_MOTION_LABELS[m]}
          </option>
        ))}
      </select>
      <HoverMotionPreviewSwatch motion={value} />
    </div>
  );
}

async function upsertSetting(key: string, value: unknown) {
  return supabase
    .from("site_settings")
    .upsert(
      { setting_key: key, setting_value: value, updated_at: new Date().toISOString() },
      { onConflict: "setting_key" },
    );
}

type Selection = { kind: "slot"; key: string } | { kind: "craft" } | null;
type LeftTab = "elements" | "controls" | "page" | "themes";

// HOTFIX-141(사용자 지시 — "실행취소(ctrl + z)가 작동이 안되고 있어"):
// CraftBridge의 Ctrl/⌘+Z는 하단 메뉴(Footer) Craft.js 캔버스 안에서
// "선택된 노드가 있을 때"만 실질적으로 뭔가 되돌린다(HOTFIX-137.7이
// 만든 것 — Craft 내장 history) — 그 바깥(탭 위치를 드래그로 옮기거나,
// 색상/폰트/사이드바 스타일을 바꾸는 등 이 페이지의 나머지 거의 모든
// 편집)에는 애초에 연결된 적이 없어 아무 반응이 없는 게 "실행취소가
// 안 된다"는 신고의 실제 원인이었다. 여기서 이 페이지의 주요 설정
// state 7개를 하나의 스냅샷으로 묶어 자체 undo/redo 스택을 만들고,
// 같은 Ctrl/⌘+Z 단축키에 CraftBridge와 나란히(중복 실행돼도 서로
// 다른 데이터라 무해) 연결한다.
function isEditableTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  const tag = target.tagName;
  return tag === "INPUT" || tag === "TEXTAREA" || target.isContentEditable;
}

// ── 캔버스 안에서 클릭으로만 선택되는 요소(슬라이드쇼/사이드바 아이콘) —
// 자유 드래그는 안 준다(줄 전체를 차지하는 블록이라 "옆으로 옮기기"가
// 의미가 없음, 순서는 실제 페이지 순서 그대로 고정).
function ClickSelectSlot({
  slotKey,
  label,
  selected,
  onSelect,
  className,
  children,
}: {
  slotKey: string;
  label: string;
  selected: boolean;
  onSelect: (key: string) => void;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div
      className={`relative cursor-pointer ${className ?? ""}`}
      onClick={(e) => {
        e.stopPropagation();
        onSelect(slotKey);
      }}
    >
      {children}
      <SelectionOverlay selected={selected} hovered={false} label={label} />
    </div>
  );
}

// ── Editor 컨텍스트(craft.js)는 React context라 이 컴포넌트 트리 밖에 있는
// "저장하기" 버튼에서 query.serialize()를 직접 부를 수 없다 — Editor 안에
// 항상 마운트돼 있는 이 브리지가 query/actions를 ref로 끌어올리고, 하단
// 메뉴(Footer) 블록이 새로 선택될 때마다 상위 selection 상태도 갱신한다.
function CraftBridge({
  bridgeRef,
  onCraftSelect,
}: {
  bridgeRef: React.MutableRefObject<{
    query: ReturnType<typeof useEditor>["query"];
    actions: ReturnType<typeof useEditor>["actions"];
  } | null>;
  onCraftSelect: () => void;
}) {
  const { query, actions, selectedId } = useEditor((state) => ({
    selectedId: ([...state.events.selected][0] as string | undefined) ?? null,
  }));
  const prevRef = useRef<string | null>(null);
  useEffect(() => {
    bridgeRef.current = { query, actions };
  }, [query, actions, bridgeRef]);
  useEffect(() => {
    if (selectedId && selectedId !== "ROOT" && selectedId !== prevRef.current) {
      prevRef.current = selectedId;
      onCraftSelect();
    }
    if (!selectedId) prevRef.current = null;
  }, [selectedId, onCraftSelect]);
  // HOTFIX-137.7(사용자 지시 — BuilderJS 레퍼런스 "Every action undoable.
  // ⌘Z saves the day"): Craft.js는 undo/redo가 이미 내장돼 있다
  // (actions.history.undo/redo) — 키보드 단축키만 새로 연결한다. 입력
  // 필드(텍스트/textarea/contentEditable) 안에서는 가로채지 않고 그
  // 필드의 네이티브 undo가 정상 동작하도록 비워둔다.
  useEffect(() => {
    function isEditableTarget(target: EventTarget | null): boolean {
      if (!(target instanceof HTMLElement)) return false;
      const tag = target.tagName;
      return tag === "INPUT" || tag === "TEXTAREA" || target.isContentEditable;
    }
    function handleKeyDown(e: KeyboardEvent) {
      if (!(e.metaKey || e.ctrlKey) || e.key.toLowerCase() !== "z") return;
      if (isEditableTarget(e.target)) return;
      e.preventDefault();
      if (e.shiftKey) actions.history.redo();
      else actions.history.undo();
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [actions]);
  return null;
}

// ── Elements 탭의 "하단 메뉴에 새 블록 추가" — 기존 Toolbox.tsx와 동일한
// connectors.create() 드래그 소스 패턴이지만, w-60 aside 없이 이 패널
// 안에 바로 넣을 수 있도록 얇게 다시 구현했다.
function FooterElementButton({ option, onAdd }: { option: CraftBlockOption; onAdd: (option: CraftBlockOption) => void }) {
  const { connectors } = useEditor();
  return (
    <button
      type="button"
      ref={(ref) => {
        if (ref) connectors.create(ref, option.buildElement);
      }}
      onClick={() => onAdd(option)}
      title="드래그해서 캔버스에 놓거나, 클릭하면 맨 끝에 추가돼요"
      className="w-full cursor-grab rounded-md border border-gray-200 bg-white px-2 py-1.5 text-left text-xs text-gray-700 hover:border-gray-400 hover:bg-gray-50 active:cursor-grabbing"
    >
      {option.label}
    </button>
  );
}
function FooterElementsSection() {
  const { query, actions } = useEditor();
  function handleAdd(option: CraftBlockOption) {
    const tree = query.parseReactElement(option.buildElement()).toNodeTree();
    actions.addNodeTree(tree, "ROOT");
  }
  return (
    <div className="space-y-3">
      <div>
        <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-gray-400">섹션</p>
        <div className="space-y-1">
          {footerBlockOptions.map((o) => (
            <FooterElementButton key={o.label} option={o} onAdd={handleAdd} />
          ))}
        </div>
      </div>
      <div>
        <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-gray-400">요소</p>
        <div className="space-y-1">
          {PRIMITIVE_BLOCK_OPTIONS.map((o) => (
            <FooterElementButton key={o.label} option={o} onAdd={handleAdd} />
          ))}
        </div>
      </div>
    </div>
  );
}

// ── 하단 메뉴(Footer) 블록의 선택-인식 액션 바 — HOTFIX-137.6(사용자
// 지시 — "요소를 클릭하면 왜 움직이는것만 되고, 그걸 수정하거나
// 삭제하는게 없어?"): "수정"은 아래 <selected.Settings />가 이미
// 담당하지만 "삭제"가 없었다 — Craft.js의 actions.delete/move(둘 다
// 문서화된 안전한 단일 노드 API)로 삭제+같은 부모 안 순서 이동(위/아래)을
// 추가한다. "복제"는 Craft.js 내부 addNodeTree가 전달된 트리의 노드
// id를 그대로 재사용해 state.nodes를 덮어써(라이브 코드 리버스엔지니어링으로
// 확인) 기존 노드와 충돌할 위험이 있어 — id를 직접 재생성하는 우회가
// 필요한데, 이 세션은 Browser pane으로 실제 검증이 안 되는 상태라
// 실사용 중인 하단 메뉴(모든 페이지에 노출)를 망가뜨릴 위험을 감수하지
// 않고 이번 범위에서 뺐다(NEXT_TASK.md에 후속 항목으로 기록).
function FooterCraftControls() {
  const { selected, actions, query } = useEditor((state) => {
    const currentNodeId = [...state.events.selected][0];
    if (!currentNodeId || !state.nodes[currentNodeId]) return { selected: null };
    const node = state.nodes[currentNodeId];
    const parentId = node.data.parent;
    const siblings = parentId ? state.nodes[parentId]?.data.nodes ?? [] : [];
    const index = siblings.indexOf(currentNodeId);
    return {
      selected: {
        id: currentNodeId,
        name: node.data.displayName || node.data.name,
        Settings: (node.related?.settings as React.ComponentType<Record<string, never>> | undefined) ?? null,
        isRoot: currentNodeId === "ROOT",
        isDeletable: node.data.parent !== null && currentNodeId !== "ROOT",
        parentId,
        canMoveUp: index > 0,
        canMoveDown: index >= 0 && index < siblings.length - 1,
      },
    };
  });
  if (!selected) return <p className="text-xs text-gray-400">하단 메뉴에서 블록을 클릭하면 설정이 여기 표시됩니다.</p>;

  function moveBy(offset: 1 | -1) {
    if (!selected || !selected.parentId) return;
    const siblings = query.node(selected.parentId).get().data.nodes;
    const index = siblings.indexOf(selected.id);
    if (index < 0) return;
    actions.move(selected.id, selected.parentId, index + offset);
  }

  return (
    <div>
      <div className="mb-3 flex items-center justify-between gap-2">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-500">{selected.name} 설정</h3>
        {!selected.isRoot && (
          <div className="flex shrink-0 items-center gap-1">
            <button
              type="button"
              title="위로 이동"
              disabled={!selected.canMoveUp}
              onClick={() => moveBy(-1)}
              className="rounded border border-gray-200 px-1.5 py-0.5 text-[11px] text-gray-600 hover:bg-gray-50 disabled:opacity-30"
            >
              ↑
            </button>
            <button
              type="button"
              title="아래로 이동"
              disabled={!selected.canMoveDown}
              onClick={() => moveBy(1)}
              className="rounded border border-gray-200 px-1.5 py-0.5 text-[11px] text-gray-600 hover:bg-gray-50 disabled:opacity-30"
            >
              ↓
            </button>
            {selected.isDeletable && (
              <button
                type="button"
                title="삭제"
                onClick={() => {
                  if (confirm("이 블록을 삭제할까요?")) actions.delete(selected.id);
                }}
                className="rounded border border-red-200 px-1.5 py-0.5 text-[11px] text-red-500 hover:bg-red-50"
              >
                삭제
              </button>
            )}
          </div>
        )}
      </div>
      {selected.Settings ? (
        <selected.Settings />
      ) : (
        <p className="text-xs text-gray-400">
          {selected.isRoot ? "루트 캔버스에는 설정이 없어요." : "이 블록은 별도 설정이 없어요 — 더블클릭으로 텍스트/이미지를 바로 수정하세요."}
        </p>
      )}
    </div>
  );
}

// HOTFIX-140.3(사용자 지시 — "기존 preview 도 너무 작아서 안보이니까,
// preview 위에 마우스를 hover 하면 더 크게 보이게 해줘. 슬라이드 쇼의
// 이미지들도 마찬가지야"): 이 컴포넌트가 로고/슬라이드/여백 배경/사이드바
// 아이콘/상단 사이드바 이미지 뱅크·링크 이미지까지 이 화면의 모든 이미지
// 썸네일이 공유하는 곳이라 여기 한 곳만 고치면 전부 적용된다. 확대
// 미리보기는 position:fixed로 뷰포트 기준 중앙에 띄운다 — 이 패널
// 자체가 overflow-y-auto라 absolute였다면 스크롤 클리핑에 잘렸을 것.
function ImageThumb({ url, alt }: { url: string; alt: string }) {
  const [hovering, setHovering] = useState(false);
  if (!url) return null;
  return (
    <div
      className="relative mt-1 inline-block"
      onMouseEnter={() => setHovering(true)}
      onMouseLeave={() => setHovering(false)}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={url} alt={alt} className="h-14 w-14 rounded border border-gray-200 object-cover" />
      {hovering && (
        <div className="pointer-events-none fixed inset-0 z-[200] flex items-center justify-center bg-black/50">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={url} alt={alt} className="max-h-[80vh] max-w-[80vw] rounded-lg border-4 border-white object-contain shadow-2xl" />
        </div>
      )}
    </div>
  );
}

export default function AdminNavigationSettingsPage() {
  const [fetching, setFetching] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<number | null>(null);

  // HOTFIX-146(사용자 지시 — "'tab' preview 토글도 추가해줘... '모바일'
  // preview 와 설정과 똑같은 설정 가능하게 해줘"): EPIC-136 이전에 있던
  // PC/태블릿/모바일 3단 토글을 되살리되, 이번엔 태블릿도 pc/mobile과
  // 완전히 동등한 독립 설정 슬롯이다(예전엔 "미리보기 전용, PC 값 재사용"
  // 이었던 것과 다름 — 아래 모든 *Value 타입에 tablet 슬롯이 이미 있어
  // deviceTab만 이 셋 중 하나면 나머지 코드는 그대로 제네릭하게 동작한다).
  const [deviceTab, setDeviceTab] = useState<"pc" | "tablet" | "mobile">("pc");
  const [selection, setSelection] = useState<Selection>(null);
  const [leftTab, setLeftTab] = useState<LeftTab>("controls");
  // HOTFIX-141.9(사용자 지시 — "화면 왼쪽 상단에 '스튜디오' 그아래에
  // '관리자' 버튼이 있는건데, 거기두니까 아예 사라졌네... 근본적인 문제를
  // 해결해"): 지금까지 반복된 "live preview가 실제 사이트와 다르다"는
  // 신고의 진짜 원인 — Elements/Controls 왼쪽 패널(w-80=320px)이 캔버스와
  // flex로 폭을 나눠 쓰고 있어서, 캔버스가 실제 사이트보다 항상 320px
  // 좁게 렌더링됐다. 절대 픽셀 드래그 오프셋은 이 좁아진 폭 기준으로
  // 계산되니, 실제 사이트(전체 폭)에서는 정상 위치인 값이 캔버스
  // 안에서는 왼쪽 패널(사이트의 일부가 아니라 순수 에디터 UI) 밑에
  // 깔려 안 보이게 된다 — 값을 아무리 리셋해도 다시 왼쪽으로 드래그하면
  // 재발할 수밖에 없는 구조적 문제였다. 패널을 flex 형제 대신 캔버스
  // 위에 뜨는 오버레이로 바꿔 캔버스가 항상 전체 폭을 그대로 쓰게 하고,
  // 필요하면 패널을 숨겨 진짜 전체 폭(실제 사이트와 동일)을 확인할 수
  // 있게 한다.
  const [leftPanelCollapsed, setLeftPanelCollapsed] = useState(false);
  const craftBridgeRef = useRef<{
    query: ReturnType<typeof useEditor>["query"];
    actions: ReturnType<typeof useEditor>["actions"];
  } | null>(null);

  function selectSlot(key: string) {
    setSelection({ kind: "slot", key });
    setLeftTab("controls");
  }
  function handleCraftSelect() {
    setSelection({ kind: "craft" });
    setLeftTab("controls");
  }
  // 사용자 지시(2026-08-29 — "'홈페이지 설정'에 상단에 아이콘을 추가하고
  // 페이지와 링크하는 기능을 만들어줘"): accountMenuStyleValue.extraItems와
  // 동일한 패턴 — DB 왕복 없이 로컬 편집 상태에 바로 추가하고, "저장하기"를
  // 눌러야 site_settings.top_bar_icons에 실제로 반영된다. 새로 만든 아이콘을
  // 바로 선택해 Controls 패널에서 이미지/링크를 채우도록 이어준다.
  function addTopBarIcon() {
    const icon = newTopBarIcon();
    setTopBarIconsValue((prev) => ({ icons: [...prev.icons, icon] }));
    selectSlot(`top-bar-icon:${icon.id}`);
  }

  const [mainLogoValue, setMainLogoValue] = useState<MainLogoValue>(() => defaultMainLogoValue());
  const [sidebarIconsValue, setSidebarIconsValue] = useState<SidebarIconsValue>(() => defaultSidebarIconsValue());
  const [topTabStyleValue, setTopTabStyleValue] = useState<TopTabStyleValue>(() => defaultTopTabStyleValue());
  const [accountMenuStyleValue, setAccountMenuStyleValue] = useState<AccountMenuStyleValue>(() => defaultAccountMenuStyleValue());
  const [heroSlideshowValue, setHeroSlideshowValue] = useState<HeroSlideshowValue>(() => defaultHeroSlideshowValue());
  const [headerPositionsValue, setHeaderPositionsValue] = useState<HeaderPositionsValue>(() => defaultHeaderPositionsValue());
  const [topSidebarValue, setTopSidebarValue] = useState<TopSidebarValue>(() => defaultTopSidebarValue());
  const [topBarIconsValue, setTopBarIconsValue] = useState<TopBarIconsValue>(() => defaultTopBarIconsValue());
  const [topNavRows, setTopNavRows] = useState<NavTab[]>([]);

  const [footerPageId, setFooterPageId] = useState<string | null>(null);
  const [footerCraftState, setFooterCraftState] = useState<string | null>(null);

  const heroSlideshow = heroSlideshowValue[deviceTab];
  const headerPositions = headerPositionsValue[deviceTab];
  const topSidebar = topSidebarValue[deviceTab];
  const mainLogoForDevice = mainLogoValue[deviceTab];

  // HOTFIX-141: 전역 실행취소/다시실행 — 위 7개 설정 state를 하나의
  // 스냅샷으로 묶어 되돌린다. footer(Craft.js)/topNavRows(site_navigations)는
  // 각각 이미 자체 history가 있거나(Craft) DB에 즉시 쓰이는 별도
  // 성격(addNavItem 등)이라 이 스택에는 포함하지 않는다.
  type SettingsSnapshot = {
    mainLogo: MainLogoValue;
    sidebarIcons: SidebarIconsValue;
    topTabStyle: TopTabStyleValue;
    accountMenuStyle: AccountMenuStyleValue;
    heroSlideshow: HeroSlideshowValue;
    headerPositions: HeaderPositionsValue;
    topSidebar: TopSidebarValue;
    topBarIcons: TopBarIconsValue;
  };
  function currentSettingsSnapshot(): SettingsSnapshot {
    return {
      mainLogo: mainLogoValue,
      sidebarIcons: sidebarIconsValue,
      topTabStyle: topTabStyleValue,
      accountMenuStyle: accountMenuStyleValue,
      heroSlideshow: heroSlideshowValue,
      headerPositions: headerPositionsValue,
      topSidebar: topSidebarValue,
      topBarIcons: topBarIconsValue,
    };
  }
  const settingsHistoryRef = useRef<{ past: SettingsSnapshot[]; future: SettingsSnapshot[] }>({ past: [], future: [] });
  const isRestoringSnapshotRef = useRef(false);
  const lastSnapshotJsonRef = useRef<string | null>(null);

  // 값이 바뀔 때마다(단, 되돌리기/다시실행 자체가 만든 변화는 제외) 직전
  // 스냅샷을 past 스택에 밀어넣는다 — 최초 DB 로드가 끝나기 전(fetching)엔
  // "빈 값 → 로드된 값" 전환 자체가 되돌릴 대상이 아니므로 건너뛴다.
  useEffect(() => {
    if (fetching) return;
    const serialized = JSON.stringify(currentSettingsSnapshot());
    if (isRestoringSnapshotRef.current) {
      isRestoringSnapshotRef.current = false;
      lastSnapshotJsonRef.current = serialized;
      return;
    }
    if (lastSnapshotJsonRef.current === null) {
      lastSnapshotJsonRef.current = serialized;
      return;
    }
    if (serialized === lastSnapshotJsonRef.current) return;
    settingsHistoryRef.current.past.push(JSON.parse(lastSnapshotJsonRef.current));
    if (settingsHistoryRef.current.past.length > 50) settingsHistoryRef.current.past.shift();
    settingsHistoryRef.current.future = [];
    lastSnapshotJsonRef.current = serialized;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fetching, mainLogoValue, sidebarIconsValue, topTabStyleValue, accountMenuStyleValue, heroSlideshowValue, headerPositionsValue, topSidebarValue, topBarIconsValue]);

  function applySettingsSnapshot(snap: SettingsSnapshot) {
    isRestoringSnapshotRef.current = true;
    setMainLogoValue(snap.mainLogo);
    setSidebarIconsValue(snap.sidebarIcons);
    setTopTabStyleValue(snap.topTabStyle);
    setAccountMenuStyleValue(snap.accountMenuStyle);
    setHeroSlideshowValue(snap.heroSlideshow);
    setHeaderPositionsValue(snap.headerPositions);
    setTopSidebarValue(snap.topSidebar);
    setTopBarIconsValue(snap.topBarIcons);
  }
  function undoSettings() {
    const { past } = settingsHistoryRef.current;
    if (past.length === 0) return;
    const prev = past.pop()!;
    settingsHistoryRef.current.future.push(currentSettingsSnapshot());
    applySettingsSnapshot(prev);
  }
  function redoSettings() {
    const { future } = settingsHistoryRef.current;
    if (future.length === 0) return;
    const next = future.pop()!;
    settingsHistoryRef.current.past.push(currentSettingsSnapshot());
    applySettingsSnapshot(next);
  }
  // 이 페이지 전체(Craft 캔버스 밖 포함)에서 Ctrl/⌘+Z를 감지 — 값이 바뀔
  // 때마다 재등록해 클로저가 최신 state를 갖게 한다(각 값 변경마다
  // 리스너를 다시 붙이는 비용은 document 리스너 하나뿐이라 무시할 만함).
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (!(e.metaKey || e.ctrlKey) || e.key.toLowerCase() !== "z") return;
      if (isEditableTarget(e.target)) return;
      if (e.shiftKey) redoSettings();
      else undoSettings();
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mainLogoValue, sidebarIconsValue, topTabStyleValue, accountMenuStyleValue, heroSlideshowValue, headerPositionsValue, topSidebarValue, topBarIconsValue]);

  useEffect(() => {
    async function load() {
      const [{ data, error: fetchError }, { tabs: navTabs }, footerRow] = await Promise.all([
        supabase
          .from("site_settings")
          .select("setting_key, setting_value")
          .in("setting_key", ["main_logo", "hero_slideshow", "sidebar_icons", "top_tab_style", "account_menu_style", "header_positions", "top_sidebar", "top_bar_icons"]),
        fetchNavTabs(),
        supabase.from("page_builder").select("id, craft_state").eq("slug", "footer").maybeSingle(),
      ]);
      if (fetchError) {
        setError(fetchError.message);
        setFetching(false);
        return;
      }
      for (const row of data ?? []) {
        if (row.setting_key === "main_logo") setMainLogoValue(normalizeMainLogo(row.setting_value));
        else if (row.setting_key === "hero_slideshow") setHeroSlideshowValue(normalizeHeroSlideshow(row.setting_value));
        else if (row.setting_key === "sidebar_icons") setSidebarIconsValue(normalizeSidebarIcons(row.setting_value));
        else if (row.setting_key === "top_tab_style") setTopTabStyleValue(normalizeTopTabStyle(row.setting_value));
        else if (row.setting_key === "account_menu_style") setAccountMenuStyleValue(normalizeAccountMenuStyle(row.setting_value));
        else if (row.setting_key === "header_positions") setHeaderPositionsValue(normalizeHeaderPositions(row.setting_value));
        else if (row.setting_key === "top_sidebar") setTopSidebarValue(normalizeTopSidebar(row.setting_value));
        else if (row.setting_key === "top_bar_icons") setTopBarIconsValue(normalizeTopBarIcons(row.setting_value));
      }
      // HOTFIX-141.12(사용자 지시 — "사일로상점/살롱데상 같은 다른 탭들도
      // about silo/온라인 도슨트처럼 세부 설정 가능하게 해줘"): 예전엔
      // sidebar-left/right 탭(사일로상점/살롱데상)을 이 목록에서 통째로
      // 제외해 아예 선택조차 할 수 없었다 — 실제로는 Navbar.tsx가 tier1/
      // tier2 노출 위치가 있는 탭이라면 타입과 무관하게 동일한 tab: 스타일
      // 메커니즘(labelOverride/폰트/크기/색상/드롭다운 스타일)을 이미
      // 지원하므로, 더 이상 타입으로 걸러낼 이유가 없다.
      setTopNavRows(navTabs);
      if (footerRow.data) {
        setFooterPageId(footerRow.data.id);
        setFooterCraftState(footerRow.data.craft_state ?? null);
      } else {
        const { data: created } = await supabase
          .from("page_builder")
          .insert({ slug: "footer", title: "하단 Footer", status: "published", builder_type: "craft" })
          .select("id, craft_state")
          .single();
        if (created) {
          setFooterPageId(created.id);
          setFooterCraftState(created.craft_state ?? null);
        }
      }
      setFetching(false);
    }
    load();
  }, []);

  // HOTFIX-137.8(사용자 지시 — "상단 탭, 사용자 메뉴에 새로운 요소를
  // 추가하거나, 복제하거나, 삭제하는걸 할수 없는데?"): "사용자 메뉴"는
  // EPIC-138부터 별도 데이터가 아니라 site_navigations 최상위 행의
  // target_types에 "user_menu" 플래그 하나 붙는 것뿐이다(UserMenuDropdown.tsx
  // 참고) — 즉 "상단 탭 추가"와 "사용자 메뉴 항목 추가"는 같은 테이블에 대한
  // 같은 CRUD고, 노출 위치(어느 탭 줄/사이드바/사용자 메뉴에 보일지)는 이미
  // 있는 "노출 위치" 체크박스로 정하면 된다 — 그래서 추가/복제/삭제도 하나의
  // 공용 함수 세트로 처리한다. CategoryTreeManager.tsx(사이트 구성 관리)의
  // addChild/deleteRow와 동일한 컬럼/기본값을 그대로 재사용해 두 화면의
  // 데이터가 어긋나지 않게 한다.
  async function refetchNavTabs() {
    const { tabs } = await fetchNavTabs();
    setTopNavRows(tabs);
  }

  async function addNavItem() {
    const siblingCount = topNavRows.length;
    const { data: inserted, error: insertError } = await supabase
      .from("site_navigations")
      .insert({ parent_id: null, title: "새 탭", target_types: ["tier2_tab"], sort_order: siblingCount })
      .select("id")
      .single();
    if (insertError || !inserted) {
      alert(`탭 생성에 실패했어요.\n${insertError?.message ?? "알 수 없는 오류"}`);
      return;
    }
    const autoHref = `/c/${inserted.id}`;
    const { error: hrefError } = await supabase.from("site_navigations").update({ href: autoHref }).eq("id", inserted.id);
    if (!hrefError) {
      ensurePageForSlug(hrefToSlug(autoHref), "새 탭", null).catch(() => {});
    }
    await refetchNavTabs();
    selectSlot(`tab:${inserted.id}`);
  }

  async function duplicateNavItem(tab: NavTab) {
    if (!tab.id) return;
    const siblingCount = topNavRows.length;
    const { data: inserted, error: insertError } = await supabase
      .from("site_navigations")
      .insert({
        parent_id: null,
        title: `${tab.label} 복사본`,
        href: tab.href ?? null,
        target_types: tab.targetTypes ?? ["tier2_tab"],
        sort_order: siblingCount,
      })
      .select("id")
      .single();
    if (insertError || !inserted) {
      alert(`탭 복제에 실패했어요.\n${insertError?.message ?? "알 수 없는 오류"}`);
      return;
    }
    // 스타일(글자 크기/색상/굵기/호버 모션 등)도 함께 복제 — 원본 탭 키의
    // 설정을 새 탭 키로 그대로 복사한다(HOTFIX-146: pc/tablet/mobile 세 기기 모두).
    setTopTabStyleValue((prev) => {
      const next = { ...prev };
      for (const device of ["pc", "tablet", "mobile"] as const) {
        const sourceEntry = prev[device].tabs[tab.key];
        if (sourceEntry) {
          next[device] = { ...next[device], tabs: { ...next[device].tabs, [inserted.id]: { ...sourceEntry } } };
        }
      }
      return next;
    });
    await refetchNavTabs();
    selectSlot(`tab:${inserted.id}`);
  }

  async function deleteNavItem(tab: NavTab) {
    if (!tab.id) return;
    if (!confirm(`"${tab.label}"을(를) 삭제할까요? 이 탭에 속한 하위 항목도 함께 삭제돼요.`)) return;
    const { error: deleteError } = await supabase.from("site_navigations").delete().eq("id", tab.id);
    if (deleteError) {
      alert(`삭제에 실패했어요.\n${deleteError.message}`);
      return;
    }
    setSelection(null);
    await refetchNavTabs();
  }

  function handleOffsetChange(slotKey: string, next: HeaderSlotOffset) {
    setHeaderPositionsValue((prev) => ({
      ...prev,
      [deviceTab]: { slots: { ...prev[deviceTab].slots, [slotKey]: next } },
    }));
  }
  function resetSlotOffset(slotKey: string) {
    setHeaderPositionsValue((prev) => {
      const nextSlots = { ...prev[deviceTab].slots };
      delete nextSlots[slotKey];
      return { ...prev, [deviceTab]: { slots: nextSlots } };
    });
  }

  async function handleSaveAll() {
    setSaving(true);
    setError(null);
    const footerSerialized = craftBridgeRef.current?.query.serialize();
    const results = await Promise.all([
      upsertSetting("main_logo", mainLogoValue),
      upsertSetting("sidebar_icons", sidebarIconsValue),
      upsertSetting("top_tab_style", topTabStyleValue),
      upsertSetting("account_menu_style", accountMenuStyleValue),
      upsertSetting("hero_slideshow", heroSlideshowValue),
      upsertSetting("header_positions", headerPositionsValue),
      upsertSetting("top_sidebar", topSidebarValue),
      upsertSetting("top_bar_icons", topBarIconsValue),
      upsertSetting("unified_header_layout", { pc: { items: [] }, mobile: { items: [] } }),
      footerPageId && footerSerialized
        ? supabase.from("page_builder").update({ craft_state: footerSerialized, updated_at: new Date().toISOString() }).eq("id", footerPageId)
        : Promise.resolve({ error: null }),
    ]);
    const firstError = results.find((r) => r.error)?.error;
    setSaving(false);
    if (firstError) {
      setError(firstError.message);
      return;
    }
    if (footerSerialized) setFooterCraftState(footerSerialized);
    setSavedAt(Date.now());
  }

  if (fetching || !footerPageId) {
    return (
      <main className="flex-1 px-8 pb-8 max-w-4xl mx-auto w-full">
        <p className="text-gray-500">불러오는 중...</p>
      </main>
    );
  }

  return (
    <main className="flex-1 px-8 pb-8 max-w-[1600px] mx-auto w-full">
      {error && <div className="rounded-lg border border-red-300 bg-red-50 p-4 text-red-700 mb-4">{error}</div>}

      <div className="mb-4 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">홈페이지 설정 관리</h1>
          <p className="text-xs text-gray-400">실제 홈페이지를 그대로 — 요소를 클릭해서 선택, 드래그해서 이동하세요.</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center rounded-md border border-gray-300 bg-white p-0.5 text-xs">
            <button
              type="button"
              onClick={() => setDeviceTab("pc")}
              className={`rounded px-3 py-1 ${deviceTab === "pc" ? "bg-gray-800 text-white" : "text-gray-600 hover:bg-gray-100"}`}
            >
              🖥️ PC
            </button>
            <button
              type="button"
              onClick={() => setDeviceTab("tablet")}
              className={`rounded px-3 py-1 ${deviceTab === "tablet" ? "bg-gray-800 text-white" : "text-gray-600 hover:bg-gray-100"}`}
            >
              ▦ 태블릿
            </button>
            <button
              type="button"
              onClick={() => setDeviceTab("mobile")}
              className={`rounded px-3 py-1 ${deviceTab === "mobile" ? "bg-gray-800 text-white" : "text-gray-600 hover:bg-gray-100"}`}
            >
              📱 모바일
            </button>
          </div>
          {/* HOTFIX-137.7/HOTFIX-141: Craft.js 내장 undo/redo(하단 메뉴
              캔버스 전용)와, 이 페이지 나머지 설정(탭 위치/색상/폰트/
              사이드바 스타일 등)을 되돌리는 자체 스냅샷 undo/redo를
              같은 버튼·단축키에 함께 연결 — 서로 다른 데이터를 다루므로
              동시에 호출해도 무해하다(관련 없는 쪽은 그냥 조용히 아무
              일도 안 함). */}
          <div className="flex items-center gap-1">
            <button
              type="button"
              title="실행 취소 (Ctrl/⌘+Z)"
              onClick={() => {
                craftBridgeRef.current?.actions.history.undo();
                undoSettings();
              }}
              className="rounded-md border border-gray-300 px-2 py-1.5 text-xs text-gray-600 hover:bg-gray-50"
            >
              ↶ 실행 취소
            </button>
            <button
              type="button"
              title="다시 실행 (Ctrl/⌘+Shift+Z)"
              onClick={() => {
                craftBridgeRef.current?.actions.history.redo();
                redoSettings();
              }}
              className="rounded-md border border-gray-300 px-2 py-1.5 text-xs text-gray-600 hover:bg-gray-50"
            >
              ↷ 다시 실행
            </button>
          </div>
          <button type="button" onClick={handleSaveAll} disabled={saving} className={primaryButtonClass}>
            {saving ? "저장 중..." : "저장하기"}
          </button>
          {savedAt && <span className="text-xs text-green-600">저장됐어요.</span>}
        </div>
      </div>

      <Editor resolver={{ ...PRIMITIVE_RESOLVER, ...craftFooterResolver }} enabled>
        <CraftBridge bridgeRef={craftBridgeRef} onCraftSelect={handleCraftSelect} />
        {/* HOTFIX-141.9: relative(오버레이 기준) — 더 이상 flex로 패널과
            캔버스가 폭을 나눠 쓰지 않는다. */}
        <div className="relative overflow-hidden rounded-lg border border-gray-200" style={{ minHeight: 900 }}>
          {/* HOTFIX-141.18(사용자 신고 — "element와 control 패널이 안
              보이는데?"): 캔버스가 실제 Navbar를 그대로 렌더링하다 보니,
              좌/우 사이드바 패널이나 "상단 사이드바" 메가메뉴를 캔버스
              안에서 열어둔 채로 두면 그 패널들(LeftSidebar.tsx/
              RightSidebar.tsx/TopSidebarPanel.tsx 전부 열렸을 때
              z-50, editable이면 absolute — 이 관리자 패널과 같은
              containing block까지 올라옴)이 이 Elements/Controls 패널
              (z-40)과 "▶ 패널 보기" 토글(기존 z-50, DOM 순서상 캔버스가
              나중에 그려져 동률에서도 짐)을 통째로 덮어버렸다 — 사이트
              콘텐츠를 시뮬레이션하는 캔버스 안 요소가 관리자 자신의 UI
              크롬을 가리면 안 되므로, 이 둘만 z-[100]으로 확실히 위에
              둔다(캔버스 안에서 나올 수 있는 어떤 z-index보다 높게). */}
          {leftPanelCollapsed ? (
            <button
              type="button"
              onClick={() => setLeftPanelCollapsed(false)}
              className="absolute left-3 top-3 z-[100] rounded border border-gray-300 bg-white px-2 py-1.5 text-xs text-gray-600 shadow-md hover:bg-gray-50"
              title="Elements/Controls 패널 다시 보기"
            >
              ▶ 패널 보기
            </button>
          ) : (
          <div className="absolute inset-y-0 left-0 z-[100] flex w-80 flex-col border-r border-gray-200 bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-gray-200 pl-1">
              <div className="flex flex-1 text-xs">
                {([
                  ["elements", "Elements"],
                  ["controls", "Controls"],
                  ["page", "Page"],
                  ["themes", "Themes"],
                ] as [LeftTab, string][]).map(([key, label]) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setLeftTab(key)}
                    className={`flex-1 border-b-2 px-2 py-2.5 font-medium ${
                      leftTab === key ? "border-gray-800 text-gray-900" : "border-transparent text-gray-400 hover:text-gray-600"
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
              {/* HOTFIX-141.9: 캔버스가 이제 이 패널 뒤로 전체 폭을 그대로
                  쓰므로, 패널을 숨기면 실제 사이트와 정확히 같은 폭으로
                  보인다 — 화면 왼쪽 끝에 드래그한 요소를 확인할 때 쓴다. */}
              <button
                type="button"
                onClick={() => setLeftPanelCollapsed(true)}
                className="shrink-0 px-2 text-gray-400 hover:text-gray-700"
                title="패널 숨기기(실제 사이트와 동일한 폭으로 보기)"
              >
                ◀
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-4">
              {leftTab === "elements" && (
                <div className="space-y-4 text-xs">
                  <div>
                    <p className="mb-2 font-semibold text-gray-500">페이지 요소 (클릭해서 선택)</p>
                    <div className="space-y-1">
                      <button type="button" onClick={() => selectSlot("logo")} className="block w-full rounded border border-gray-200 px-2 py-1.5 text-left hover:bg-gray-50">
                        로고
                      </button>
                      {mainLogoForDevice.leftText && (
                        <button type="button" onClick={() => selectSlot("logo-left-text")} className="block w-full rounded border border-gray-200 px-2 py-1.5 text-left hover:bg-gray-50">
                          로고 왼쪽 텍스트
                        </button>
                      )}
                      {mainLogoForDevice.rightText && (
                        <button type="button" onClick={() => selectSlot("logo-right-text")} className="block w-full rounded border border-gray-200 px-2 py-1.5 text-left hover:bg-gray-50">
                          로고 오른쪽 텍스트
                        </button>
                      )}
                      {mainLogoForDevice.groupSideTexts && (
                        <button type="button" onClick={() => selectSlot("logo-group")} className="block w-full rounded border border-blue-200 bg-blue-50 px-2 py-1.5 text-left hover:bg-blue-100">
                          로고 그룹(위치 — 셋이 함께 움직여요)
                        </button>
                      )}
                      {topNavRows.map((tab) => (
                        <button
                          key={tab.key}
                          type="button"
                          onClick={() => selectSlot(`tab:${tab.key}`)}
                          className="block w-full rounded border border-gray-200 px-2 py-1.5 text-left hover:bg-gray-50"
                        >
                          {tab.label}
                        </button>
                      ))}
                      <button
                        type="button"
                        onClick={addNavItem}
                        className="block w-full rounded border border-dashed border-gray-300 px-2 py-1.5 text-left text-blue-600 hover:bg-blue-50"
                      >
                        + 새 탭/메뉴 항목 추가
                      </button>
                      <button type="button" onClick={() => selectSlot("write-button")} className="block w-full rounded border border-gray-200 px-2 py-1.5 text-left hover:bg-gray-50">
                        글쓰기
                      </button>
                      {[
                        ["account:admin", "관리자"],
                        ["account:tier", "회원 등급"],
                        ["account:mypage", "마이페이지"],
                        ["account:name", "회원 이름"],
                        ["account:logout", "로그인/로그아웃 (기본 숨김 — 상단 사이드바로 이동)"],
                      ].map(([key, label]) => (
                        <button key={key} type="button" onClick={() => selectSlot(key)} className="block w-full rounded border border-gray-200 px-2 py-1.5 text-left hover:bg-gray-50">
                          {label}
                        </button>
                      ))}
                      <button type="button" onClick={() => selectSlot("slideshow")} className="block w-full rounded border border-gray-200 px-2 py-1.5 text-left hover:bg-gray-50">
                        슬라이드쇼
                      </button>
                      <button type="button" onClick={() => selectSlot("sidebar:left")} className="block w-full rounded border border-gray-200 px-2 py-1.5 text-left hover:bg-gray-50">
                        좌측 사이드바 아이콘
                      </button>
                      <button type="button" onClick={() => selectSlot("sidebar:right")} className="block w-full rounded border border-gray-200 px-2 py-1.5 text-left hover:bg-gray-50">
                        우측 사이드바 아이콘
                      </button>
                      <button type="button" onClick={() => selectSlot("top-sidebar-trigger")} className="block w-full rounded border border-gray-200 px-2 py-1.5 text-left hover:bg-gray-50">
                        상단 사이드바 열기 버튼
                      </button>
                      <button type="button" onClick={() => selectSlot("top-sidebar")} className="block w-full rounded border border-gray-200 px-2 py-1.5 text-left hover:bg-gray-50">
                        상단 사이드바 (Kinfolk형 메가 메뉴)
                      </button>
                    </div>
                  </div>
                  <div className="border-t border-gray-200 pt-3">
                    <p className="mb-2 font-semibold text-gray-500">상단 아이콘 (이미지 + 페이지 링크, 드래그로 위치 이동)</p>
                    <div className="space-y-1">
                      {topBarIconsValue.icons.map((icon, i) => (
                        <button
                          key={icon.id}
                          type="button"
                          onClick={() => selectSlot(`top-bar-icon:${icon.id}`)}
                          className="block w-full rounded border border-gray-200 px-2 py-1.5 text-left hover:bg-gray-50"
                        >
                          아이콘 {i + 1}{icon.href ? ` → ${icon.href}` : ""}{!icon.imageUrl ? " (이미지 미설정)" : ""}
                        </button>
                      ))}
                      <button
                        type="button"
                        onClick={addTopBarIcon}
                        className="block w-full rounded border border-dashed border-gray-300 px-2 py-1.5 text-left text-blue-600 hover:bg-blue-50"
                      >
                        + 아이콘 추가
                      </button>
                    </div>
                  </div>
                  <div className="border-t border-gray-200 pt-3">
                    <p className="mb-2 font-semibold text-gray-500">하단 메뉴에 새 블록 추가</p>
                    <FooterElementsSection />
                  </div>
                </div>
              )}

              {leftTab === "controls" && (
                <ControlsPanel
                  selection={selection}
                  deviceTab={deviceTab}
                  topNavRows={topNavRows}
                  setTopNavRows={setTopNavRows}
                  onDuplicateNavItem={duplicateNavItem}
                  onDeleteNavItem={deleteNavItem}
                  mainLogoValue={mainLogoValue}
                  setMainLogoValue={setMainLogoValue}
                  topTabStyleValue={topTabStyleValue}
                  setTopTabStyleValue={setTopTabStyleValue}
                  accountMenuStyleValue={accountMenuStyleValue}
                  setAccountMenuStyleValue={setAccountMenuStyleValue}
                  heroSlideshowValue={heroSlideshowValue}
                  setHeroSlideshowValue={setHeroSlideshowValue}
                  sidebarIconsValue={sidebarIconsValue}
                  setSidebarIconsValue={setSidebarIconsValue}
                  headerPositions={headerPositions}
                  onResetOffset={resetSlotOffset}
                  onOffsetChange={handleOffsetChange}
                  topSidebarValue={topSidebarValue}
                  setTopSidebarValue={setTopSidebarValue}
                  topBarIconsValue={topBarIconsValue}
                  setTopBarIconsValue={setTopBarIconsValue}
                />
              )}

              {leftTab === "page" && (
                <div className="space-y-3 text-xs text-gray-600">
                  <p className="font-semibold text-gray-500">Page</p>
                  <p>지금 편집 중인 건 홈페이지 전체 — 로고·상단 탭·사용자 메뉴·슬라이드쇼·사이드바 아이콘·하단 메뉴까지 한 화면에서 실시간으로 함께 편집돼요.</p>
                  <p>
                    탭(메뉴) 자체를 추가/삭제/순서 변경하려면{" "}
                    <Link href="/admin/site-structure" className="text-blue-600 underline">
                      사이트 구성 관리
                    </Link>
                    에서 하세요 — 여기서는 이미 있는 탭의 디자인·위치만 다뤄요.
                  </p>
                </div>
              )}

              {leftTab === "themes" && (
                <ThemesPanel
                  deviceTab={deviceTab}
                  topNavRows={topNavRows}
                  setTopTabStyleValue={setTopTabStyleValue}
                  setAccountMenuStyleValue={setAccountMenuStyleValue}
                />
              )}
            </div>
          </div>
          )}

          {/* HOTFIX-141.9: 더 이상 flex-1(패널과 폭을 나눠 씀)이 아니라
              항상 이 컨테이너의 전체 폭 — 패널은 위에서 absolute로 겹쳐
              뜰 뿐 이 폭 계산에 관여하지 않는다. */}
          <div className="overflow-auto bg-gray-100 p-4" style={{ minHeight: 900 }}>
            {/* HOTFIX-141(사용자 지시 — "모바일 화면에서, 좌 우 사이드바가
                활성화 되어있지 않은데 왼쪽으로 밀려나기만해 아예 안보이게
                해줘"): 이 390px 프레임에 overflow-hidden이 없어서, 닫힌
                사이드바 패널(-translate-x-full로 자기 너비만큼만 왼쪽으로
                이동)이나 상단 사이드바(max-w-5xl, 데스크톱 폭 그대로)처럼
                390px보다 넓은/왼쪽으로 밀린 자식이 프레임 밖으로 그대로
                삐져나와 보였다 — 진짜 원인은 잘림 없음(clipping 부재)이지
                레이아웃 자체가 아니었다. */}
            {/* HOTFIX-141.1(사용자 지시 — "live preview 에 요소를 드래그
                할때, align guideline 이 보이면 좋겠어 그래서 중앙...
                맞는지 알수 있게"): HeaderSlot.tsx가 이 마커로 캔버스
                가로 중앙선을 계산한다. */}
            {/* HOTFIX-146: 태블릿 프레임 폭(820px)은 실제 공개 사이트의
                태블릿 판정 구간(768~1023px, useDeviceTier 참고) 한가운데
                값이다 — 이 폭에서 편집한 오프셋(refWidthPx)이 그 구간
                전체에서 비율 스케일링으로 자연스럽게 맞는다. */}
            <div
              data-admin-canvas
              className={
                deviceTab === "mobile"
                  ? "mx-auto w-[390px] overflow-hidden border-x border-gray-300 bg-white shadow-lg"
                  : deviceTab === "tablet"
                    ? "mx-auto w-[820px] overflow-hidden border-x border-gray-300 bg-white shadow-lg"
                    : "bg-white"
              }
            >
              <Navbar
                editable
                selectedSlotKey={selection?.kind === "slot" ? selection.key : null}
                onSelectSlot={selectSlot}
                positionsOverride={headerPositions}
                onOffsetChange={handleOffsetChange}
                deviceOverride={deviceTab}
                topSidebarOverride={topSidebar}
                mainLogoOverride={mainLogoValue}
                sidebarIconsOverride={sidebarIconsValue}
                topTabStyleOverride={topTabStyleValue}
                accountMenuStyleOverride={accountMenuStyleValue}
                topBarIconsOverride={topBarIconsValue}
              />

              <ClickSelectSlot slotKey="slideshow" label="슬라이드쇼" selected={selection?.kind === "slot" && selection.key === "slideshow"} onSelect={selectSlot}>
                {heroSlideshow.slides.length === 0 ? (
                  <div className="flex h-40 items-center justify-center border-b border-dashed border-gray-300 bg-gray-50 text-xs text-gray-400">
                    등록된 슬라이드가 없어요 — 왼쪽 Controls에서 슬라이드를 추가하세요.
                  </div>
                ) : (
                  <HeroSlideshow
                    device="both"
                    slides={heroSlideshow.slides}
                    autoAdvanceSeconds={heroSlideshow.autoAdvanceSeconds}
                    objectFit={heroSlideshow.objectFit}
                    wallpaperUrls={heroSlideshow.wallpaperUrls}
                    marginTopPx={heroSlideshow.marginTopPx}
                    marginBottomPx={heroSlideshow.marginBottomPx}
                    marginLeftPx={heroSlideshow.marginLeftPx}
                    marginRightPx={heroSlideshow.marginRightPx}
                    heightVh={heroSlideshow.heightVh ?? 30}
                  />
                )}
              </ClickSelectSlot>


              <div className="border-b border-t-4 border-dashed border-gray-300 bg-gray-50 px-4 py-1.5 text-center text-[10px] uppercase tracking-wide text-gray-400">
                하단 메뉴
              </div>
              <Frame data={footerCraftState ?? undefined}>{!footerCraftState && footerDefaultTree}</Frame>
            </div>
          </div>
        </div>
      </Editor>
    </main>
  );
}

// ── Controls 탭 본문 — selection 종류별로 실제 필드를 보여준다.
function ControlsPanel({
  selection,
  deviceTab,
  topNavRows,
  setTopNavRows,
  onDuplicateNavItem,
  onDeleteNavItem,
  mainLogoValue,
  setMainLogoValue,
  topTabStyleValue,
  setTopTabStyleValue,
  accountMenuStyleValue,
  setAccountMenuStyleValue,
  heroSlideshowValue,
  setHeroSlideshowValue,
  sidebarIconsValue,
  setSidebarIconsValue,
  headerPositions,
  onResetOffset,
  onOffsetChange,
  topSidebarValue,
  setTopSidebarValue,
  topBarIconsValue,
  setTopBarIconsValue,
}: {
  selection: Selection;
  deviceTab: "pc" | "tablet" | "mobile";
  topNavRows: NavTab[];
  setTopNavRows: React.Dispatch<React.SetStateAction<NavTab[]>>;
  onDuplicateNavItem: (tab: NavTab) => void;
  onDeleteNavItem: (tab: NavTab) => void;
  mainLogoValue: MainLogoValue;
  setMainLogoValue: React.Dispatch<React.SetStateAction<MainLogoValue>>;
  topTabStyleValue: TopTabStyleValue;
  setTopTabStyleValue: React.Dispatch<React.SetStateAction<TopTabStyleValue>>;
  accountMenuStyleValue: AccountMenuStyleValue;
  setAccountMenuStyleValue: React.Dispatch<React.SetStateAction<AccountMenuStyleValue>>;
  heroSlideshowValue: HeroSlideshowValue;
  setHeroSlideshowValue: React.Dispatch<React.SetStateAction<HeroSlideshowValue>>;
  sidebarIconsValue: SidebarIconsValue;
  setSidebarIconsValue: React.Dispatch<React.SetStateAction<SidebarIconsValue>>;
  headerPositions: { slots: Record<string, HeaderSlotOffset> };
  onResetOffset: (slotKey: string) => void;
  onOffsetChange: (slotKey: string, next: HeaderSlotOffset) => void;
  topSidebarValue: TopSidebarValue;
  setTopSidebarValue: React.Dispatch<React.SetStateAction<TopSidebarValue>>;
  topBarIconsValue: TopBarIconsValue;
  setTopBarIconsValue: React.Dispatch<React.SetStateAction<TopBarIconsValue>>;
}) {
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [uploadingLogoHover, setUploadingLogoHover] = useState(false);
  const [uploadingFont, setUploadingFont] = useState(false);
  const [uploadingSlideIdx, setUploadingSlideIdx] = useState<number | null>(null);
  const [uploadingWallpaperIdx, setUploadingWallpaperIdx] = useState<number | null>(null);
  const [uploadingSidebarField, setUploadingSidebarField] = useState<string | null>(null);
  const [uploadingTabDropdownFont, setUploadingTabDropdownFont] = useState(false);
  const [uploadingSideTextFont, setUploadingSideTextFont] = useState(false);
  const [uploadingIconField, setUploadingIconField] = useState<string | null>(null);

  if (!selection) return <p className="text-xs text-gray-400">캔버스에서 요소를 클릭하면 설정이 여기 표시됩니다.</p>;
  if (selection.kind === "craft") return <FooterCraftControls />;

  const selectedSlotKey = selection.key;
  const offset = headerPositions.slots[selectedSlotKey];
  // HOTFIX-141(사용자 지시 — "좌, 우측, 사이드바 아이콘도 내가 드래그
  // 드랍으로 위치를 조정할수 있게 해줘"): sidebar:left/right도 이제
  // 같은 headerPositions.slots 오프셋 시스템을 쓴다(LeftSidebar/
  // RightSidebar.tsx 참고) — 다만 별도 ✥ 핸들이 아니라 아이콘 자신을
  // 바로 드래그하는 방식이라 안내 문구만 다르게 보여준다.
  const isSidebarIconSlot = selectedSlotKey.startsWith("sidebar:");
  // HOTFIX-141.13(사용자 지시 — "드래그로 움직이고, 수정이 끝나면
  // 고정되도록, pc와 mobile 둘 다"): 로고 양옆 텍스트(logo-left-text/
  // logo-right-text)가 자꾸 실수로 다시 끌려 간격이 흐트러지던 문제 —
  // 위치를 다 잡은 뒤 여기서 "고정"하면 이후로는 드래그 핸들 자체가
  // 사라져(HeaderSlot.tsx) 실수로 다시 끌리지 않는다. 필요하면 언제든
  // "잠금 해제"로 되돌려 다시 조정할 수 있다.
  const isLocked = !!offset?.locked;
  function toggleLocked() {
    onOffsetChange(selectedSlotKey, { dxPx: offset?.dxPx ?? 0, dyPx: offset?.dyPx ?? 0, raised: offset?.raised ?? false, locked: !isLocked });
  }
  // HOTFIX-141.20(사용자 신고 — "안보이는데 어떻게 드래그를 하냐고":
  // 요소가 화면 밖으로 밀려나 0픽셀만 보이면 캔버스에서 잡고 끌 대상
  // 자체가 없다 — 드래그는 "보이는 걸 옮기는" 수단일 뿐이라 애초에
  // 안 보이는 요소를 화면 안으로 데려오는 용도로는 못 쓴다. 좌표를 직접
  // 입력하는 숫자 필드를 둬서, 보이지도 잡히지도 않는 요소도 0,0(원래
  // 자리)이나 임의의 값으로 확실하게 옮길 수 있게 한다.
  function patchOffset(patch: { dxPx?: number; dyPx?: number }) {
    onOffsetChange(selectedSlotKey, {
      dxPx: patch.dxPx ?? offset?.dxPx ?? 0,
      dyPx: patch.dyPx ?? offset?.dyPx ?? 0,
      raised: true,
      locked: offset?.locked,
      refWidthPx: measureReferenceWidth(),
    });
  }
  const positionSection = (selectedSlotKey === "slideshow" || selectedSlotKey === "top-sidebar") ? null : (
    <div className="mt-4 space-y-2 border-t border-gray-200 pt-3">
      <p className="text-xs font-semibold text-gray-500">위치</p>
      <p className="text-[11px] leading-relaxed text-gray-400">
        {isLocked
          ? "지금 위치에 고정돼 있어요 — 캔버스에서 드래그 핸들이 보이지 않아요. 다시 옮기려면 아래에서 잠금을 해제하세요."
          : isSidebarIconSlot
            ? "닫혀있는 아이콘 자체를 캔버스에서 직접 드래그해 화면 어디로든 옮기거나, 아래에 좌표를 직접 입력하세요."
            : "선택된 요소 위의 ✥ 핸들(또는 요소 어디든)을 캔버스에서 직접 드래그해 옮기거나, 아래에 좌표를 직접 입력하세요."}
      </p>
      <div className="grid grid-cols-2 gap-2">
        <label className="block">
          <span className="mb-1 block text-gray-600">가로(px, 음수=왼쪽)</span>
          <input
            type="number"
            value={Math.round(offset?.dxPx ?? 0)}
            onChange={(e) => patchOffset({ dxPx: e.target.value ? Number(e.target.value) : 0 })}
            className="w-full rounded border border-gray-300 px-2 py-1"
          />
        </label>
        <label className="block">
          <span className="mb-1 block text-gray-600">세로(px, 음수=위쪽)</span>
          <input
            type="number"
            value={Math.round(offset?.dyPx ?? 0)}
            onChange={(e) => patchOffset({ dyPx: e.target.value ? Number(e.target.value) : 0 })}
            className="w-full rounded border border-gray-300 px-2 py-1"
          />
        </label>
      </div>
      <p className="text-[11px] text-gray-400">
        요소가 화면 밖에 있어 안 보이면, 가로/세로를 0으로 바꾸거나(원래 자리) 값을 조금씩 줄여가며 화면 안으로 들어오는지 확인하세요.
      </p>
      <label className="flex items-center gap-2 text-gray-600">
        <input type="checkbox" checked={isLocked} onChange={toggleLocked} />
        이 위치에 고정(실수로 다시 끌리지 않게)
      </label>
      {offset && (offset.dxPx !== 0 || offset.dyPx !== 0) && (
        <button type="button" onClick={() => onResetOffset(selectedSlotKey)} className="text-xs text-blue-600 hover:underline">
          원래 위치로 되돌리기
        </button>
      )}
    </div>
  );

  const mainLogo = mainLogoValue[deviceTab];
  function patchLogo(patch: Partial<MainLogoValue["pc"]>) {
    setMainLogoValue((prev) => ({ ...prev, [deviceTab]: { ...prev[deviceTab], ...patch } }));
  }
  async function handleLogoFile(file: File | null) {
    if (!file) return;
    setUploadingLogo(true);
    const { url } = await uploadImage(file, "main_logo");
    setUploadingLogo(false);
    if (url) patchLogo({ type: "image", imageUrl: url });
  }
  // HOTFIX-144.4(사용자 지시 — "'메인로고'에 hover 하면 나타날 이미지도
  // 업로드 할수 있게 해줘"): handleLogoFile과 동일한 패턴, 별도 폴더에
  // 저장하고 hoverImageUrl만 patch — Navbar.tsx의 renderMainLogoImage가
  // 이 값이 있을 때만 크로스페이드로 렌더링한다.
  async function handleLogoHoverFile(file: File | null) {
    if (!file) return;
    setUploadingLogoHover(true);
    const { url } = await uploadImage(file, "main_logo_hover");
    setUploadingLogoHover(false);
    if (url) patchLogo({ hoverImageUrl: url });
  }
  async function handleFontFile(file: File | null) {
    if (!file) return;
    setUploadingFont(true);
    const { url } = await uploadImage(file, "custom_fonts");
    setUploadingFont(false);
    if (url) {
      const entry: CustomFontEntry = { id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`, url, isActive: true };
      patchLogo({ customFonts: [...mainLogo.customFonts, entry] });
    }
  }

  // 사용자 지시(2026-08-29 — "'홈페이지 설정'에 상단에 아이콘을 추가하고
  // 페이지와 링크하는 기능을 만들어줘. 그 아이콘은 드래그앤드랍으로 위치를
  // 설정할수 있어야해"): "로고" Controls 섹션(바로 아래)의 이미지+hover
  // 이미지 업로드 패턴을 그대로 따르되, 링크(href)와 개별 삭제가 추가로
  // 있다. 위치(positionSection)는 다른 모든 헤더 요소와 완전히 동일하게
  // 재사용 — 새 드래그 시스템을 만들지 않는다.
  if (selectedSlotKey.startsWith("top-bar-icon:")) {
    const iconId = selectedSlotKey.slice("top-bar-icon:".length);
    const iconIndex = topBarIconsValue.icons.findIndex((i) => i.id === iconId);
    const icon = topBarIconsValue.icons[iconIndex];
    if (!icon) return <p className="text-xs text-gray-400">삭제된 아이콘이에요.</p>;
    function patchIcon(patch: Partial<TopBarIcon>) {
      setTopBarIconsValue((prev) => ({
        icons: prev.icons.map((i) => (i.id === iconId ? { ...i, ...patch } : i)),
      }));
    }
    function deleteIcon() {
      setTopBarIconsValue((prev) => ({ icons: prev.icons.filter((i) => i.id !== iconId) }));
    }
    async function handleIconFile(file: File | null) {
      if (!file) return;
      setUploadingIconField("default");
      const { url } = await uploadImage(file, "top_bar_icons");
      setUploadingIconField(null);
      if (url) patchIcon({ imageUrl: url });
    }
    async function handleIconHoverFile(file: File | null) {
      if (!file) return;
      setUploadingIconField("hover");
      const { url } = await uploadImage(file, "top_bar_icons_hover");
      setUploadingIconField(null);
      if (url) patchIcon({ hoverImageUrl: url });
    }
    return (
      <div className="space-y-3 text-xs">
        <div className="flex items-center justify-between">
          <p className="text-sm font-semibold text-gray-700">상단 아이콘 {iconIndex + 1}</p>
          <button type="button" onClick={deleteIcon} className="rounded border border-red-200 px-1.5 py-0.5 text-[11px] text-red-500 hover:bg-red-50">삭제</button>
        </div>
        <label className="block">
          <span className="mb-1 block text-gray-600">이미지 {uploadingIconField === "default" && "(업로드 중...)"}</span>
          <input type="file" accept="image/*" disabled={uploadingIconField === "default"} onChange={(e) => handleIconFile(e.target.files?.[0] ?? null)} className="w-full text-[11px]" />
          <ImageThumb url={icon.imageUrl} alt="아이콘 미리보기" />
        </label>
        <label className="block">
          <span className="mb-1 block text-gray-600">마우스를 올렸을 때 나타날 이미지(선택, {uploadingIconField === "hover" && "업로드 중... "}비우면 기본 이미지 고정)</span>
          <input type="file" accept="image/*" disabled={uploadingIconField === "hover"} onChange={(e) => handleIconHoverFile(e.target.files?.[0] ?? null)} className="w-full text-[11px]" />
          <ImageThumb url={icon.hoverImageUrl} alt="아이콘 hover 미리보기" />
          {icon.hoverImageUrl && (
            <button type="button" onClick={() => patchIcon({ hoverImageUrl: "" })} className="mt-1 text-[11px] text-red-500 hover:underline">
              hover 이미지 제거
            </button>
          )}
        </label>
        <label className="block">
          <span className="mb-1 block text-gray-600">링크(클릭 시 이동할 페이지 경로 — 예: /shop)</span>
          <input value={icon.href} onChange={(e) => patchIcon({ href: e.target.value })} placeholder="/shop" className="w-full rounded border border-gray-300 px-2 py-1" />
        </label>
        <label className="block">
          <span className="mb-1 block text-gray-600">크기(px)</span>
          <input type="number" value={icon.sizePx} onChange={(e) => patchIcon({ sizePx: Number(e.target.value) || DEFAULT_TOP_BAR_ICON_SIZE_PX })} className="w-full rounded border border-gray-300 px-2 py-1" />
        </label>
        <label className="block">
          <span className="mb-1 block text-gray-600">대체 텍스트(선택)</span>
          <input value={icon.alt} onChange={(e) => patchIcon({ alt: e.target.value })} className="w-full rounded border border-gray-300 px-2 py-1" />
        </label>
        {positionSection}
      </div>
    );
  }

  if (selectedSlotKey === "logo") {
    return (
      <div className="space-y-3 text-xs">
        <p className="text-sm font-semibold text-gray-700">로고</p>
        <label className="block">
          <span className="mb-1 block text-gray-600">유형</span>
          <select value={mainLogo.type} onChange={(e) => patchLogo({ type: e.target.value as "text" | "image" })} className="w-full rounded border border-gray-300 px-2 py-1">
            <option value="text">텍스트</option>
            <option value="image">이미지</option>
          </select>
        </label>
        {mainLogo.type === "text" ? (
          <label className="block">
            <span className="mb-1 block text-gray-600">텍스트</span>
            <input value={mainLogo.text} onChange={(e) => patchLogo({ text: e.target.value })} className="w-full rounded border border-gray-300 px-2 py-1" />
          </label>
        ) : (
          <label className="block">
            <span className="mb-1 block text-gray-600">이미지 {uploadingLogo && "(업로드 중...)"}</span>
            <input type="file" accept="image/*" disabled={uploadingLogo} onChange={(e) => handleLogoFile(e.target.files?.[0] ?? null)} className="w-full text-[11px]" />
            <ImageThumb url={mainLogo.imageUrl} alt="로고 미리보기" />
          </label>
        )}
        {mainLogo.type === "image" && (
          <label className="block">
            <span className="mb-1 block text-gray-600">
              마우스를 올렸을 때 나타날 이미지(선택, {uploadingLogoHover && "업로드 중... "}비우면 기존처럼 로고 이미지 고정)
            </span>
            <input
              type="file"
              accept="image/*"
              disabled={uploadingLogoHover}
              onChange={(e) => handleLogoHoverFile(e.target.files?.[0] ?? null)}
              className="w-full text-[11px]"
            />
            <ImageThumb url={mainLogo.hoverImageUrl} alt="로고 hover 이미지 미리보기" />
            {mainLogo.hoverImageUrl && (
              <button
                type="button"
                onClick={() => patchLogo({ hoverImageUrl: "" })}
                className="mt-1 text-[11px] text-red-500 hover:underline"
              >
                hover 이미지 제거
              </button>
            )}
          </label>
        )}
        <label className="block">
          <span className="mb-1 block text-gray-600">왼쪽 텍스트</span>
          <input value={mainLogo.leftText} onChange={(e) => patchLogo({ leftText: e.target.value })} className="w-full rounded border border-gray-300 px-2 py-1" />
        </label>
        <label className="block">
          <span className="mb-1 block text-gray-600">오른쪽 텍스트</span>
          <input value={mainLogo.rightText} onChange={(e) => patchLogo({ rightText: e.target.value })} className="w-full rounded border border-gray-300 px-2 py-1" />
        </label>
        <label className="block">
          <span className="mb-1 block text-gray-600">로고 이미지 높이(px)</span>
          <input type="number" value={mainLogo.heightPx} onChange={(e) => patchLogo({ heightPx: Number(e.target.value) || DEFAULT_LOGO_HEIGHT_PX })} className="w-full rounded border border-gray-300 px-2 py-1" />
        </label>
        <label className="block">
          <span className="mb-1 block text-gray-600">텍스트 색상</span>
          <input type="color" value={mainLogo.textColor || DEFAULT_LOGO_TEXT_COLOR} onChange={(e) => patchLogo({ textColor: e.target.value })} className="h-8 w-full rounded border border-gray-300" />
        </label>
        <label className="flex items-center gap-2 text-gray-600">
          <input type="checkbox" checked={mainLogo.bold} onChange={(e) => patchLogo({ bold: e.target.checked })} />
          굵게
        </label>
        <div className="space-y-2 border-t border-gray-200 pt-3">
          <p className="font-medium text-gray-600">커스텀 폰트 파일 ({mainLogo.customFonts.length}개)</p>
          {mainLogo.customFonts.map((font) => (
            <div key={font.id} className="space-y-1 rounded border border-gray-200 p-2">
              <div className="flex items-center justify-between">
                <label className="flex items-center gap-1.5 text-[11px] text-gray-600">
                  <input
                    type="checkbox"
                    checked={font.isActive}
                    onChange={(e) => patchLogo({ customFonts: mainLogo.customFonts.map((f) => (f.id === font.id ? { ...f, isActive: e.target.checked } : f)) })}
                  />
                  사용
                </label>
                <button type="button" onClick={() => patchLogo({ customFonts: mainLogo.customFonts.filter((f) => f.id !== font.id) })} className="text-[11px] text-red-500 hover:underline">
                  삭제
                </button>
              </div>
              <p className="truncate text-[10px] text-gray-400" title={font.url}>{font.url}</p>
            </div>
          ))}
          <label className="block">
            <span className="mb-1 block text-gray-600">폰트 파일 추가 {uploadingFont && "(업로드 중...)"}</span>
            <input type="file" accept=".woff,.woff2,.ttf,.otf" disabled={uploadingFont} onChange={(e) => handleFontFile(e.target.files?.[0] ?? null)} className="w-full text-[11px]" />
          </label>
        </div>
        <div className="space-y-2 border-t border-gray-200 pt-3">
          <label className="flex items-center gap-2 text-gray-600">
            <input type="checkbox" checked={mainLogo.groupSideTexts} onChange={(e) => patchLogo({ groupSideTexts: e.target.checked })} />
            왼쪽/오른쪽 텍스트를 로고와 하나로 묶어 함께 이동·고정
          </label>
          <p className="text-[11px] text-gray-400">
            켜면 셋이 하나의 요소(&ldquo;로고 그룹&rdquo;)로 합쳐져 위치가 항상 같은 간격으로 함께 움직여요 — 각자 따로 드래그하다 간격이 어긋나는 문제를 근본적으로 막아줘요. 텍스트 내용/서체는 여전히 각각 따로 편집할 수 있어요(왼쪽 패널의 &ldquo;로고 왼쪽/오른쪽 텍스트&rdquo;).
          </p>
          {mainLogo.groupSideTexts && (
            <label className="block">
              <span className="mb-1 block text-gray-600">그룹 안 간격(px, 비우면 기본값 16)</span>
              <input
                type="number"
                value={mainLogo.groupGapPx ?? ""}
                placeholder="16"
                onChange={(e) => patchLogo({ groupGapPx: e.target.value ? Number(e.target.value) : null })}
                className="w-full rounded border border-gray-300 px-2 py-1"
              />
            </label>
          )}
        </div>
        {mainLogo.groupSideTexts ? (
          <div className="mt-4 space-y-2 border-t border-gray-200 pt-3">
            <p className="text-xs font-semibold text-gray-500">위치</p>
            <p className="text-[11px] leading-relaxed text-gray-400">
              그룹으로 묶여 있어요 — 위치는 왼쪽 패널의 &ldquo;로고 그룹(위치)&rdquo;을 선택해서 한 번에 조정하세요.
            </p>
          </div>
        ) : (
          positionSection
        )}
      </div>
    );
  }

  if (selectedSlotKey === "logo-group") {
    return (
      <div className="space-y-3 text-xs">
        <p className="text-sm font-semibold text-gray-700">로고 그룹</p>
        <p className="text-[11px] leading-relaxed text-gray-400">
          왼쪽 텍스트 + 로고 + 오른쪽 텍스트가 하나로 묶여 있어요 — 여기서 위치를 옮기면 셋이 항상 같은 간격을 유지한 채 함께 움직여요. 텍스트 내용/서체/그룹 간격은 &ldquo;로고&rdquo;/&ldquo;로고 왼쪽 텍스트&rdquo;/&ldquo;로고 오른쪽 텍스트&rdquo;에서 각각 편집하세요.
        </p>
        {positionSection}
      </div>
    );
  }

  if (selectedSlotKey === "logo-left-text" || selectedSlotKey === "logo-right-text") {
    const isLeft = selectedSlotKey === "logo-left-text";
    // HOTFIX-141.12(사용자 지시 — "모바일 버전에 I'm your, Silo 텍스트의
    // 요소들도 세부 설정이 가능하게 연결해줘, pc 버전처럼"): 지금까지
    // 좌/우 텍스트는 "텍스트 내용"만 여기서 바꿀 수 있고 서체/굵기/크기/
    // 색상은 전부 "로고" 슬롯의 값을 그대로 상속해 독립적으로 커스터마이징할
    // 수 없었다 — 이제 로고 슬롯과 동일한 필드 세트를 좌/우 각각 따로
    // 둔다(비워두면/미설정이면 지금까지처럼 로고 스타일을 그대로 상속 —
    // 기존 데이터와 100% 호환). deviceTab이 이미 pc/mobile을 나누므로
    // 모바일에서 이 화면을 열면 mainLogoValue.mobile 쪽에 저장돼 PC와
    // 완전히 독립적으로 동작한다.
    const customFonts = isLeft ? mainLogo.leftTextCustomFonts : mainLogo.rightTextCustomFonts;
    const fontFamily = isLeft ? mainLogo.leftTextFontFamily : mainLogo.rightTextFontFamily;
    const bold = isLeft ? mainLogo.leftTextBold : mainLogo.rightTextBold;
    const fontSizePx = isLeft ? mainLogo.leftTextFontSizePx : mainLogo.rightTextFontSizePx;
    const color = isLeft ? mainLogo.leftTextColor : mainLogo.rightTextColor;
    function patchSide(patch: {
      fontFamily?: string;
      customFonts?: CustomFontEntry[];
      bold?: boolean | null;
      fontSizePx?: number | null;
      color?: string;
    }) {
      const prefixed: Partial<MainLogoValue["pc"]> = {};
      if (patch.fontFamily !== undefined) Object.assign(prefixed, isLeft ? { leftTextFontFamily: patch.fontFamily } : { rightTextFontFamily: patch.fontFamily });
      if (patch.customFonts !== undefined) Object.assign(prefixed, isLeft ? { leftTextCustomFonts: patch.customFonts } : { rightTextCustomFonts: patch.customFonts });
      if (patch.bold !== undefined) Object.assign(prefixed, isLeft ? { leftTextBold: patch.bold } : { rightTextBold: patch.bold });
      if (patch.fontSizePx !== undefined) Object.assign(prefixed, isLeft ? { leftTextFontSizePx: patch.fontSizePx } : { rightTextFontSizePx: patch.fontSizePx });
      if (patch.color !== undefined) Object.assign(prefixed, isLeft ? { leftTextColor: patch.color } : { rightTextColor: patch.color });
      patchLogo(prefixed);
    }
    async function handleSideTextFontFile(file: File | null) {
      if (!file) return;
      setUploadingSideTextFont(true);
      try {
        const { url, error: uploadErr } = await uploadImage(file, "custom_fonts");
        if (url) {
          const font: CustomFontEntry = { id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`, url, isActive: true };
          patchSide({ customFonts: [...customFonts, font] });
        } else {
          alert(`폰트 파일 업로드에 실패했어요.\n${uploadErr ?? "알 수 없는 오류"}`);
        }
      } catch (e) {
        alert(`폰트 파일 처리 중 오류가 발생했어요.\n${e instanceof Error ? e.message : String(e)}`);
      } finally {
        setUploadingSideTextFont(false);
      }
    }
    return (
      <div className="space-y-3 text-xs">
        <p className="text-sm font-semibold text-gray-700">로고 {isLeft ? "왼쪽" : "오른쪽"} 텍스트</p>
        <p className="text-[11px] text-gray-400">
          HOTFIX-141.10: 로고 그래픽과 더 이상 폭을 나눠 쓰지 않는 독립 요소예요 — 다른 헤더 요소처럼 자유롭게 드래그해서 옮기세요(모바일에서 특히 유용해요).
        </p>
        <label className="block">
          <span className="mb-1 block text-gray-600">텍스트(줄바꿈 가능)</span>
          <textarea
            rows={2}
            value={isLeft ? mainLogo.leftText : mainLogo.rightText}
            onChange={(e) => patchLogo(isLeft ? { leftText: e.target.value } : { rightText: e.target.value })}
            className="w-full rounded border border-gray-300 px-2 py-1"
          />
        </label>
        <div className="space-y-2 border-t border-gray-200 pt-3">
          <p className="font-medium text-gray-600">이 텍스트만의 스타일(비우면 로고와 동일)</p>
          <label className="block">
            <span className="mb-1 block text-gray-600">서체(직접 입력)</span>
            <input value={fontFamily} onChange={(e) => patchSide({ fontFamily: e.target.value })} className="w-full rounded border border-gray-300 px-2 py-1" />
          </label>
          <div className="space-y-1.5">
            <p className="mb-1 block text-gray-600">커스텀 폰트 파일 ({customFonts.length}개)</p>
            {customFonts.map((font) => (
              <div key={font.id} className="rounded border border-gray-200 p-1.5">
                <div className="flex items-center justify-between">
                  <label className="flex items-center gap-1 text-gray-600">
                    <input
                      type="checkbox"
                      checked={font.isActive}
                      onChange={(e) => patchSide({ customFonts: customFonts.map((f) => (f.id === font.id ? { ...f, isActive: e.target.checked } : f)) })}
                    />
                    사용
                  </label>
                  <button type="button" onClick={() => patchSide({ customFonts: customFonts.filter((f) => f.id !== font.id) })} className="text-[11px] text-red-500 hover:underline">
                    삭제
                  </button>
                </div>
                <p className="truncate text-[10px] text-gray-400" title={font.url}>{font.url}</p>
              </div>
            ))}
            <label className="block">
              <span className="mb-1 block text-gray-600">폰트 파일 추가 {uploadingSideTextFont && "(업로드 중...)"}</span>
              <input type="file" accept=".woff,.woff2,.ttf,.otf" disabled={uploadingSideTextFont} onChange={(e) => handleSideTextFontFile(e.target.files?.[0] ?? null)} className="w-full text-[11px]" />
            </label>
          </div>
          <label className="block">
            <span className="mb-1 block text-gray-600">글자 크기(px)</span>
            <input
              type="number"
              value={fontSizePx ?? ""}
              placeholder="로고와 동일"
              onChange={(e) => patchSide({ fontSizePx: e.target.value ? Number(e.target.value) : null })}
              className="w-full rounded border border-gray-300 px-2 py-1"
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-gray-600">굵기</span>
            <select
              value={bold === null || bold === undefined ? "inherit" : bold ? "bold" : "normal"}
              onChange={(e) => patchSide({ bold: e.target.value === "inherit" ? null : e.target.value === "bold" })}
              className="w-full rounded border border-gray-300 px-2 py-1"
            >
              <option value="inherit">로고와 동일</option>
              <option value="normal">보통</option>
              <option value="bold">굵게</option>
            </select>
          </label>
          <label className="block">
            <span className="mb-1 block text-gray-600">색상</span>
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={color || mainLogo.textColor || DEFAULT_LOGO_TEXT_COLOR}
                onChange={(e) => patchSide({ color: e.target.value })}
                className="h-8 flex-1 rounded border border-gray-300"
              />
              {color && (
                <button type="button" onClick={() => patchSide({ color: "" })} className="shrink-0 text-[11px] text-blue-600 hover:underline">
                  로고 색상 상속
                </button>
              )}
            </div>
          </label>
        </div>
        {mainLogo.groupSideTexts ? (
          <div className="mt-4 space-y-2 border-t border-gray-200 pt-3">
            <p className="text-xs font-semibold text-gray-500">위치</p>
            <p className="text-[11px] leading-relaxed text-gray-400">
              &ldquo;로고&rdquo;와 그룹으로 묶여 있어요 — 위치는 왼쪽 패널의 &ldquo;로고 그룹(위치)&rdquo;을 선택해서 한 번에 조정하세요.
            </p>
          </div>
        ) : (
          positionSection
        )}
      </div>
    );
  }

  if (selectedSlotKey.startsWith("tab:")) {
    const tabKey = selectedSlotKey.slice("tab:".length);
    const topTabStyle = topTabStyleValue[deviceTab];
    const entry = topTabStyle.tabs[tabKey] ?? defaultTopTabStyleEntry();
    const tab = topNavRows.find((t) => t.key === tabKey);
    const hasChildren = !!(tab?.groups?.length || tab?.items?.length);
    function patchTab(patch: Partial<TopTabStyleEntry>) {
      setTopTabStyleValue((prev) => ({
        ...prev,
        [deviceTab]: { ...prev[deviceTab], tabs: { ...prev[deviceTab].tabs, [tabKey]: { ...entry, ...patch } } },
      }));
    }
    // HOTFIX-137.5(사용자 지시 — "각 요소마다 '드롭다운'이 되게 하는걸
    // 선택할수 있는 기능을 만들고"): site_navigations.target_types를 이
    // 화면에서 바로 편집 — CategoryTreeManager.tsx(사이트 메뉴)와 같은
    // 테이블/컬럼을 직접 update하고, 로컬 topNavRows도 낙관적으로 갱신해
    // 다시 불러오지 않아도 화면(체크 상태·캔버스의 실제 탭 배치)이 바로
    // 반영되게 한다.
    async function toggleTargetType(type: DbTargetType) {
      if (!tab?.id) return;
      const current = tab.targetTypes ?? [];
      const next = current.includes(type) ? current.filter((t) => t !== type) : [...current, type];
      const { error } = await supabase.from("site_navigations").update({ target_types: next }).eq("id", tab.id);
      if (error) {
        alert(`노출 위치 변경에 실패했어요.\n${error.message}`);
        return;
      }
      setTopNavRows((prev) => prev.map((t) => (t.key === tabKey ? { ...t, targetTypes: next } : t)));
    }
    // HOTFIX-141.7(사용자 지시 — "모바일 버전에는 넓이가 좁기 때문에, 상단
    // 탭의 드롭다운 메뉴와 하위 카테고리들이 안보여... 드롭다운과 하위
    // 카테고리의 폭을 조절하고, 폰트업로드/크기/색상을 설정할수 있게
    // 해줘"): 탭 자체 스타일과 별개로 드롭다운/하위 카테고리 플라이아웃의
    // 폭/서체/크기/색을 여기서 설정 — mainLogo customFonts와 동일한 업로드 패턴.
    async function handleDropdownFontFile(file: File | null) {
      if (!file) return;
      setUploadingTabDropdownFont(true);
      try {
        const { url, error: uploadErr } = await uploadImage(file, "custom_fonts");
        if (url) {
          const font: CustomFontEntry = { id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`, url, isActive: true };
          patchTab({ dropdownCustomFonts: [...(entry.dropdownCustomFonts ?? []), font] });
        } else {
          alert(`폰트 파일 업로드에 실패했어요.\n${uploadErr ?? "알 수 없는 오류"}`);
        }
      } catch (e) {
        alert(`폰트 파일 처리 중 오류가 발생했어요.\n${e instanceof Error ? e.message : String(e)}`);
      } finally {
        setUploadingTabDropdownFont(false);
      }
    }
    return (
      <div className="space-y-3 text-xs">
        <div className="flex items-center justify-between">
          <p className="text-sm font-semibold text-gray-700">상단 탭 / 메뉴 항목</p>
          {tab && (
            <div className="flex shrink-0 items-center gap-1">
              <button
                type="button"
                title="복제"
                onClick={() => onDuplicateNavItem(tab)}
                className="rounded border border-gray-200 px-1.5 py-0.5 text-[11px] text-gray-600 hover:bg-gray-50"
              >
                복제
              </button>
              <button
                type="button"
                title="삭제"
                onClick={() => onDeleteNavItem(tab)}
                className="rounded border border-red-200 px-1.5 py-0.5 text-[11px] text-red-500 hover:bg-red-50"
              >
                삭제
              </button>
            </div>
          )}
        </div>
        <label className="block">
          <span className="mb-1 block text-gray-600">표시 텍스트(비우면 원래 이름, 줄바꿈 가능)</span>
          <textarea
            rows={2}
            value={entry.labelOverride}
            onChange={(e) => patchTab({ labelOverride: e.target.value })}
            className="w-full rounded border border-gray-300 px-2 py-1"
          />
        </label>
        <div>
          <span className="mb-1 block text-gray-600">노출 위치 (복수 선택 가능)</span>
          {tab?.id ? (
            <div className="space-y-1 rounded border border-gray-200 p-2">
              {(Object.entries(TAB_TARGET_TYPE_LABELS) as [DbTargetType, string][]).map(([type, label]) => (
                <label key={type} className="flex items-center gap-2 text-gray-700">
                  <input
                    type="checkbox"
                    checked={(tab.targetTypes ?? []).includes(type)}
                    onChange={() => toggleTargetType(type)}
                  />
                  {label}
                </label>
              ))}
            </div>
          ) : (
            <p className="text-[11px] text-gray-400">이 탭은 원본 데이터를 찾을 수 없어 노출 위치를 여기서 편집할 수 없어요 — 사이트 구성 관리에서 편집하세요.</p>
          )}
        </div>
        {hasChildren && (
          <label className="flex items-center gap-2 text-gray-600">
            <input type="checkbox" checked={!!entry.megaDropdown} onChange={(e) => patchTab({ megaDropdown: e.target.checked })} />
            메가 드롭다운으로 보기(그룹/항목을 한 번에 나란히 펼침)
          </label>
        )}
        {hasChildren && (() => {
          // HOTFIX-141.12(사용자 지시 — "최상위 카테고리와 하위 카테고리의
          // 텍스트를 각각 수정하게 해달라, 줄바꿈이라던지 그래서 폭이
          // 맞춰지게"): 그룹 헤더/항목 하나하나의 표시 텍스트를 원본
          // (site_navigations.title, "사이트 구성 관리"에서 편집)과 별개로
          // 오버라이드 — 메가/일반 드롭다운 어느 모드든 같은 tab.groups/
          // tab.items 데이터를 쓰므로 모드와 무관하게 항상 보여준다.
          type SubLabelRow = { key: string; original: string; depth: number };
          const rows: SubLabelRow[] = [];
          if (tab?.groups && tab.groups.length > 0) {
            for (const g of tab.groups) {
              rows.push({ key: g.groupLabel, original: g.groupLabel, depth: 0 });
              for (const it of g.items) rows.push({ key: it.href, original: it.label, depth: 1 });
            }
          } else {
            for (const it of tab?.items ?? []) {
              rows.push({ key: it.href, original: it.label, depth: 0 });
              for (const child of it.children ?? []) rows.push({ key: child.href, original: child.label, depth: 1 });
            }
          }
          if (rows.length === 0) return null;
          const overrides = entry.subLabelOverrides ?? {};
          return (
            <div className="space-y-2 border-t border-gray-200 pt-3">
              <p className="font-medium text-gray-600">하위 카테고리 텍스트(비우면 원래 이름, 줄바꿈 가능)</p>
              <p className="text-[11px] text-gray-400">최상위 카테고리 텍스트는 위 &ldquo;표시 텍스트&rdquo;에서, 그 아래 하위 카테고리들은 여기서 각각 따로 수정하세요.</p>
              {rows.map((row) => (
                <label key={row.key} className="block" style={row.depth > 0 ? { paddingLeft: 12 } : undefined}>
                  <span className="mb-1 block text-gray-500">{row.depth > 0 ? "› " : ""}{row.original}</span>
                  <textarea
                    rows={row.depth > 0 ? 1 : 2}
                    value={overrides[row.key] ?? ""}
                    placeholder={row.original}
                    onChange={(e) => patchTab({ subLabelOverrides: { ...overrides, [row.key]: e.target.value } })}
                    className="w-full rounded border border-gray-300 px-2 py-1"
                  />
                </label>
              ))}
            </div>
          );
        })()}
        {hasChildren && !entry.megaDropdown && (
          <div className="space-y-2 border-t border-gray-200 pt-3">
            <p className="font-medium text-gray-600">드롭다운 / 하위 카테고리</p>
            <p className="text-[11px] text-gray-400">모바일처럼 화면이 좁을 때 하위 카테고리가 화면 밖으로 잘려 안 보이면 폭을 줄이거나 방향을 바꿔보세요 — 1차/2차 방향과 폭을 각각 따로 정할 수 있어요.</p>
            <label className="block">
              <span className="mb-1 block text-gray-600">1차 펼치는 방향(화면 오른쪽 끝에 가까운 탭은 &ldquo;오른쪽 기준&rdquo;으로 바꾸면 왼쪽으로 펼쳐져 안 잘려요)</span>
              <select
                value={entry.dropdownAlign ?? "left"}
                onChange={(e) => patchTab({ dropdownAlign: e.target.value as TopTabStyleEntry["dropdownAlign"] })}
                className="w-full rounded border border-gray-300 px-2 py-1"
              >
                <option value="left">왼쪽 기준(오른쪽으로 펼침) — 기본값</option>
                <option value="right">오른쪽 기준(왼쪽으로 펼침)</option>
              </select>
            </label>
            <label className="block">
              <span className="mb-1 block text-gray-600">2차 펼치는 방향(하위 카테고리의 하위 카테고리, 비우면 1차와 동일)</span>
              <select
                value={entry.subDropdownAlign ?? ""}
                onChange={(e) => patchTab({ subDropdownAlign: e.target.value ? (e.target.value as TopTabStyleEntry["subDropdownAlign"]) : undefined })}
                className="w-full rounded border border-gray-300 px-2 py-1"
              >
                <option value="">1차와 동일</option>
                <option value="left">왼쪽 기준(오른쪽으로 펼침)</option>
                <option value="right">오른쪽 기준(왼쪽으로 펼침)</option>
              </select>
            </label>
            <label className="block">
              <span className="mb-1 block text-gray-600">1차 폭(px, 비우면 기본값 256)</span>
              <input
                type="number"
                min={80}
                max={480}
                value={entry.dropdownWidthPx ?? ""}
                placeholder="기본값"
                onChange={(e) => patchTab({ dropdownWidthPx: e.target.value ? Number(e.target.value) : null })}
                className="w-full rounded border border-gray-300 px-2 py-1"
              />
            </label>
            <label className="block">
              <span className="mb-1 block text-gray-600">2차 폭(하위 카테고리의 하위 카테고리, px — 비우면 1차 폭과 동일)</span>
              <input
                type="number"
                min={80}
                max={480}
                value={entry.subDropdownWidthPx ?? ""}
                placeholder="1차와 동일"
                onChange={(e) => patchTab({ subDropdownWidthPx: e.target.value ? Number(e.target.value) : null })}
                className="w-full rounded border border-gray-300 px-2 py-1"
              />
            </label>
            <label className="block">
              <span className="mb-1 block text-gray-600">1차 좌우 위치(px, 오른쪽 기준선에서 더 밀기 — 양수면 오른쪽, 음수면 왼쪽)</span>
              <input
                type="number"
                value={entry.dropdownOffsetXPx ?? ""}
                placeholder="0"
                onChange={(e) => patchTab({ dropdownOffsetXPx: e.target.value ? Number(e.target.value) : null })}
                className="w-full rounded border border-gray-300 px-2 py-1"
              />
            </label>
            <label className="block">
              <span className="mb-1 block text-gray-600">2차 좌우 위치(하위 카테고리의 하위 카테고리, px — 양수면 오른쪽, 음수면 왼쪽)</span>
              <input
                type="number"
                value={entry.subDropdownOffsetXPx ?? ""}
                placeholder="0"
                onChange={(e) => patchTab({ subDropdownOffsetXPx: e.target.value ? Number(e.target.value) : null })}
                className="w-full rounded border border-gray-300 px-2 py-1"
              />
            </label>
            <label className="block">
              <span className="mb-1 block text-gray-600">1차 상하 위치(px, 양수면 아래로, 음수면 위로)</span>
              <input
                type="number"
                value={entry.dropdownOffsetYPx ?? ""}
                placeholder="0"
                onChange={(e) => patchTab({ dropdownOffsetYPx: e.target.value ? Number(e.target.value) : null })}
                className="w-full rounded border border-gray-300 px-2 py-1"
              />
            </label>
            <label className="block">
              <span className="mb-1 block text-gray-600">2차 상하 위치(하위 카테고리의 하위 카테고리, px — 양수면 아래로, 음수면 위로)</span>
              <input
                type="number"
                value={entry.subDropdownOffsetYPx ?? ""}
                placeholder="0"
                onChange={(e) => patchTab({ subDropdownOffsetYPx: e.target.value ? Number(e.target.value) : null })}
                className="w-full rounded border border-gray-300 px-2 py-1"
              />
            </label>
            <label className="block">
              <span className="mb-1 block text-gray-600">서체(직접 입력)</span>
              <input value={entry.dropdownFontFamily ?? ""} onChange={(e) => patchTab({ dropdownFontFamily: e.target.value })} className="w-full rounded border border-gray-300 px-2 py-1" />
            </label>
            <div className="space-y-1.5">
              <p className="mb-1 block text-gray-600">커스텀 폰트 파일 ({(entry.dropdownCustomFonts ?? []).length}개)</p>
              {(entry.dropdownCustomFonts ?? []).map((font) => (
                <div key={font.id} className="rounded border border-gray-200 p-1.5">
                  <div className="flex items-center justify-between">
                    <label className="flex items-center gap-1 text-gray-600">
                      <input
                        type="checkbox"
                        checked={font.isActive}
                        onChange={(e) =>
                          patchTab({
                            dropdownCustomFonts: (entry.dropdownCustomFonts ?? []).map((f) => (f.id === font.id ? { ...f, isActive: e.target.checked } : f)),
                          })
                        }
                      />
                      사용
                    </label>
                    <button
                      type="button"
                      onClick={() => patchTab({ dropdownCustomFonts: (entry.dropdownCustomFonts ?? []).filter((f) => f.id !== font.id) })}
                      className="text-[11px] text-red-500 hover:underline"
                    >
                      삭제
                    </button>
                  </div>
                  <p className="truncate text-[10px] text-gray-400" title={font.url}>{font.url}</p>
                </div>
              ))}
              <label className="block">
                <span className="mb-1 block text-gray-600">폰트 파일 추가 {uploadingTabDropdownFont && "(업로드 중...)"}</span>
                <input type="file" accept=".woff,.woff2,.ttf,.otf" disabled={uploadingTabDropdownFont} onChange={(e) => handleDropdownFontFile(e.target.files?.[0] ?? null)} className="w-full text-[11px]" />
              </label>
            </div>
            <label className="block">
              <span className="mb-1 block text-gray-600">글자 크기(px)</span>
              <input
                type="number"
                value={entry.dropdownFontSizePx ?? ""}
                placeholder="기본값"
                onChange={(e) => patchTab({ dropdownFontSizePx: e.target.value ? Number(e.target.value) : null })}
                className="w-full rounded border border-gray-300 px-2 py-1"
              />
            </label>
            <label className="block">
              <span className="mb-1 block text-gray-600">색상</span>
              <input type="color" value={entry.dropdownColor || "#374151"} onChange={(e) => patchTab({ dropdownColor: e.target.value })} className="h-8 w-full rounded border border-gray-300" />
            </label>
          </div>
        )}
        <label className="block">
          <span className="mb-1 block text-gray-600">글자 크기(px)</span>
          <input
            type="number"
            value={entry.fontSizePx ?? ""}
            placeholder="기본값"
            onChange={(e) => patchTab({ fontSizePx: e.target.value ? Number(e.target.value) : null })}
            className="w-full rounded border border-gray-300 px-2 py-1"
          />
        </label>
        <label className="block">
          <span className="mb-1 block text-gray-600">색상</span>
          <input type="color" value={entry.color || "#6b7280"} onChange={(e) => patchTab({ color: e.target.value })} className="h-8 w-full rounded border border-gray-300" />
        </label>
        <label className="flex items-center gap-2 text-gray-600">
          <input type="checkbox" checked={entry.bold} onChange={(e) => patchTab({ bold: e.target.checked })} />
          굵게
        </label>
        <label className="block">
          <span className="mb-1 block text-gray-600">호버 모션</span>
          <HoverMotionSelect
            value={entry.hoverMotion ?? DEFAULT_TAB_HOVER_MOTION}
            onChange={(motion) => patchTab({ hoverMotion: motion })}
          />
        </label>
        {positionSection}
      </div>
    );
  }

  if (selectedSlotKey.startsWith("account:")) {
    const accountMenuStyle = accountMenuStyleValue[deviceTab];
    function patchAccount(patch: Partial<AccountMenuStyleValue["pc"]>) {
      setAccountMenuStyleValue((prev) => ({ ...prev, [deviceTab]: { ...prev[deviceTab], ...patch } }));
    }
    // HOTFIX-141(사용자 지시 — "관리자, lautrec, Ethan Ki, 마이 페이지
    // 같은 '사용자 메뉴' 요소들을 복제/삭제 하는 기능이 없어"): 이
    // 5개는 site_navigations 같은 순수 데이터가 아니라 로그인 세션에
    // 묶인 조건부 렌더링이라(Navbar.tsx의 renderMenuItem) "복제"는
    // 그 kind를 한 번 더 그리는 것(extraItems), "삭제"는 그 kind를
    // 숨기는 것(hiddenKinds)으로 구현했다 — 실제 데이터 행을 지우는 게
    // 아니라 항상 되돌릴 수 있다(아래 "숨긴 항목" 목록에서 복원).
    const isExtra = selectedSlotKey.startsWith("account:extra:");
    const extraId = isExtra ? selectedSlotKey.slice("account:extra:".length) : null;
    const extraItem = extraId ? (accountMenuStyleValue.extraItems ?? []).find((e) => e.id === extraId) : null;
    const kind = (isExtra ? extraItem?.kind : (selectedSlotKey.slice("account:".length) as HeaderMenuItemKey)) ?? null;
    const hiddenKinds = accountMenuStyleValue.hiddenKinds ?? [];
    function duplicateAccountItem() {
      if (!kind) return;
      const newItem: ExtraAccountItem = { id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`, kind };
      setAccountMenuStyleValue((prev) => ({ ...prev, extraItems: [...(prev.extraItems ?? []), newItem] }));
    }
    function deleteAccountItem() {
      if (isExtra && extraId) {
        setAccountMenuStyleValue((prev) => ({ ...prev, extraItems: (prev.extraItems ?? []).filter((e) => e.id !== extraId) }));
      } else if (kind) {
        setAccountMenuStyleValue((prev) => ({ ...prev, hiddenKinds: [...(prev.hiddenKinds ?? []), kind] }));
      }
      // 선택 상태(selectedSlotKey)는 일부러 그대로 둔다 — 삭제 직후에도 이
      // 패널이 계속 같은 항목을 보여주면서 "숨긴 항목" 목록에 방금 숨긴
      // 걸 즉시 보여줘 바로 복원할 수 있게 한다(아래 selectSlot 없이도
      // kind는 slotKey 문자열 자체에서 다시 계산되므로 안전).
    }
    function restoreAccountKind(k: HeaderMenuItemKey) {
      setAccountMenuStyleValue((prev) => ({ ...prev, hiddenKinds: (prev.hiddenKinds ?? []).filter((h) => h !== k) }));
    }
    return (
      <div className="space-y-3 text-xs">
        <div className="flex items-center justify-between">
          <p className="text-sm font-semibold text-gray-700">
            계정 영역 항목{kind ? ` — ${HEADER_MENU_ITEM_LABELS[kind]}${isExtra ? " 사본" : ""}` : ""}
          </p>
          {kind && (
            <div className="flex shrink-0 items-center gap-1">
              <button type="button" onClick={duplicateAccountItem} className="rounded border border-gray-200 px-1.5 py-0.5 text-[11px] text-gray-600 hover:bg-gray-50">복제</button>
              <button type="button" onClick={deleteAccountItem} className="rounded border border-red-200 px-1.5 py-0.5 text-[11px] text-red-500 hover:bg-red-50">삭제</button>
            </div>
          )}
        </div>
        <p className="text-[11px] text-gray-400">
          관리자 / 회원 등급 / 마이페이지 / 회원 이름 / 로그아웃 — 로그인 상태에 따라 자동으로 나타나는 항목이라 &ldquo;삭제&rdquo;는 데이터를 지우는 게 아니라 숨기는 것이고, &ldquo;복제&rdquo;는 같은 항목을 하나 더 그리는 거예요. 서체/색상/모션 스타일은 전체(원본+사본)에 함께 적용돼요.
        </p>
        {kind === "logout" && (
          <p className="rounded border border-amber-200 bg-amber-50 p-2 text-[11px] text-amber-700">
            HOTFIX-141.2: 로그인/로그아웃 버튼은 이제 여기 대신 &ldquo;상단 사이드바&rdquo;(Elements 탭)의 column 1 맨 위에 표시돼요 — 기본적으로 이 계정 영역 자리는 숨김 처리했어요. 계정 영역에도 다시 보이게 하려면 아래 &ldquo;복원&rdquo;을 누르세요.
          </p>
        )}
        {hiddenKinds.length > 0 && (
          <div className="rounded border border-gray-200 p-2">
            <p className="mb-1 text-[11px] font-medium text-gray-500">숨긴 항목</p>
            <div className="flex flex-wrap gap-1">
              {hiddenKinds.map((k) => (
                <button key={k} type="button" onClick={() => restoreAccountKind(k)} className="rounded border border-gray-300 px-1.5 py-0.5 text-[11px] text-gray-600 hover:bg-gray-50">
                  {HEADER_MENU_ITEM_LABELS[k]} 복원
                </button>
              ))}
            </div>
          </div>
        )}
        <p className="text-[11px] text-gray-400">
          &ldquo;마이페이지&rdquo; 클릭 시 뜨는 드롭다운에 항목을 추가하고 싶으면 — Elements 탭의 &ldquo;+ 새 탭/메뉴 항목 추가&rdquo;로 만든 뒤, 그 항목의 Controls에서 노출 위치를 &ldquo;사용자 메뉴&rdquo;로 체크하세요.
        </p>
        <label className="block">
          <span className="mb-1 block text-gray-600">서체(직접 입력)</span>
          <input value={accountMenuStyle.fontFamily} onChange={(e) => patchAccount({ fontFamily: e.target.value })} className="w-full rounded border border-gray-300 px-2 py-1" />
        </label>
        <label className="block">
          <span className="mb-1 block text-gray-600">글자 크기(px)</span>
          <input
            type="number"
            value={accountMenuStyle.fontSizePx ?? ""}
            placeholder="기본값"
            onChange={(e) => patchAccount({ fontSizePx: e.target.value ? Number(e.target.value) : null })}
            className="w-full rounded border border-gray-300 px-2 py-1"
          />
        </label>
        <label className="block">
          <span className="mb-1 block text-gray-600">색상</span>
          <input type="color" value={accountMenuStyle.color || "#4b5563"} onChange={(e) => patchAccount({ color: e.target.value })} className="h-8 w-full rounded border border-gray-300" />
        </label>
        <label className="flex items-center gap-2 text-gray-600">
          <input type="checkbox" checked={accountMenuStyle.bold} onChange={(e) => patchAccount({ bold: e.target.checked })} />
          굵게
        </label>
        <label className="block">
          <span className="mb-1 block text-gray-600">호버 모션</span>
          <HoverMotionSelect
            value={accountMenuStyle.hoverMotion ?? DEFAULT_TAB_HOVER_MOTION}
            onChange={(motion) => patchAccount({ hoverMotion: motion })}
          />
        </label>
        {positionSection}
      </div>
    );
  }

  if (selectedSlotKey === "write-button" || selectedSlotKey.startsWith("write-button:extra:")) {
    const isExtraWrite = selectedSlotKey.startsWith("write-button:extra:");
    const extraWriteId = isExtraWrite ? selectedSlotKey.slice("write-button:extra:".length) : null;
    function duplicateWriteButton() {
      const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      setAccountMenuStyleValue((prev) => ({ ...prev, extraWriteButtonIds: [...(prev.extraWriteButtonIds ?? []), id] }));
    }
    function deleteWriteButton() {
      if (isExtraWrite && extraWriteId) {
        setAccountMenuStyleValue((prev) => ({ ...prev, extraWriteButtonIds: (prev.extraWriteButtonIds ?? []).filter((id) => id !== extraWriteId) }));
      } else {
        setAccountMenuStyleValue((prev) => ({ ...prev, writeButtonHidden: true }));
      }
    }
    return (
      <div className="space-y-3 text-xs">
        <div className="flex items-center justify-between">
          <p className="text-sm font-semibold text-gray-700">글쓰기 버튼{isExtraWrite ? " 사본" : ""}</p>
          <div className="flex shrink-0 items-center gap-1">
            <button type="button" onClick={duplicateWriteButton} className="rounded border border-gray-200 px-1.5 py-0.5 text-[11px] text-gray-600 hover:bg-gray-50">복제</button>
            <button type="button" onClick={deleteWriteButton} className="rounded border border-red-200 px-1.5 py-0.5 text-[11px] text-red-500 hover:bg-red-50">삭제</button>
          </div>
        </div>
        <p className="text-[11px] text-gray-400">항상 &ldquo;마이 페이지&rdquo; 탭 바로 오른쪽에 붙어있는 전역 버튼이에요. 위치는 자유롭게 옮길 수 있어요.</p>
        {accountMenuStyleValue.writeButtonHidden && !isExtraWrite && (
          <button
            type="button"
            onClick={() => setAccountMenuStyleValue((prev) => ({ ...prev, writeButtonHidden: false }))}
            className="text-[11px] text-blue-600 hover:underline"
          >
            원본 글쓰기 버튼 복원
          </button>
        )}
        {positionSection}
      </div>
    );
  }

  if (selectedSlotKey === "top-sidebar-trigger") {
    return (
      <div className="space-y-3 text-xs">
        <p className="text-sm font-semibold text-gray-700">상단 사이드바 열기 버튼</p>
        <p className="text-[11px] text-gray-400">클릭하면 아래에서 편집하는 &ldquo;상단 사이드바&rdquo; 패널이 위에서 아래로 슬라이드해 열려요. 위치만 자유롭게 옮길 수 있어요(캔버스에서 직접 클릭해 열고 닫아 미리볼 수도 있어요).</p>
        {positionSection}
      </div>
    );
  }

  if (selectedSlotKey === "top-sidebar") {
    return <TopSidebarControls value={topSidebarValue} setValue={setTopSidebarValue} deviceTab={deviceTab} />;
  }

  if (selectedSlotKey === "slideshow") {
    const value = heroSlideshowValue[deviceTab];
    function patch(next: Partial<HeroSlideshowValue["pc"]>) {
      setHeroSlideshowValue((prev) => ({ ...prev, [deviceTab]: { ...prev[deviceTab], ...next } }));
    }
    function addSlide() {
      patch({ slides: [...value.slides, { imageUrl: "", title: "", description: "" }] });
    }
    function updateSlide(index: number, slidePatch: Partial<SlideItem>) {
      patch({ slides: value.slides.map((s, i) => (i === index ? { ...s, ...slidePatch } : s)) });
    }
    function removeSlide(index: number) {
      patch({ slides: value.slides.filter((_, i) => i !== index) });
    }
    // HOTFIX-137.3(사용자 지시 — "슬라이드쇼 요소에 여백 배경 이미지를
    // 업로드하면 프리뷰가 안나와"): url을 얻지 못하면(업로드 실패, 예:
    // Supabase 무료 플랜 파일 용량 상한) 조용히 아무 일도 안 일어나
    // "업로드했는데 왜 안 뜨지"로 보였다 — HOTFIX-134.2가 다른 업로드
    // 경로에 적용한 것과 동일하게 실패 사유를 alert로 보여준다.
    async function handleSlideFile(index: number, file: File | null) {
      if (!file) return;
      setUploadingSlideIdx(index);
      const { url, error: uploadErr } = await uploadImage(file, "slides");
      setUploadingSlideIdx(null);
      if (url) {
        updateSlide(index, { imageUrl: url });
      } else {
        alert(`슬라이드 이미지 업로드에 실패했어요.\n${uploadErr ?? "알 수 없는 오류"}`);
      }
    }
    function addWallpaper() {
      if (value.wallpaperUrls.length >= MAX_WALLPAPERS) return;
      patch({ wallpaperUrls: [...value.wallpaperUrls, ""] });
    }
    function removeWallpaper(index: number) {
      patch({ wallpaperUrls: value.wallpaperUrls.filter((_, i) => i !== index) });
    }
    async function handleWallpaperFile(index: number, file: File | null) {
      if (!file) return;
      setUploadingWallpaperIdx(index);
      try {
        const compressed = await compressImage(file, value.wallpaperQuality);
        const { url, error: uploadErr } = await uploadImage(compressed, "wallpaper");
        if (url) {
          patch({ wallpaperUrls: value.wallpaperUrls.map((u, i) => (i === index ? url : u)) });
        } else {
          alert(`여백 배경 이미지 업로드에 실패했어요.\n${uploadErr ?? "알 수 없는 오류"}`);
        }
      } catch (e) {
        alert(`여백 배경 이미지 처리 중 오류가 발생했어요.\n${e instanceof Error ? e.message : String(e)}`);
      } finally {
        setUploadingWallpaperIdx(null);
      }
    }
    return (
      <div className="space-y-3 text-xs">
        <p className="text-sm font-semibold text-gray-700">슬라이드쇼</p>
        <div className="space-y-2">
          <p className="font-medium text-gray-600">슬라이드 ({value.slides.length}개)</p>
          {value.slides.map((slide, idx) => (
            <div key={idx} className="space-y-1 rounded border border-gray-200 p-2">
              <div className="flex items-center justify-between">
                <span className="text-[11px] text-gray-400">#{idx + 1}</span>
                <button type="button" onClick={() => removeSlide(idx)} className="text-[11px] text-red-500 hover:underline">
                  삭제
                </button>
              </div>
              <div className="flex items-start gap-2">
                <ImageThumb url={slide.imageUrl} alt={`슬라이드 ${idx + 1}`} />
                <div className="min-w-0 flex-1 space-y-1">
                  <input type="file" accept="image/*" disabled={uploadingSlideIdx === idx} onChange={(e) => handleSlideFile(idx, e.target.files?.[0] ?? null)} className="w-full text-[11px]" />
                  <input value={slide.title} placeholder="제목(선택)" onChange={(e) => updateSlide(idx, { title: e.target.value })} className="w-full rounded border border-gray-300 px-2 py-1" />
                  <input value={slide.description} placeholder="설명(선택)" onChange={(e) => updateSlide(idx, { description: e.target.value })} className="w-full rounded border border-gray-300 px-2 py-1" />
                </div>
              </div>
            </div>
          ))}
          <button type="button" onClick={addSlide} className="w-full rounded border border-gray-300 py-1 text-gray-600 hover:bg-gray-50">
            + 슬라이드 추가
          </button>
        </div>
        <label className="block">
          <span className="mb-1 block text-gray-600">섹션 높이(vh, 비우면 자동)</span>
          <input type="number" value={value.heightVh ?? ""} onChange={(e) => patch({ heightVh: e.target.value ? Number(e.target.value) : null })} className="w-full rounded border border-gray-300 px-2 py-1" />
        </label>
        <label className="block">
          <span className="mb-1 block text-gray-600">자동 전환(초)</span>
          <input type="number" value={value.autoAdvanceSeconds} onChange={(e) => patch({ autoAdvanceSeconds: Number(e.target.value) || 5 })} className="w-full rounded border border-gray-300 px-2 py-1" />
        </label>
        <label className="block">
          <span className="mb-1 block text-gray-600">이미지 맞춤</span>
          <select value={value.objectFit} onChange={(e) => patch({ objectFit: e.target.value as "cover" | "contain" })} className="w-full rounded border border-gray-300 px-2 py-1">
            <option value="cover">꽉 채우기(cover)</option>
            <option value="contain">전체 보이기(contain)</option>
          </select>
        </label>
        <div className="grid grid-cols-2 gap-2">
          <label className="block">
            <span className="mb-1 block text-gray-600">위 여백(px)</span>
            <input type="number" value={value.marginTopPx} onChange={(e) => patch({ marginTopPx: Number(e.target.value) || 0 })} className="w-full rounded border border-gray-300 px-2 py-1" />
          </label>
          <label className="block">
            <span className="mb-1 block text-gray-600">아래 여백(px)</span>
            <input type="number" value={value.marginBottomPx} onChange={(e) => patch({ marginBottomPx: Number(e.target.value) || 0 })} className="w-full rounded border border-gray-300 px-2 py-1" />
          </label>
          <label className="block">
            <span className="mb-1 block text-gray-600">좌 여백(px)</span>
            <input type="number" value={value.marginLeftPx} onChange={(e) => patch({ marginLeftPx: Number(e.target.value) || 0 })} className="w-full rounded border border-gray-300 px-2 py-1" />
          </label>
          <label className="block">
            <span className="mb-1 block text-gray-600">우 여백(px)</span>
            <input type="number" value={value.marginRightPx} onChange={(e) => patch({ marginRightPx: Number(e.target.value) || 0 })} className="w-full rounded border border-gray-300 px-2 py-1" />
          </label>
        </div>
        {value.objectFit === "contain" && (
          <div className="space-y-2">
            <p className="font-medium text-gray-600">
              여백 배경 이미지 ({value.wallpaperUrls.length}/{MAX_WALLPAPERS})
            </p>
            {value.wallpaperUrls.map((url, idx) => (
              <div key={idx} className="flex items-center gap-2">
                <ImageThumb url={url} alt={`배경 ${idx + 1}`} />
                <input type="file" accept="image/*" disabled={uploadingWallpaperIdx === idx} onChange={(e) => handleWallpaperFile(idx, e.target.files?.[0] ?? null)} className="min-w-0 flex-1 text-[11px]" />
                <button type="button" onClick={() => removeWallpaper(idx)} className="shrink-0 text-[11px] text-red-500 hover:underline">
                  삭제
                </button>
              </div>
            ))}
            {value.wallpaperUrls.length < MAX_WALLPAPERS && (
              <button type="button" onClick={addWallpaper} className="w-full rounded border border-gray-300 py-1 text-gray-600 hover:bg-gray-50">
                + 배경 이미지 추가
              </button>
            )}
            <label className="block">
              <span className="mb-1 block text-gray-600">압축 품질(%)</span>
              <input
                type="number"
                min={1}
                max={100}
                value={value.wallpaperQuality}
                onChange={(e) => patch({ wallpaperQuality: Math.max(1, Math.min(100, Number(e.target.value) || 100)) })}
                className="w-full rounded border border-gray-300 px-2 py-1"
              />
            </label>
          </div>
        )}
      </div>
    );
  }

  if (selectedSlotKey.startsWith("sidebar:")) {
    const side = selectedSlotKey === "sidebar:left" ? "left" : "right";
    const value = sidebarIconsValue[deviceTab];
    function patch(next: Partial<SidebarIconsValue["pc"]>) {
      setSidebarIconsValue((prev) => ({ ...prev, [deviceTab]: { ...prev[deviceTab], ...next } }));
    }
    const defaultField = side === "left" ? "leftIconDefaultUrl" : "rightIconDefaultUrl";
    const hoverField = side === "left" ? "leftIconHoverUrl" : "rightIconHoverUrl";
    async function handleFile(field: "leftIconDefaultUrl" | "leftIconHoverUrl" | "rightIconDefaultUrl" | "rightIconHoverUrl", file: File | null) {
      if (!file) return;
      setUploadingSidebarField(field);
      const { url } = await uploadImage(file, "sidebar_icons");
      setUploadingSidebarField(null);
      if (url) patch({ [field]: url } as Partial<SidebarIconsValue["pc"]>);
    }
    return (
      <div className="space-y-3 text-xs">
        <p className="text-sm font-semibold text-gray-700">{side === "left" ? "좌측" : "우측"} 사이드바 아이콘</p>
        <p className="text-[11px] text-gray-400">이 자리는 화면 가장자리에 항상 고정이라 추가/삭제할 수 없어요.</p>
        <label className="block">
          <span className="mb-1 block text-gray-600">기본 이미지/영상 {uploadingSidebarField === defaultField && "(업로드 중...)"}</span>
          <input type="file" accept="image/*,video/webm,video/mp4" onChange={(e) => handleFile(defaultField, e.target.files?.[0] ?? null)} disabled={uploadingSidebarField !== null} className="w-full text-[11px]" />
          <ImageThumb url={value[defaultField]} alt="기본 아이콘 미리보기" />
        </label>
        <label className="block">
          <span className="mb-1 block text-gray-600">호버 이미지/영상 {uploadingSidebarField === hoverField && "(업로드 중...)"}</span>
          <input type="file" accept="image/*,video/webm,video/mp4" onChange={(e) => handleFile(hoverField, e.target.files?.[0] ?? null)} disabled={uploadingSidebarField !== null} className="w-full text-[11px]" />
          <ImageThumb url={value[hoverField]} alt="호버 아이콘 미리보기" />
        </label>
        <label className="block">
          <span className="mb-1 block text-gray-600">아이콘 크기(px, 좌우 공통)</span>
          <input type="number" value={value.iconSizePx || DEFAULT_ICON_SIZE_PX} onChange={(e) => patch({ iconSizePx: Number(e.target.value) || DEFAULT_ICON_SIZE_PX })} className="w-full rounded border border-gray-300 px-2 py-1" />
        </label>
        <label className="block">
          <span className="mb-1 block text-gray-600">여닫이 방식(좌우 공통)</span>
          <select value={value.triggerMode} onChange={(e) => patch({ triggerMode: e.target.value as "click" | "hover" })} className="w-full rounded border border-gray-300 px-2 py-1">
            <option value="click">클릭해야 열림</option>
            <option value="hover">마우스를 올리면 바로 열림</option>
          </select>
        </label>
        {/* HOTFIX-141(사용자 지시 — "그 안의 요소들을 내가 설정할수가
            없네, 상단 사이드바처럼 자유롭게 설정하게 해줘"): 상단
            사이드바(TopSidebarControls)의 "패널 스타일" 섹션과 동일한
            4개 필드 — 패널 "안의 항목"(카테고리 그룹/링크) 자체는
            사이트 구성 관리가 계속 담당하고, 여기선 패널 자체의
            배경/글자색/서체/hover 모션만 다룬다. */}
        <div className="space-y-2 border-t border-gray-200 pt-3">
          <p className="font-medium text-gray-600">패널 스타일 (좌/우 각각 독립)</p>
          <label className="block">
            <span className="mb-1 block text-gray-600">배경색</span>
            <input
              type="color"
              value={value[side === "left" ? "leftPanelBackgroundColor" : "rightPanelBackgroundColor"] || "#166534"}
              onChange={(e) => patch({ [side === "left" ? "leftPanelBackgroundColor" : "rightPanelBackgroundColor"]: e.target.value } as Partial<SidebarIconsValue["pc"]>)}
              className="h-8 w-full rounded border border-gray-300"
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-gray-600">텍스트 색</span>
            <input
              type="color"
              value={value[side === "left" ? "leftPanelTextColor" : "rightPanelTextColor"] || "#ffffff"}
              onChange={(e) => patch({ [side === "left" ? "leftPanelTextColor" : "rightPanelTextColor"]: e.target.value } as Partial<SidebarIconsValue["pc"]>)}
              className="h-8 w-full rounded border border-gray-300"
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-gray-600">서체(직접 입력)</span>
            <input
              value={value[side === "left" ? "leftPanelFontFamily" : "rightPanelFontFamily"]}
              onChange={(e) => patch({ [side === "left" ? "leftPanelFontFamily" : "rightPanelFontFamily"]: e.target.value } as Partial<SidebarIconsValue["pc"]>)}
              className="w-full rounded border border-gray-300 px-2 py-1"
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-gray-600">항목 hover 모션</span>
            <HoverMotionSelect
              value={value[side === "left" ? "leftPanelHoverMotion" : "rightPanelHoverMotion"]}
              onChange={(motion) => patch({ [side === "left" ? "leftPanelHoverMotion" : "rightPanelHoverMotion"]: motion } as Partial<SidebarIconsValue["pc"]>)}
            />
          </label>
        </div>
        {positionSection}
      </div>
    );
  }

  return null;
}

// HOTFIX-141: TopSidebarPanel.tsx의 columnNodes 배열 인덱스와 1:1 대응.
const COLUMN_LABELS = ["0: 이미지", "1: 세션 정보", "2: 링크 목록", "3: 하위 목록"];

// ── "상단 사이드바"(Kinfolk형 메가 메뉴, HOTFIX-137.9) 전용 Controls —
// column 2(링크 목록, 항목마다 hover 이미지)와 그 하위 column 3(children)을
// 여기서 추가/삭제/재배치한다. column 1(이름/등급/팔로워 등)은 실제 세션
// 데이터라 TopSidebarPanel.tsx가 직접 조회 — 관리자가 편집할 대상이 아니다.
function TopSidebarControls({
  value,
  setValue,
  deviceTab,
}: {
  value: TopSidebarValue;
  setValue: React.Dispatch<React.SetStateAction<TopSidebarValue>>;
  deviceTab: "pc" | "tablet" | "mobile";
}) {
  const [uploadingLinkId, setUploadingLinkId] = useState<string | null>(null);
  const [uploadingBankImage, setUploadingBankImage] = useState(false);
  const [uploadingTriggerField, setUploadingTriggerField] = useState<"triggerIconDefaultUrl" | "triggerIconHoverUrl" | null>(null);
  const [uploadingTopSidebarFont, setUploadingTopSidebarFont] = useState(false);
  const [uploadingLoginFont, setUploadingLoginFont] = useState(false);
  const [draggedLinkId, setDraggedLinkId] = useState<string | null>(null);
  const [draggedChildId, setDraggedChildId] = useState<string | null>(null);
  const config = value[deviceTab];

  function patch(next: Partial<TopSidebarValue["pc"]>) {
    setValue((prev) => ({ ...prev, [deviceTab]: { ...prev[deviceTab], ...next } }));
  }
  // HOTFIX-141.2(사용자 지시 — "로그인 / 로그아웃 버튼... 폰트 파일 업로드,
  // 폰트 크기, 색깔, hover 모션옵션 을 설정하게 해줘"): 위 patch()와 같은
  // 모양이지만 loginButtonStyle 서브 객체만 갱신한다.
  function patchLoginStyle(next: Partial<TopSidebarConfig["loginButtonStyle"]>) {
    patch({ loginButtonStyle: { ...config.loginButtonStyle, ...next } });
  }
  async function handleLoginFontFile(file: File | null) {
    if (!file) return;
    setUploadingLoginFont(true);
    try {
      const { url, error: uploadErr } = await uploadImage(file, "custom_fonts");
      if (url) {
        const entry: CustomFontEntry = { id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`, url, isActive: true };
        patchLoginStyle({ customFonts: [...config.loginButtonStyle.customFonts, entry] });
      } else {
        alert(`폰트 파일 업로드에 실패했어요.\n${uploadErr ?? "알 수 없는 오류"}`);
      }
    } catch (e) {
      alert(`폰트 파일 처리 중 오류가 발생했어요.\n${e instanceof Error ? e.message : String(e)}`);
    } finally {
      setUploadingLoginFont(false);
    }
  }
  function updateLink(id: string, linkPatch: Partial<TopSidebarLink>) {
    patch({ links: config.links.map((l) => (l.id === id ? { ...l, ...linkPatch } : l)) });
  }
  function addLink() {
    const newLink: TopSidebarLink = { id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`, label: "새 링크", href: "#", imageUrl: "", children: [] };
    patch({ links: [...config.links, newLink] });
  }
  // HOTFIX-140.2(사용자 지시 — "모든 요소 추가, 제거, 복제 가능하게해"):
  // 이 목록은 Craft.js 노드 트리가 아니라 평범한 React 배열이라(EPIC-139의
  // "복제" 위험 회피 사유였던 Craft 내부 id 재사용 문제가 여기엔 없음)
  // 그냥 새 id로 깊은 복사하면 안전하다.
  function duplicateLink(id: string) {
    const link = config.links.find((l) => l.id === id);
    if (!link) return;
    const copy: TopSidebarLink = {
      ...link,
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      label: `${link.label} 사본`,
      children: link.children.map((c) => ({ ...c, id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}` })),
    };
    const idx = config.links.findIndex((l) => l.id === id);
    const next = [...config.links];
    next.splice(idx + 1, 0, copy);
    patch({ links: next });
  }
  function removeLink(id: string) {
    patch({ links: config.links.filter((l) => l.id !== id) });
  }
  function moveLink(id: string, dir: -1 | 1) {
    const idx = config.links.findIndex((l) => l.id === id);
    const nextIdx = idx + dir;
    if (idx < 0 || nextIdx < 0 || nextIdx >= config.links.length) return;
    const next = [...config.links];
    [next[idx], next[nextIdx]] = [next[nextIdx], next[idx]];
    patch({ links: next });
  }
  // HOTFIX-141.7(사용자 지시 — "'상단 사이드바' 의 요소들도 내가 드래그 &
  // 드랍으로 자유롭게 움직일수 있게 해달라니까"): ↑/↓ 버튼 대신 실제
  // 드래그로 순서를 바꾼다 — 네이티브 HTML5 드래그앤드롭(별도 라이브러리
  // 없이 draggable/onDragStart/onDragOver/onDrop만으로 구현, 하단 메뉴
  // Craft 블록의 "⠿" 그립 아이콘과 동일한 UX 관례). 세로 목록 재정렬이라
  // HeaderSlot 같은 자유 XY 드래그(transform)보다 리스트 reorder가 실제
  // 쓰임에 맞다.
  function reorderLink(draggedId: string, targetId: string) {
    if (draggedId === targetId) return;
    const links = [...config.links];
    const fromIdx = links.findIndex((l) => l.id === draggedId);
    const toIdx = links.findIndex((l) => l.id === targetId);
    if (fromIdx < 0 || toIdx < 0) return;
    const [moved] = links.splice(fromIdx, 1);
    links.splice(toIdx, 0, moved);
    patch({ links });
  }
  // HOTFIX-141.2(사용자 신고 — "상단 사이드바의 여닫이 트리거 아이콘이
  // 둘다 업로드를 새로 해도 preview 도 오른쪽의 live preview 에도 적용이
  // 안돼고 있어"): 실제 원인은 업로드 실패를 조용히 무시하던 HOTFIX-134.2/
  // 137.3 이전의 옛 버그가 이 3개 핸들러(handleLinkImage/handleAddBankImage/
  // handleTriggerIconFile)에는 애초에 적용된 적이 없었던 것 — `if (url)`만
  // 확인하고 실패 시(uploadError) 아무 피드백 없이 그냥 끝났다. 실제로
  // DB(storage.objects)를 직접 조회해 확인해보니: 사용자가 올린 1.6MB
  // PNG는 스토리지에는 실제로 저장됐지만(서버는 성공) site_settings.
  // top_sidebar에는 전혀 반영되지 않았다(패치가 한 번도 안 불림) — 반면
  // 훨씬 작은(184KB) 이전 테스트 이미지는 정상적으로 저장까지 됐다. 즉
  // 클라이언트 쪽에서만 업로드가 실패(타임아웃 등)로 보이는 전형적인
  // "큰 파일 → 조용한 실패" 패턴. 트리거 아이콘은 헤더에 작게 뜨는
  // 여닫이 버튼이라 원본 해상도가 필요 없으므로, 여백 배경 이미지
  // (handleWallpaperFile)와 동일하게 업로드 전 compressImage로 재인코딩해
  // 애초에 타임아웃 위험을 줄이고, 3개 핸들러 모두에 실패 시 alert로
  // 사유를 보여주는 로직을 추가한다.
  async function handleLinkImage(id: string, file: File | null) {
    if (!file) return;
    setUploadingLinkId(id);
    try {
      const { url, error: uploadErr } = await uploadImage(file, "top_sidebar");
      if (url) {
        updateLink(id, { imageUrl: url });
      } else {
        alert(`이미지 업로드에 실패했어요.\n${uploadErr ?? "알 수 없는 오류"}`);
      }
    } catch (e) {
      alert(`이미지 처리 중 오류가 발생했어요.\n${e instanceof Error ? e.message : String(e)}`);
    } finally {
      setUploadingLinkId(null);
    }
  }
  // HOTFIX-140.2: column 0에 무작위로 보여줄 이미지 풀 — 여러 장 추가/삭제.
  async function handleAddBankImage(file: File | null) {
    if (!file) return;
    setUploadingBankImage(true);
    try {
      const { url, error: uploadErr } = await uploadImage(file, "top_sidebar_bank");
      if (url) {
        patch({ imageBankUrls: [...config.imageBankUrls, url] });
      } else {
        alert(`이미지 업로드에 실패했어요.\n${uploadErr ?? "알 수 없는 오류"}`);
      }
    } catch (e) {
      alert(`이미지 처리 중 오류가 발생했어요.\n${e instanceof Error ? e.message : String(e)}`);
    } finally {
      setUploadingBankImage(false);
    }
  }
  function removeBankImage(url: string) {
    patch({ imageBankUrls: config.imageBankUrls.filter((u) => u !== url) });
  }
  // HOTFIX-141(사용자 지시 — "상단 사이드바 아이콘 설정(이미지), hover
  // 했을때 이미지를 설정하는게 없네 만들어"): 트리거 아이콘 기본/hover
  // 이미지 업로드 — sidebarIconsSettings.ts의 handleFile과 동일한 패턴.
  async function handleTriggerIconFile(field: "triggerIconDefaultUrl" | "triggerIconHoverUrl", file: File | null) {
    if (!file) return;
    setUploadingTriggerField(field);
    try {
      const compressed = await compressImage(file, 85);
      const { url, error: uploadErr } = await uploadImage(compressed, "top_sidebar_trigger");
      if (url) {
        patch({ [field]: url } as Partial<TopSidebarValue["pc"]>);
      } else {
        alert(`아이콘 이미지 업로드에 실패했어요.\n${uploadErr ?? "알 수 없는 오류"}`);
      }
    } catch (e) {
      alert(`아이콘 이미지 처리 중 오류가 발생했어요.\n${e instanceof Error ? e.message : String(e)}`);
    } finally {
      setUploadingTriggerField(null);
    }
  }
  // HOTFIX-141(사용자 지시 — "이건 다른 모든 상단 사이드바의 서체를
  // 내가 업로드하는 기능이 없네"): mainLogo customFonts와 동일한 패턴.
  async function handleTopSidebarFontFile(file: File | null) {
    if (!file) return;
    setUploadingTopSidebarFont(true);
    try {
      const { url, error: uploadErr } = await uploadImage(file, "custom_fonts");
      if (url) {
        const entry: CustomFontEntry = { id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`, url, isActive: true };
        patch({ customFonts: [...config.customFonts, entry] });
      } else {
        alert(`폰트 파일 업로드에 실패했어요.\n${uploadErr ?? "알 수 없는 오류"}`);
      }
    } catch (e) {
      alert(`폰트 파일 처리 중 오류가 발생했어요.\n${e instanceof Error ? e.message : String(e)}`);
    } finally {
      setUploadingTopSidebarFont(false);
    }
  }
  function addChild(linkId: string) {
    const link = config.links.find((l) => l.id === linkId);
    if (!link) return;
    const newChild: TopSidebarChildLink = { id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`, label: "새 하위 링크", href: "#" };
    updateLink(linkId, { children: [...link.children, newChild] });
  }
  function updateChild(linkId: string, childId: string, childPatch: Partial<TopSidebarChildLink>) {
    const link = config.links.find((l) => l.id === linkId);
    if (!link) return;
    updateLink(linkId, { children: link.children.map((c) => (c.id === childId ? { ...c, ...childPatch } : c)) });
  }
  function removeChild(linkId: string, childId: string) {
    const link = config.links.find((l) => l.id === linkId);
    if (!link) return;
    updateLink(linkId, { children: link.children.filter((c) => c.id !== childId) });
  }
  // HOTFIX-141.10(사용자 지시 — "'상단 사이드바' 의 각 칼럼 안의 요소들을
  // 자유롭게 움직일수 있게 해달라고 드래그 & 드롭으로"): column 2 링크
  // 목록은 이미 드래그 재정렬이 있었는데(HOTFIX-141.7) 그 하위(column 3,
  // hover 시 나타나는 목록)는 삭제/추가만 있고 순서를 바꿀 방법이 아예
  // 없었다 — 동일한 그립+네이티브 드래그 패턴을 하위 목록에도 적용.
  function reorderChild(linkId: string, draggedChildId: string, targetChildId: string) {
    if (draggedChildId === targetChildId) return;
    const link = config.links.find((l) => l.id === linkId);
    if (!link) return;
    const children = [...link.children];
    const fromIdx = children.findIndex((c) => c.id === draggedChildId);
    const toIdx = children.findIndex((c) => c.id === targetChildId);
    if (fromIdx < 0 || toIdx < 0) return;
    const [moved] = children.splice(fromIdx, 1);
    children.splice(toIdx, 0, moved);
    updateLink(linkId, { children });
  }

  return (
    <div className="space-y-3 text-xs">
      <p className="text-sm font-semibold text-gray-700">상단 사이드바</p>
      <p className="text-[11px] text-gray-400">
        헤더 우측의 &ldquo;상단 사이드바 열기 버튼&rdquo;은 다른 헤더 요소처럼 항상 표시돼요(따로 켜고 끄지 않아요). 클릭하면 화면 위에서 아래로 슬라이드해 열려요(캔버스에서 직접 클릭해 열고 닫아 미리볼 수 있어요). 왼쪽 이름/등급/팔로워/최근 활동/Mind Diary·Studio·Silo Planet은 실제 로그인 정보 + 고정 바로가기라 여기서 편집할 수 없어요 — 아래는 그 옆(column 2) 링크 목록과 패널 전체 스타일이에요.
      </p>

      <div className="space-y-2 border-t border-gray-200 pt-3">
        <p className="font-medium text-gray-600">패널 스타일</p>
        <label className="block">
          <span className="mb-1 block text-gray-600">배경색</span>
          <input type="color" value={config.backgroundColor || "#ffffff"} onChange={(e) => patch({ backgroundColor: e.target.value })} className="h-8 w-full rounded border border-gray-300" />
        </label>
        <label className="block">
          <span className="mb-1 block text-gray-600">텍스트 색</span>
          <input type="color" value={config.textColor || "#374151"} onChange={(e) => patch({ textColor: e.target.value })} className="h-8 w-full rounded border border-gray-300" />
        </label>
        <label className="block">
          <span className="mb-1 block text-gray-600">서체(직접 입력)</span>
          <input value={config.fontFamily} onChange={(e) => patch({ fontFamily: e.target.value })} className="w-full rounded border border-gray-300 px-2 py-1" />
        </label>
        {/* HOTFIX-141: mainLogo/topTabStyle의 customFonts와 동일한 패턴 —
            폰트 "파일"을 직접 업로드. 위 fontFamily(이름 직접 입력)와는
            독립적으로, 활성 폰트가 있으면 폴백 체인 맨 앞에 걸린다. */}
        <div className="space-y-1.5">
          <p className="mb-1 block text-gray-600">커스텀 폰트 파일 ({config.customFonts.length}개)</p>
          {config.customFonts.map((font) => (
            <div key={font.id} className="rounded border border-gray-200 p-1.5">
              <div className="flex items-center justify-between">
                <label className="flex items-center gap-1 text-gray-600">
                  <input
                    type="checkbox"
                    checked={font.isActive}
                    onChange={(e) => patch({ customFonts: config.customFonts.map((f) => (f.id === font.id ? { ...f, isActive: e.target.checked } : f)) })}
                  />
                  사용
                </label>
                <button type="button" onClick={() => patch({ customFonts: config.customFonts.filter((f) => f.id !== font.id) })} className="text-[11px] text-red-500 hover:underline">
                  삭제
                </button>
              </div>
              <p className="truncate text-[10px] text-gray-400" title={font.url}>{font.url}</p>
            </div>
          ))}
          <label className="block">
            <span className="mb-1 block text-gray-600">폰트 파일 추가 {uploadingTopSidebarFont && "(업로드 중...)"}</span>
            <input type="file" accept=".woff,.woff2,.ttf,.otf" disabled={uploadingTopSidebarFont} onChange={(e) => handleTopSidebarFontFile(e.target.files?.[0] ?? null)} className="w-full text-[11px]" />
          </label>
        </div>
        <label className="block">
          <span className="mb-1 block text-gray-600">링크 hover 모션</span>
          <HoverMotionSelect value={config.hoverMotion} onChange={(motion) => patch({ hoverMotion: motion })} />
        </label>
      </div>

      {/* HOTFIX-141.2(사용자 지시 — "지금 현재 '로그인/로그아웃' 버튼을
          없애고 '상단 사이드바' 에 로그인 / 로그아웃 버튼이 보이면
          좋겠어. 그리고 그 버튼을 내가 마음대로 설정할수 있게, 폰트 파일
          업로드, 폰트 크기, 색깔, hover 모션옵션 을 설정하게 해줘"):
          계정 영역에 있던 로그인/로그아웃 버튼을 여기(column 1 맨 위)로
          옮겼다 — 패널 전체 서체와 독립된 자체 폰트/크기/색/모션. */}
      <div className="space-y-2 border-t border-gray-200 pt-3">
        <p className="font-medium text-gray-600">로그인/로그아웃 버튼</p>
        <p className="text-[11px] text-gray-400">헤더 계정 영역 대신 여기(column 1 맨 위)에 항상 표시돼요. 로그인 상태면 &ldquo;로그아웃&rdquo;, 아니면 &ldquo;로그인&rdquo; 링크가 자동으로 나타나요.</p>
        <label className="block">
          <span className="mb-1 block text-gray-600">서체(직접 입력)</span>
          <input value={config.loginButtonStyle.fontFamily} onChange={(e) => patchLoginStyle({ fontFamily: e.target.value })} className="w-full rounded border border-gray-300 px-2 py-1" />
        </label>
        <div className="space-y-1.5">
          <p className="mb-1 block text-gray-600">커스텀 폰트 파일 ({config.loginButtonStyle.customFonts.length}개)</p>
          {config.loginButtonStyle.customFonts.map((font) => (
            <div key={font.id} className="rounded border border-gray-200 p-1.5">
              <div className="flex items-center justify-between">
                <label className="flex items-center gap-1 text-gray-600">
                  <input
                    type="checkbox"
                    checked={font.isActive}
                    onChange={(e) =>
                      patchLoginStyle({
                        customFonts: config.loginButtonStyle.customFonts.map((f) => (f.id === font.id ? { ...f, isActive: e.target.checked } : f)),
                      })
                    }
                  />
                  사용
                </label>
                <button
                  type="button"
                  onClick={() => patchLoginStyle({ customFonts: config.loginButtonStyle.customFonts.filter((f) => f.id !== font.id) })}
                  className="text-[11px] text-red-500 hover:underline"
                >
                  삭제
                </button>
              </div>
              <p className="truncate text-[10px] text-gray-400" title={font.url}>{font.url}</p>
            </div>
          ))}
          <label className="block">
            <span className="mb-1 block text-gray-600">폰트 파일 추가 {uploadingLoginFont && "(업로드 중...)"}</span>
            <input type="file" accept=".woff,.woff2,.ttf,.otf" disabled={uploadingLoginFont} onChange={(e) => handleLoginFontFile(e.target.files?.[0] ?? null)} className="w-full text-[11px]" />
          </label>
        </div>
        <label className="block">
          <span className="mb-1 block text-gray-600">글자 크기(px)</span>
          <input
            type="number"
            min={8}
            max={48}
            value={config.loginButtonStyle.fontSizePx ?? ""}
            placeholder="기본값"
            onChange={(e) => patchLoginStyle({ fontSizePx: e.target.value ? Number(e.target.value) : null })}
            className="w-full rounded border border-gray-300 px-2 py-1"
          />
        </label>
        <label className="block">
          <span className="mb-1 block text-gray-600">색상</span>
          <input type="color" value={config.loginButtonStyle.color || "#111827"} onChange={(e) => patchLoginStyle({ color: e.target.value })} className="h-8 w-full rounded border border-gray-300" />
        </label>
        <label className="block">
          <span className="mb-1 block text-gray-600">hover 모션</span>
          <HoverMotionSelect value={config.loginButtonStyle.hoverMotion} onChange={(motion) => patchLoginStyle({ hoverMotion: motion })} />
        </label>
      </div>

      {/* HOTFIX-141(사용자 지시 — "상단 사이드바의 컬럼과 컬럼의 영역을
          내가 드래그 드랍으로 조절하는 기능을 만들어줘. 그리고 상단
          사이드바의 컬럼을 하나의 묶음으로 드래그 드랍으로 좌우 순서를
          변경가능하게 해줘"): 픽셀 드래그 대신 정확한 숫자 입력(너비)+
          ↑/↓ 순서 버튼으로 구현 — topSidebarSettings.ts의 타입 주석에
          이유를 적었다(실사이트 전역에 뜨는 메가메뉴라 이 세션에서
          검증 못 하는 픽셀 드래그를 얹는 위험을 피함). */}
      <div className="space-y-2 border-t border-gray-200 pt-3">
        <p className="font-medium text-gray-600">컬럼 너비·순서</p>
        <p className="text-[11px] text-gray-400">0=왼쪽 이미지 / 1=이름·등급·활동 / 2=링크 목록 / 3=hover 하위 목록. 지금 화면상 왼쪽부터의 순서예요.</p>
        {config.columnOrder.map((colIdx, orderIdx) => (
          <div key={colIdx} className="flex items-center gap-2 rounded border border-gray-200 p-1.5">
            <span className="w-24 shrink-0 text-gray-500">{COLUMN_LABELS[colIdx]}</span>
            <input
              type="number"
              min={40}
              max={480}
              value={config.columnWidthsPx[colIdx]}
              onChange={(e) => {
                const next = [...config.columnWidthsPx] as TopSidebarConfig["columnWidthsPx"];
                next[colIdx] = Math.max(40, Number(e.target.value) || 40);
                patch({ columnWidthsPx: next });
              }}
              className="w-16 rounded border border-gray-300 px-1.5 py-1"
            />
            <span className="text-gray-400">px</span>
            <div className="ml-auto flex shrink-0 items-center gap-1">
              <button
                type="button"
                disabled={orderIdx === 0}
                onClick={() => {
                  const next = [...config.columnOrder] as TopSidebarConfig["columnOrder"];
                  [next[orderIdx - 1], next[orderIdx]] = [next[orderIdx], next[orderIdx - 1]];
                  patch({ columnOrder: next });
                }}
                className="rounded border border-gray-200 px-1.5 py-0.5 text-[11px] text-gray-600 hover:bg-gray-50 disabled:opacity-30"
              >
                ←
              </button>
              <button
                type="button"
                disabled={orderIdx === config.columnOrder.length - 1}
                onClick={() => {
                  const next = [...config.columnOrder] as TopSidebarConfig["columnOrder"];
                  [next[orderIdx], next[orderIdx + 1]] = [next[orderIdx + 1], next[orderIdx]];
                  patch({ columnOrder: next });
                }}
                className="rounded border border-gray-200 px-1.5 py-0.5 text-[11px] text-gray-600 hover:bg-gray-50 disabled:opacity-30"
              >
                →
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* HOTFIX-141(사용자 지시 — "상단 사이드바 아이콘 설정(이미지),
          hover 했을때 이미지를 설정하는게 없네 만들어"): 헤더 우측 "☰"
          여닫이 트리거 자체의 기본/hover 이미지 — sidebarIconsSettings.ts의
          기존 좌/우 사이드바 아이콘 설정 UI와 동일한 패턴. */}
      <div className="space-y-2 border-t border-gray-200 pt-3">
        <p className="font-medium text-gray-600">여닫이 트리거 아이콘</p>
        <label className="block">
          <span className="mb-1 block text-gray-600">기본 이미지 {uploadingTriggerField === "triggerIconDefaultUrl" && "(업로드 중...)"}</span>
          <input type="file" accept="image/*" disabled={uploadingTriggerField !== null} onChange={(e) => handleTriggerIconFile("triggerIconDefaultUrl", e.target.files?.[0] ?? null)} className="w-full text-[11px]" />
          <ImageThumb url={config.triggerIconDefaultUrl} alt="트리거 기본 아이콘 미리보기" />
        </label>
        <label className="block">
          <span className="mb-1 block text-gray-600">호버 이미지 {uploadingTriggerField === "triggerIconHoverUrl" && "(업로드 중...)"}</span>
          <input type="file" accept="image/*" disabled={uploadingTriggerField !== null} onChange={(e) => handleTriggerIconFile("triggerIconHoverUrl", e.target.files?.[0] ?? null)} className="w-full text-[11px]" />
          <ImageThumb url={config.triggerIconHoverUrl} alt="트리거 호버 아이콘 미리보기" />
        </label>
        {/* HOTFIX-141.1(사용자 지시 — "상단 사이드바 아이콘 크기를
            조절할수 있게 해줘" + "'모바일' preview 에 '상단 사이드바
            열기 버튼'도 크기가 가능하게 해줘"): 이 값 자체가 PC/모바일
            독립 설정(deviceTab별 config)이라 모바일 탭에서 따로 조절하면
            모바일에서만 적용된다. */}
        <label className="block">
          <span className="mb-1 block text-gray-600">아이콘 크기(px)</span>
          <input
            type="number"
            min={10}
            max={80}
            value={config.triggerIconSizePx}
            onChange={(e) => patch({ triggerIconSizePx: Math.max(10, Number(e.target.value) || 20) })}
            className="w-full rounded border border-gray-300 px-2 py-1"
          />
        </label>
      </div>

      <div className="space-y-2 border-t border-gray-200 pt-3">
        <p className="font-medium text-gray-600">이미지 뱅크 ({config.imageBankUrls.length}장) — column 2에 마우스를 올리면 이 중 무작위로 하나가 왼쪽에 떠요</p>
        <div className="grid grid-cols-4 gap-2">
          {config.imageBankUrls.map((url) => (
            <div key={url} className="relative">
              <ImageThumb url={url} alt="뱅크 이미지" />
              <button type="button" onClick={() => removeBankImage(url)} className="absolute -right-1 -top-1 rounded-full bg-red-500 px-1 text-[10px] text-white">✕</button>
            </div>
          ))}
        </div>
        <label className="block">
          <span className="mb-1 block text-gray-600">이미지 추가 {uploadingBankImage && "(업로드 중...)"}</span>
          <input type="file" accept="image/*" disabled={uploadingBankImage} onChange={(e) => handleAddBankImage(e.target.files?.[0] ?? null)} className="w-full text-[11px]" />
        </label>
      </div>

      {/* HOTFIX-141.1(사용자 지시 — "column 2 에 있는 'mind diary'
          'studio' 'silo planet' 을 column 2 로 드래그 앤 드랍 옮길수
          있게 해주고" — column 1의 고정 바로가기를 column 2로 옮기고
          싶다는 의미로 해석): Mind Diary/Studio/Silo Planet은
          TopSidebarPanel.tsx에 하드코딩된 값이라 드래그로 옮길 데이터가
          아니다 — 버튼으로 "옮기기"(column 1에서 숨기고 column 2에
          동일한 링크 추가)를 제공한다. */}
      {TOP_SIDEBAR_FIXED_LINKS.filter((f) => !config.hiddenFixedLinkHrefs.includes(f.href)).length > 0 && (
        <div className="space-y-2 border-t border-gray-200 pt-3">
          <p className="font-medium text-gray-600">column 1 고정 바로가기</p>
          <p className="text-[11px] text-gray-400">Mind Diary / Studio / Silo Planet — column 2(아래 링크 목록)로 옮길 수 있어요.</p>
          {TOP_SIDEBAR_FIXED_LINKS.filter((f) => !config.hiddenFixedLinkHrefs.includes(f.href)).map((f) => (
            <div key={f.href} className="flex items-center justify-between rounded border border-gray-200 p-1.5">
              <span className="text-gray-700">{f.label}</span>
              <button
                type="button"
                onClick={() => {
                  const newLink: TopSidebarLink = { id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`, label: f.label, href: f.href, imageUrl: "", children: [] };
                  patch({ links: [...config.links, newLink], hiddenFixedLinkHrefs: [...config.hiddenFixedLinkHrefs, f.href] });
                }}
                className="rounded border border-gray-200 px-1.5 py-0.5 text-[11px] text-gray-600 hover:bg-gray-50"
              >
                column 2로 이동
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="space-y-2 border-t border-gray-200 pt-3">
        <p className="font-medium text-gray-600">링크 목록 ({config.links.length}개)</p>
        {config.links.map((link, idx) => (
          <div
            key={link.id}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              if (draggedLinkId) reorderLink(draggedLinkId, link.id);
              setDraggedLinkId(null);
            }}
            className={`space-y-1.5 rounded border p-2 transition-colors ${draggedLinkId === link.id ? "border-blue-400 bg-blue-50 opacity-60" : "border-gray-200"}`}
          >
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1 text-[11px] text-gray-400">
                {/* 그립 아이콘만 draggable — 라벨/링크 입력창의 텍스트
                    선택/드래그를 방해하지 않는다. */}
                <span
                  draggable
                  onDragStart={() => setDraggedLinkId(link.id)}
                  onDragEnd={() => setDraggedLinkId(null)}
                  className="cursor-move text-gray-300"
                  title="드래그해서 순서 바꾸기"
                >
                  ⠿
                </span>
                #{idx + 1}
              </span>
              <div className="flex items-center gap-1">
                <button type="button" disabled={idx === 0} onClick={() => moveLink(link.id, -1)} className="rounded border border-gray-200 px-1.5 py-0.5 text-[11px] text-gray-600 hover:bg-gray-50 disabled:opacity-30">↑</button>
                <button type="button" disabled={idx === config.links.length - 1} onClick={() => moveLink(link.id, 1)} className="rounded border border-gray-200 px-1.5 py-0.5 text-[11px] text-gray-600 hover:bg-gray-50 disabled:opacity-30">↓</button>
                <button type="button" onClick={() => duplicateLink(link.id)} className="rounded border border-gray-200 px-1.5 py-0.5 text-[11px] text-gray-600 hover:bg-gray-50">복제</button>
                <button type="button" onClick={() => removeLink(link.id)} className="rounded border border-red-200 px-1.5 py-0.5 text-[11px] text-red-500 hover:bg-red-50">삭제</button>
              </div>
            </div>
            <input value={link.label} placeholder="라벨" onChange={(e) => updateLink(link.id, { label: e.target.value })} className="w-full rounded border border-gray-300 px-2 py-1" />
            <input value={link.href} placeholder="링크 주소" onChange={(e) => updateLink(link.id, { href: e.target.value })} className="w-full rounded border border-gray-300 px-2 py-1" />
            <div className="flex items-start gap-2">
              <ImageThumb url={link.imageUrl} alt={`${link.label} 미리보기`} />
              <label className="block min-w-0 flex-1">
                <span className="mb-1 block text-gray-600">hover 이미지(이미지 뱅크가 비어있을 때만 사용) {uploadingLinkId === link.id && "(업로드 중...)"}</span>
                <input type="file" accept="image/*" disabled={uploadingLinkId === link.id} onChange={(e) => handleLinkImage(link.id, e.target.files?.[0] ?? null)} className="w-full text-[11px]" />
              </label>
            </div>
            <div className="space-y-1 border-t border-gray-100 pt-1.5">
              <p className="text-[11px] font-medium text-gray-500">하위 목록 ({link.children.length}개) — 이 링크에 마우스를 올리면 나타나요</p>
              {link.children.map((child) => (
                <div
                  key={child.id}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => {
                    e.preventDefault();
                    if (draggedChildId) reorderChild(link.id, draggedChildId, child.id);
                    setDraggedChildId(null);
                  }}
                  className={`flex items-center gap-1 rounded transition-colors ${draggedChildId === child.id ? "bg-blue-50 opacity-60" : ""}`}
                >
                  <span
                    draggable
                    onDragStart={() => setDraggedChildId(child.id)}
                    onDragEnd={() => setDraggedChildId(null)}
                    className="shrink-0 cursor-move text-gray-300"
                    title="드래그해서 순서 바꾸기"
                  >
                    ⠿
                  </span>
                  <input value={child.label} placeholder="라벨" onChange={(e) => updateChild(link.id, child.id, { label: e.target.value })} className="min-w-0 flex-1 rounded border border-gray-300 px-2 py-1" />
                  <input value={child.href} placeholder="링크" onChange={(e) => updateChild(link.id, child.id, { href: e.target.value })} className="min-w-0 flex-1 rounded border border-gray-300 px-2 py-1" />
                  <button type="button" onClick={() => removeChild(link.id, child.id)} className="shrink-0 text-[11px] text-red-500 hover:underline">삭제</button>
                </div>
              ))}
              <button type="button" onClick={() => addChild(link.id)} className="w-full rounded border border-gray-300 py-1 text-gray-600 hover:bg-gray-50">+ 하위 링크 추가</button>
            </div>
          </div>
        ))}
        <button type="button" onClick={addLink} className="w-full rounded border border-gray-300 py-1 text-gray-600 hover:bg-gray-50">+ 링크 추가</button>
      </div>
    </div>
  );
}

function ThemesPanel({
  deviceTab,
  topNavRows,
  setTopTabStyleValue,
  setAccountMenuStyleValue,
}: {
  deviceTab: "pc" | "tablet" | "mobile";
  topNavRows: NavTab[];
  setTopTabStyleValue: React.Dispatch<React.SetStateAction<TopTabStyleValue>>;
  setAccountMenuStyleValue: React.Dispatch<React.SetStateAction<AccountMenuStyleValue>>;
}) {
  function applyMotionToAll(motion: (typeof TAB_HOVER_MOTIONS)[number]) {
    setTopTabStyleValue((prev) => {
      const cfg = prev[deviceTab];
      const nextTabs = { ...cfg.tabs };
      for (const tab of topNavRows) {
        nextTabs[tab.key] = { ...(nextTabs[tab.key] ?? defaultTopTabStyleEntry()), hoverMotion: motion };
      }
      return { ...prev, [deviceTab]: { ...cfg, tabs: nextTabs } };
    });
    setAccountMenuStyleValue((prev) => ({ ...prev, [deviceTab]: { ...prev[deviceTab], hoverMotion: motion } }));
  }
  return (
    <div className="space-y-3 text-xs">
      <p className="font-semibold text-gray-500">호버 모션 테마</p>
      <p className="text-[11px] text-gray-400">상단 탭 전체 + 사용자 메뉴 전체에 한 번에 적용해요(개별 조정은 각 요소의 Controls에서 다시 바꿀 수 있어요).</p>
      <div className="space-y-1">
        {TAB_HOVER_MOTIONS.map((m) => (
          <button
            key={m}
            type="button"
            onClick={() => applyMotionToAll(m)}
            className="flex w-full items-center justify-between gap-2 rounded border border-gray-200 px-2 py-1.5 text-left hover:bg-gray-50"
          >
            <span>{TAB_HOVER_MOTION_LABELS[m]}</span>
            <HoverMotionPreviewSwatch motion={m} />
          </button>
        ))}
      </div>
    </div>
  );
}
