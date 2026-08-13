"use client";

// EPIC-099(항목 3, Phase 2): CraftHomeEditor.tsx의 일반화 버전 — 제목/
// resolver/defaultTree/"+ 섹션 추가" 후보 목록을 파라미터로 받아 어떤 Craft
// 페이지든 재사용한다. CraftHomeEditor.tsx는 이미 검증·병합된 코드라 그대로
// 두고, 새 페이지부터 이 공용 셸을 쓴다.
import { useState, type ReactElement, type ReactNode } from "react";
import { Editor, Frame, useEditor, type Resolver } from "@craftjs/core";
import { supabase } from "@/lib/supabaseClient";
import { editorialSerif } from "@/components/craft/home/font";

// "+ 섹션 추가" 목록의 항목 하나 — buildElement()가 그 블록의 "새 인스턴스"를
// 만든다(보통 그 컴포넌트의 static craft.props를 그대로 스프레드). 반환
// 타입이 ReactNode가 아니라 ReactElement인 건 query.parseReactElement()가
// 실제 엘리먼트만 받기 때문(null/문자열 등은 애초에 유효한 블록이 아님).
export type CraftBlockOption = { label: string; buildElement: () => ReactElement };

// EPIC-100(항목 3): 관리자 PC/모바일 반응형 빌더 모드 — 캔버스(Frame)를 감싼
// 컨테이너의 실제 렌더링 너비만 바꾼다. 블록 내부 반응형이 뷰포트 미디어쿼리
// (`md:`)가 아니라 컨테이너 쿼리(`@[768px]:`)로 동작하도록 CraftPageRenderer.tsx
// 등에서 이미 바꿔뒀기 때문에, 이 너비 변경만으로 그리드/스플릿이 실시간으로
// 다시 계산된다 — 실제 브라우저 창 크기는 그대로라 뷰포트 미디어쿼리였다면
// 아무 효과가 없었을 것.
export type DeviceMode = "pc" | "mobile";

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
  blockOptions,
  deviceMode,
  onDeviceModeChange,
  onClose,
  onSaved,
}: {
  title: string;
  pageId: string;
  blockOptions: CraftBlockOption[];
  deviceMode: DeviceMode;
  onDeviceModeChange: (mode: DeviceMode) => void;
  onClose: () => void;
  onSaved: () => void;
}) {
  const { query, actions } = useEditor();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [addMenuOpen, setAddMenuOpen] = useState(false);

  function handleAddBlock(option: CraftBlockOption) {
    const tree = query.parseReactElement(option.buildElement()).toNodeTree();
    actions.addNodeTree(tree, "ROOT");
    setAddMenuOpen(false);
  }

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
        <div className="relative">
          <button
            type="button"
            onClick={() => setAddMenuOpen((v) => !v)}
            className="rounded-md border border-gray-300 px-3 py-1.5 text-xs hover:bg-gray-50"
          >
            + 섹션 추가
          </button>
          {addMenuOpen && (
            <div className="absolute right-0 top-full z-10 mt-1 w-40 rounded-md border border-gray-200 bg-white py-1 shadow-lg">
              {blockOptions.map((option) => (
                <button
                  key={option.label}
                  type="button"
                  onClick={() => handleAddBlock(option)}
                  className="block w-full px-3 py-1.5 text-left text-xs hover:bg-gray-50"
                >
                  {option.label}
                </button>
              ))}
            </div>
          )}
        </div>
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
      <Editor resolver={resolver} enabled>
        <EditorToolbar
          title={title}
          pageId={pageId}
          blockOptions={blockOptions}
          deviceMode={deviceMode}
          onDeviceModeChange={setDeviceMode}
          onClose={onClose}
          onSaved={onSaved}
        />
        {/* EPIC-100(항목 3): 모바일 모드일 때 캔버스를 실제 폰 너비(390px)로
            좁히고 가운데 정렬 + 기기 프레임처럼 보이는 테두리/그림자를 얹는다.
            바깥 회색 배경은 캔버스가 전체 폭이 아닐 때 경계를 눈으로 구분하기
            위함(PC 모드에서는 배경이 그대로 흰색 캔버스에 가려짐). */}
        <div className="flex-1 overflow-y-auto bg-gray-100">
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
      </Editor>
    </div>
  );
}
