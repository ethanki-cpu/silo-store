"use client";

// EPIC-108: 모든 자유배치 지원 블록(컨테이너/텍스트/이미지/버튼/영상/
// 슬라이드쇼/게시판연동)의 설정 패널이 공통으로 붙이는 섹션 — 캔버스에서
// 직접 드래그(FreePositionHandles)하는 게 기본이지만, 정확한 수치가
// 필요할 때를 위한 숫자 입력도 함께 제공한다.
import { useNode } from "@craftjs/core";
import { DEFAULT_FREE_POSITION, type FreePosition } from "@/lib/useFreePosition";

export function FreePositionSettingsSection() {
  const { position, setProp } = useNode((node) => ({
    position: (node.data.props.position as FreePosition | undefined) ?? DEFAULT_FREE_POSITION,
  }));

  function update(patch: Partial<FreePosition>) {
    setProp((props: { position?: FreePosition }) => {
      props.position = { ...position, ...patch };
    });
  }

  return (
    <div className="space-y-2 border-t border-gray-200 pt-3">
      <h4 className="text-xs font-semibold text-gray-500">자유 배치(콜라주)</h4>
      <label className="flex items-center gap-2 text-xs text-gray-600">
        <input type="checkbox" checked={position.enabled} onChange={(e) => update({ enabled: e.target.checked })} />
        이 블록을 부모 위에 자유롭게 겹쳐 놓기
      </label>
      {position.enabled && (
        <>
          <p className="text-[10px] leading-relaxed text-gray-400">
            캔버스에서 좌상단 ✥ 핸들을 드래그해 옮기고, 우하단 점을 드래그해 크기를 조절하세요.
          </p>
          <div className="grid grid-cols-2 gap-2">
            <label className="text-xs text-gray-600">
              X(%)
              <input
                type="number"
                value={Math.round(position.xPct)}
                onChange={(e) => update({ xPct: Number(e.target.value) || 0 })}
                className="mt-1 w-full rounded border border-gray-300 px-2 py-1 text-xs"
              />
            </label>
            <label className="text-xs text-gray-600">
              Y(%)
              <input
                type="number"
                value={Math.round(position.yPct)}
                onChange={(e) => update({ yPct: Number(e.target.value) || 0 })}
                className="mt-1 w-full rounded border border-gray-300 px-2 py-1 text-xs"
              />
            </label>
            <label className="text-xs text-gray-600">
              너비(%)
              <input
                type="number"
                value={Math.round(position.widthPct)}
                onChange={(e) => update({ widthPct: Number(e.target.value) || 10 })}
                className="mt-1 w-full rounded border border-gray-300 px-2 py-1 text-xs"
              />
            </label>
            <label className="text-xs text-gray-600">
              높이(%)
              <input
                type="number"
                value={Math.round(position.heightPct)}
                onChange={(e) => update({ heightPct: Number(e.target.value) || 10 })}
                className="mt-1 w-full rounded border border-gray-300 px-2 py-1 text-xs"
              />
            </label>
          </div>
          <label className="block text-xs text-gray-600">
            겹침 순서(z-index, 클수록 위)
            <input
              type="number"
              value={position.zIndex}
              onChange={(e) => update({ zIndex: Number(e.target.value) || 1 })}
              className="mt-1 w-full rounded border border-gray-300 px-2 py-1 text-xs"
            />
          </label>
        </>
      )}
    </div>
  );
}
