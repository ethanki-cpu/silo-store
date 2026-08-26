"use client";

// EPIC-099(항목 3, Phase 2): CraftHomeEditor.tsx의 일반화 버전 — 제목/
// resolver/defaultTree/"+ 섹션 추가" 후보 목록을 파라미터로 받아 어떤 Craft
// 페이지든 재사용한다. CraftHomeEditor.tsx는 이미 검증·병합된 코드라 그대로
// 두고, 새 페이지부터 이 공용 셸을 쓴다.
import { useState, type ReactNode } from "react";
import { Editor, Frame, useEditor, type Resolver } from "@craftjs/core";
import { supabase } from "@/lib/supabaseClient";
import { editorialSerif } from "@/components/craft/home/font";
import { Toolbox } from "./Toolbox";
import { SettingsSidebar } from "./SettingsSidebar";
import { PRIMITIVE_BLOCK_OPTIONS, PRIMITIVE_RESOLVER } from "@/components/craft/primitives";
import { DeviceModeProvider, type DeviceMode } from "./DeviceModeContext";
import type { CraftBlockOption } from "./types";

export type { CraftBlockOption };
export type { DeviceMode };

// EPIC-100(항목 3): 관리자 PC/모바일 반응형 빌더 모드 — 캔버스(Frame)를 감싼
// 컨테이너의 실제 렌더링 너비만 바꾼다. 블록 내부 반응형이 뷰포트 미디어쿼리
// (`md:`)가 아니라 컨테이너 쿼리(`@[768px]:`)로 동작하도록 CraftPageRenderer.tsx
// 등에서 이미 바꿔뒀기 때문에, 이 너비 변경만으로 그리드/스플릿이 실시간으로
// 다시 계산된다 — 실제 브라우저 창 크기는 그대로라 뷰포트 미디어쿼리였다면
// 아무 효과가 없었을 것.

function DeviceModeToggle({ value, onChange }: { value: DeviceMode; onChange: (mode: DeviceMode) => void }) {
  return (
    <div className="flex items-center rounded-md border border-gray-300 p-0.5 text-xs">
      <button
        type="button"
        onClick={() => onChange("pc")}
        className={`rounded px-2 py-1 ${value === "pc" ? "bg-gray-800 text-white" : "text-gray-600 hover:bg-gray-100"}`}
      >
        🖥️ PC 모드
      </button>
      <button
        type="button"
        onClick={() => onChange("mobile")}
        className={`rounded px-2 py-1 ${value === "mobile" ? "bg-gray-800 text-white" : "text-gray-600 hover:bg-gray-100"}`}
      >
        📱 모바일 모드
      </button>
    </div>
  );
}

function EditorToolbar({
  title,
  pageId,
  deviceMode,
  onDeviceModeChange,
  onClose,
  onSaved,
}: {
  title: string;
  pageId: string;
  deviceMode: DeviceMode;
  onDeviceModeChange: (mode: DeviceMode) => void;
  onClose: () => void;
  onSaved: () => void;
}) {
  const { query } = useEditor();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSave() {
    setSaving(true);
    setError(null);
    const serialized = query.serialize();
    const { error: updateError } = await supabase
      .from("page_builder")
      .update({ craft_state: serialized, updated_at: new Date().toISOString() })
      .eq("id", pageId);
    setSaving(false);
    if (updateError) {
      setError(updateError.message);
      return;
    }
    onSaved();
  }

  return (
    <div className="flex items-center justify-between border-b border-gray-200 bg-white px-4 py-3">
      <div className="flex items-center gap-2">
        <h2 className="text-sm font-semibold">Craft 에디터 — {title}</h2>
        <span className="hidden text-xs text-gray-400 sm:inline">
          텍스트/이미지를 더블클릭하면 바로 수정할 수 있어요
        </span>
      </div>
      <div className="flex items-center gap-2">
        {error && <span className="text-xs text-red-600">{error}</span>}
        <DeviceModeToggle value={deviceMode} onChange={onDeviceModeChange} />
        <button
          type="button"
          onClick={onClose}
          className="rounded-md border border-gray-300 px-3 py-1.5 text-xs hover:bg-gray-50"
        >
          닫기
        </button>
        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="rounded-md bg-gray-800 px-3 py-1.5 text-xs text-white disabled:opacity-50"
        >
          {saving ? "저장 중..." : "저장"}
        </button>
      </div>
    </div>
  );
}

// 사용자 지시(2026-08-27 — "왼쪽 오른쪽 패널이 접혔다 펴질수 있게 해야지"):
// 캔버스 오른쪽 가장자리 근처 블록의 툴바가 SettingsSidebar 오버레이에
// 가려 안 보이던 문제(위 editable.tsx z-index 수정으로 근본 해결)와는
// 별개로, 패널 자체를 필요할 때 접어 캔버스를 더 넓게 볼 수 있어야 한다는
// 요청 — Toolbox/SettingsSidebar를 감싸 접기/펼치기 탭을 붙인다. 두 패널
// 다 이미 절대 위치 오버레이(HOTFIX-146)라 접어도 캔버스 폭 계산에는
// 영향이 없다(원래도 canvas는 항상 전체 폭).
function CollapsibleEdgePanel({
  side,
  open,
  onToggle,
  children,
}: {
  side: "left" | "right";
  open: boolean;
  onToggle: () => void;
  children: ReactNode;
}) {
  return (
    <div className={`absolute inset-y-0 z-20 flex ${side === "left" ? "left-0" : "right-0 flex-row-reverse"}`}>
      {open && <div className="shadow-xl">{children}</div>}
      <button
        type="button"
        onClick={onToggle}
        title={open ? "패널 접기" : "패널 펼치기"}
        className="flex w-4 flex-shrink-0 items-center justify-center self-center rounded-sm bg-gray-800/70 py-10 text-[10px] text-white hover:bg-gray-700"
      >
        {side === "left" ? (open ? "◀" : "▶") : open ? "▶" : "◀"}
      </button>
    </div>
  );
}

