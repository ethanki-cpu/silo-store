"use client";

// EPIC-108: 모든 자유배치 지원 블록(컨테이너/텍스트/이미지/버튼/영상/
// 슬라이드쇼/게시판연동)의 설정 패널이 공통으로 붙이는 섹션 — 캔버스에서
// 직접 드래그(FreePositionHandles)하는 게 기본이지만, 정확한 수치가
// 필요할 때를 위한 숫자 입력도 함께 제공한다.
import { useNode } from "@craftjs/core";
import { useDeviceMode } from "@/components/craft/shared/DeviceModeContext";
import { DEFAULT_FREE_POSITION, type FreePosition } from "@/lib/useFreePosition";

// HOTFIX-147.7(사용자 지시 — 모바일 전용 드래그 위치): supportsMobileOverride를
// 켠 블록(지금은 TextBlock)만 "모바일 모드" 탭에서 별도의 mobilePosition을
// 편집한다 — 안 켜면(기존 6개 블록) deviceMode와 무관하게 항상 position
// 하나만 보여주는 기존 화면 그대로다(회귀 없음).
export function FreePositionSettingsSection({ supportsMobileOverride = false }: { supportsMobileOverride?: boolean }) {
  const deviceMode = useDeviceMode();
  const { position, mobilePosition, setProp } = useNode((node) => ({
    position: (node.data.props.position as FreePosition | undefined) ?? DEFAULT_FREE_POSITION,
    mobilePosition: (node.data.props.mobilePosition as FreePosition | null | undefined) ?? null,
  }));

  const editingMobile = supportsMobileOverride && deviceMode === "mobile";
  const effective = editingMobile ? (mobilePosition ?? position) : position;

  function update(patch: Partial<FreePosition>) {
    setProp((props: { position?: FreePosition; mobilePosition?: FreePosition | null }) => {
      if (editingMobile) {
        props.mobilePosition = { ...effective, ...patch };
      } else {
        props.position = { ...effective, ...patch };
      }
    });
  }

  function resetMobileToDesktop() {
    setProp((props: { mobilePosition?: FreePosition | null }) => {
      props.mobilePosition = null;
    });
  }

  return (
    <div className="space-y-2 border-t border-gray-200 pt-3">
      <h4 className="text-xs font-semibold text-gray-500">자유 배치(콜라주)</h4>
      {editingMobile && (
        <div className="rounded border border-blue-200 bg-blue-50 p-2 text-[10px] leading-relaxed text-blue-700">
          지금 모바일 모드 — 여기서 드래그/입력하면 모바일 전용 위치가 따로 저장돼요(PC 위치는 그대로 유지).
          {mobilePosition && (
            <button type="button" onClick={resetMobileToDesktop} className="ml-1 underline">
              PC와 동일하게 되돌리기
            </button>
          )}
        </div>
      )}
      <label className="flex items-center gap-2 text-xs text-gray-600">
        <input type="checkbox" checked={effective.enabled} onChange={(e) => update({ enabled: e.target.checked })} />
        이 블록을 부모 위에 자유롭게 겹쳐 놓기
      </label>
      {effective.enabled && (
        <>
          <p className="text-[10px] leading-relaxed text-gray-400">
            캔버스에서 좌상단 ✥ 핸들을 드래그해 옮기고, 우하단 점을 드래그해 크기를 조절하세요.
          </p>
          <div className="grid grid-cols-2 gap-2">
            <label className="text-xs text-gray-600">
              X(%)
              <input
                type="number"
                value={Math.round(effective.xPct)}
                onChange={(e) => { if (e.target.value !== "" && Number.isFinite(e.target.valueAsNumber)) update({ xPct: e.target.valueAsNumber }); }}
                className="mt-1 w-full rounded border border-gray-300 px-2 py-1 text-xs"
              />
            </label>
            <label className="text-xs text-gray-600">
              Y(%)
              <input
                type="number"
                value={Math.round(effective.yPct)}
                onChange={(e) => { if (e.target.value !== "" && Number.isFinite(e.target.valueAsNumber)) update({ yPct: e.target.valueAsNumber }); }}
                className="mt-1 w-full rounded border border-gray-300 px-2 py-1 text-xs"
              />
            </label>
            <label className="text-xs text-gray-600">
              너비(%)
              <input
                type="number"
                value={Math.round(effective.widthPct)}
                onChange={(e) => { if (e.target.value !== "" && Number.isFinite(e.target.valueAsNumber)) update({ widthPct: e.target.valueAsNumber }); }}
                className="mt-1 w-full rounded border border-gray-300 px-2 py-1 text-xs"
              />
            </label>
            <label className="text-xs text-gray-600">
              높이(%)
              <input
                type="number"
                value={Math.round(effective.heightPct)}
                onChange={(e) => { if (e.target.value !== "" && Number.isFinite(e.target.valueAsNumber)) update({ heightPct: e.target.valueAsNumber }); }}
                className="mt-1 w-full rounded border border-gray-300 px-2 py-1 text-xs"
              />
            </label>
          </div>
          <label className="block text-xs text-gray-600">
            겹침 순서(z-index, 클수록 위)
            <input
              type="number"
              value={effective.zIndex}
              onChange={(e) => { if (e.target.value !== "" && Number.isFinite(e.target.valueAsNumber)) update({ zIndex: e.target.valueAsNumber }); }}
              className="mt-1 w-full rounded border border-gray-300 px-2 py-1 text-xs"
            />
          </label>
        </>
      )}
    </div>
  );
}
