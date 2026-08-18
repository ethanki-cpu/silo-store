"use client";

// HOTFIX(사용자 지시 — "상단 탭 디자인의 '탑 섹션 높이', '1단 겹침정도',
// '2단 위치조정'을 내가 일일이 숫자값을 넣어서 하는 게 너무 구시대적
// 이야. 드래그앤드롭으로 내가 원하는 곳에 놓을 수 있도록 해줘"): 숫자
// 입력창 대신 트랙을 마우스로 눌러 좌우로 끌면 값이 실시간으로 바뀌는
// 드래그 슬라이더 — Craft 자유 배치 시스템(FreePositionHandles)과 같은
// "포인터 다운→무브→업" 패턴을 2D 대신 1D(px 값 하나)로 단순화한 것.
// 정밀 조정을 원할 때는 ±버튼으로 step만큼 미세 조정할 수 있다.
import { useRef, useState, type PointerEvent as ReactPointerEvent } from "react";

export function DragValueSlider({
  label,
  hint,
  value,
  min,
  max,
  step = 1,
  unit = "px",
  onChange,
  allowAuto,
  onClearAuto,
}: {
  label: string;
  hint?: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  unit?: string;
  onChange: (value: number) => void;
  /** rowHeightPx처럼 "비우면 자동"인 필드용 — 자동 상태로 되돌리는 링크를 보여준다. */
  allowAuto?: boolean;
  onClearAuto?: () => void;
}) {
  const trackRef = useRef<HTMLDivElement>(null);
  const [dragging, setDragging] = useState(false);

  function valueFromClientX(clientX: number): number {
    const track = trackRef.current;
    if (!track) return value;
    const rect = track.getBoundingClientRect();
    const pct = Math.min(1, Math.max(0, (clientX - rect.left) / rect.width));
    const raw = min + pct * (max - min);
    return Math.round(raw / step) * step;
  }

  function handlePointerDown(e: ReactPointerEvent<HTMLDivElement>) {
    e.currentTarget.setPointerCapture(e.pointerId);
    setDragging(true);
    onChange(valueFromClientX(e.clientX));
  }
  function handlePointerMove(e: ReactPointerEvent<HTMLDivElement>) {
    if (!dragging) return;
    onChange(valueFromClientX(e.clientX));
  }
  function handlePointerUp(e: ReactPointerEvent<HTMLDivElement>) {
    setDragging(false);
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {
      // no-op — 캡처 해제 실패해도 드래그 로직엔 영향 없음
    }
  }

  const pct = Math.min(1, Math.max(0, (value - min) / (max - min)));
  const zeroPct = min < 0 && max > 0 ? Math.min(1, Math.max(0, (0 - min) / (max - min))) : null;
  const fillStart = zeroPct ?? 0;

  return (
    <div>
      <div className="mb-1 flex items-center justify-between gap-2">
        <label className="block text-sm">{label}</label>
        <div className="flex shrink-0 items-center gap-1 text-xs text-gray-500">
          <button
            type="button"
            onClick={() => onChange(Math.max(min, value - step))}
            className="rounded border border-gray-300 px-1.5 leading-5 hover:bg-gray-50"
            aria-label="감소"
          >
            −
          </button>
          <span className="w-12 text-center font-mono tabular-nums">
            {value}
            {unit}
          </span>
          <button
            type="button"
            onClick={() => onChange(Math.min(max, value + step))}
            className="rounded border border-gray-300 px-1.5 leading-5 hover:bg-gray-50"
            aria-label="증가"
          >
            +
          </button>
        </div>
      </div>
      {hint && <p className="mb-1 text-xs text-gray-400">{hint}</p>}
      <div
        ref={trackRef}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        className="relative h-6 w-full cursor-ew-resize touch-none select-none rounded-full bg-gray-100"
      >
        {zeroPct !== null && (
          <div className="absolute top-0 h-full w-px bg-gray-300" style={{ left: `${zeroPct * 100}%` }} />
        )}
        <div
          className="absolute top-0 h-full rounded-full bg-amber-200/70"
          style={{
            left: `${Math.min(fillStart, pct) * 100}%`,
            width: `${Math.abs(pct - fillStart) * 100}%`,
          }}
        />
        <div
          className="absolute top-1/2 h-4 w-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-amber-500 bg-white shadow"
          style={{ left: `${pct * 100}%` }}
        />
      </div>
      {allowAuto && (
        <button type="button" onClick={onClearAuto} className="mt-1 text-xs text-gray-400 hover:underline">
          자동으로 되돌리기
        </button>
      )}
    </div>
  );
}