// EPIC-102: 캔버스 + 좌측 Toolbox + 우측 SettingsSidebar를 감싸는 본문 —
// useEditor()가 <Editor> 컨텍스트 안에서만 호출 가능해 별도 컴포넌트로
// 분리했다. "요소" 그룹(원자 블록)은 PRIMITIVE_BLOCK_OPTIONS를 항상 포함해
// 호출부마다 새로 넘길 필요가 없다.
function EditorBody({
  sectionOptions,
  deviceMode,
  defaultTree,
  initialState,
}: {
  sectionOptions: CraftBlockOption[];
  deviceMode: DeviceMode;
  defaultTree: ReactNode;
  initialState?: string | null;
}) {
  const { query, actions } = useEditor();
  const [leftOpen, setLeftOpen] = useState(true);
  const [rightOpen, setRightOpen] = useState(true);

  function handleAdd(option: CraftBlockOption) {
    const tree = query.parseReactElement(option.buildElement()).toNodeTree();
    actions.addNodeTree(tree, "ROOT");
  }

  // HOTFIX-146(사용자 반복 신고 — "Craft 에디터 preview 와 실제 홈페이지
  // 출력이 다르다"): Toolbox(w-60)/SettingsSidebar(w-72)가 캔버스와 flex로
  // 폭을 나눠 쓰고 있어서, PC 모드 캔버스("w-full")가 실제 방문자 화면보다
  // 항상 528px(두 패널 폭 합) 좁게 렌더링됐다 — 블록 내부 반응형이
  // 뷰포트가 아니라 이 캔버스의 실제 렌더링 폭 기준 컨테이너 쿼리
  // (`@[768px]:` 등, 위 EPIC-100 주석 참고)라서, 이 좁아진 폭 때문에
  // 실제 사이트에서는 데스크톱 레이아웃으로 계산될 폭에서도 에디터
  // 안에서는 모바일 레이아웃으로 잘못 계산되는 게 근본 원인이었다 —
  // "홈페이지 설정 관리"의 왼쪽 패널을 오버레이로 바꿔 캔버스 폭을 지킨
  // HOTFIX-141.9와 동일한 패턴: 두 패널을 flex 형제 대신 캔버스 위에 뜨는
  // 절대 위치 오버레이로 바꿔, 캔버스(및 그 안의 컨테이너 쿼리)가 항상
  // 이 셸의 전체 폭을 그대로 쓰게 한다.
  // HOTFIX-147.7(사용자 지시 — 모바일 전용 드래그 위치): DeviceModeProvider가
  // 캔버스만 감싸고 있었을 때는 SettingsSidebar(우측 패널, 여기서는 형제
  // 요소로 absolute 오버레이됨)가 이 컨텍스트 밖에 있어 deviceMode를 항상
  // 기본값 "pc"로만 읽었다 — FreePositionSettingsSection의 "지금 모바일
  // 모드" 분기가 절대 안 켜지던 진짜 원인. Toolbox/캔버스/SettingsSidebar
  // 셋 다를 하나의 Provider로 감싼다.
  return (
    <DeviceModeProvider mode={deviceMode}>
      <div className="relative flex flex-1 overflow-hidden">
        <CollapsibleEdgePanel side="left" open={leftOpen} onToggle={() => setLeftOpen((v) => !v)}>
          <Toolbox sections={sectionOptions} elements={PRIMITIVE_BLOCK_OPTIONS} onAdd={handleAdd} />
        </CollapsibleEdgePanel>
        {/* EPIC-100(항목 3): 모바일 모드일 때 캔버스를 실제 폰 너비(390px)로
            좁히고 가운데 정렬 + 기기 프레임처럼 보이는 테두리/그림자를 얹는다.
            바깥 회색 배경은 캔버스가 전체 폭이 아닐 때 경계를 눈으로 구분하기
            위함(PC 모드에서는 배경이 그대로 흰색 캔버스에 가려짐). */}
        <div className="h-full w-full overflow-y-auto bg-gray-100">
          <div
            className={`craft-home @container mx-auto ${editorialSerif.variable} ${
              deviceMode === "mobile"
                ? "w-[390px] border-x border-gray-300 bg-white shadow-lg"
                : "w-full bg-white"
            }`}
          >
            <Frame data={initialState ?? undefined}>{!initialState && defaultTree}</Frame>
          </div>
        </div>
        <CollapsibleEdgePanel side="right" open={rightOpen} onToggle={() => setRightOpen((v) => !v)}>
          <SettingsSidebar />
        </CollapsibleEdgePanel>
      </div>
    </DeviceModeProvider>
  );
}

export function CraftPageEditor({
  title,
  pageId,
  resolver,
  defaultTree,
  blockOptions,
  initialState,
  onClose,
  onSaved,
}: {
  title: string;
  pageId: string;
  resolver: Resolver;
  defaultTree: ReactNode;
  blockOptions: CraftBlockOption[];
  initialState?: string | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [deviceMode, setDeviceMode] = useState<DeviceMode>("pc");

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-white">
      <Editor resolver={{ ...PRIMITIVE_RESOLVER, ...resolver }} enabled>
        <EditorToolbar
          title={title}
          pageId={pageId}
          deviceMode={deviceMode}
          onDeviceModeChange={setDeviceMode}
          onClose={onClose}
          onSaved={onSaved}
        />
        <EditorBody
          sectionOptions={blockOptions}
          deviceMode={deviceMode}
          defaultTree={defaultTree}
          initialState={initialState}
        />
      </Editor>
    </div>
  );
}
