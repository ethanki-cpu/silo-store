"use client";

// EPIC-121(사용자 지시 — "오른쪽에는 각 오브젝트에 대한 설정을 하는 창이
// 나오게 해줘"): 3D 뷰에서 오브젝트(장식 .glb)를 클릭해 선택하면 화면
// 우측에 뜨는 인스펙터 — 라벨/크기 편집 + 삭제. 위치 자체는 3D 뷰의
// TransformControls 기즈모로 직접 드래그하고(AboutSiloUniverse.tsx
// 참고), 여기서는 그 결과 좌표를 읽기 전용으로 보여준다.
//
// HOTFIX-123(사용자 지시 — "오브제를 클릭했을 때 나오는 썸네일과 요약,
// 그리고 링크를 설정할 수 있게 해줘"): 썸네일 이미지 업로드 + 요약 텍스트
// + 링크 URL 3개 필드 신설.
//
// HOTFIX(사용자 지시 — "그 오브제들을 클릭했을 때... 관리자 창에는 어떤
// 게시판 링크로 연결되는지, 게시판의 썸네일과 설명을 수정할 수 있게
// 하고, 그 오브제의 크기도 설정할 수 있게 해줘"): "연결된 게시판" 선택을
// 추가 — 고르면 ObjectInfoCard가 그 게시판의 실제 name/description/
// thumbnail_url을 자동으로 보여준다. 아래 썸네일/요약/링크 필드는 이제
// "게시판 값을 오버라이드하는" 용도로 재정의했다(비워두면 게시판 값을
// 그대로 쓴다).
import { uploadFile } from "@/lib/storage";
import { supabase } from "@/lib/supabaseClient";
import type { UniverseObject, ObjectMotion } from "@/lib/aboutSiloUniverseConfig";
import { useEffect, useState } from "react";
import { useDraggablePanel } from "./useDraggablePanel";

type BoardOption = { slug: string; name: string };

// HOTFIX-140.4(사용자 지시 — "오브제들이 반짝이는 효과가 없는거 같은데,
// 그 모션 효과를 여러가지 오브제마다 설정할수 있게 해줘"): 3D 오브젝트
// 유휴 모션 프리셋 — 스케일은 카메라 줌 거리 계산과 얽혀 있어 일부러
// 빠졌다(aboutSiloUniverseConfig.ts의 ObjectMotion 주석 참고).
// EPIC-144(사용자 지시 — "10가지 모션이 더 있으면좋겠어"): 기존 4개에
// 10개를 더했다 — 전부 position/rotation/opacity만 쓰고 scale은 안
// 건드린다(위 주석 참고). "제자리 회전"은 이미지(별/은하수 등)에서도
// 이제 실제로 보인다(aboutSiloUniverseConfig.ts EPIC-144 주석 참고).
const MOTION_OPTIONS: { value: ObjectMotion; label: string }[] = [
  { value: "none", label: "없음" },
  { value: "twinkle", label: "반짝임(투명도)" },
  { value: "bob", label: "위아래 부유" },
  { value: "spin", label: "제자리 회전" },
  { value: "sway", label: "좌우 살랑임" },
  { value: "pendulum", label: "시계추처럼 흔들림" },
  { value: "tumble", label: "굴러가듯 텀블링" },
  { value: "drift", label: "느리게 원 그리며 떠다님" },
  { value: "orbitSelf", label: "제자리에서 작게 맴돔" },
  { value: "figure8", label: "8자 모양으로 떠다님" },
  { value: "flicker", label: "촛불처럼 불규칙하게 깜빡임" },
  { value: "shimmer", label: "미세하게 반짝이며 떨림" },
  { value: "fadeInOut", label: "천천히 밝아졌다 어두워짐" },
  { value: "nod", label: "위아래로 끄덕임" },
];

export function ObjectInspectorPanel({
  object,
  onChange,
  onDelete,
  onClose,
  onSave,
  saving,
}: {
  object: UniverseObject;
  onChange: (patch: Partial<UniverseObject>) => void;
  onDelete: () => void;
  onClose: () => void;
  // HOTFIX(사용자 신고 — "오브제 설정을 수정하면 저장할 수가 없네"):
  // 이 패널의 onChange는 전역 panelConfig(client state)만 바꿀 뿐 DB에
  // 쓰지 않는다 — 실제 저장은 좌측 설정 패널의 "지금 저장" 버튼뿐이었는데,
  // 여기서 오브젝트만 편집하고 닫는 사용자는 그 버튼의 존재를 모를 수
  // 있다. 같은 저장 함수를 여기서도 바로 누를 수 있게 노출한다.
  onSave: () => void;
  saving: boolean;
}) {
  const [uploadingThumb, setUploadingThumb] = useState(false);
  const [boards, setBoards] = useState<BoardOption[]>([]);
  // EPIC-144(사용자 지시 — "어떤 설정창이든 그 설정창 외부를 누르면
  // 설정창이 해제될수 있게 해줘").
  const { offset, dragHandleProps, panelRef } = useDraggablePanel({ onClickOutside: onClose });

  useEffect(() => {
    let cancelled = false;
    supabase
      .from("boards")
      .select("slug, name")
      .order("sort_order", { ascending: true })
      .then(({ data }) => {
        if (!cancelled && data) setBoards(data as BoardOption[]);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  async function handleThumbUpload(file: File | null) {
    if (!file) return;
    setUploadingThumb(true);
    const { url, error } = await uploadFile(file, "gallery", "about-silo-universe-objects");
    setUploadingThumb(false);
    if (error || !url) {
      alert(`업로드에 실패했어요.\n\n${error ?? "알 수 없는 오류"}`);
      return;
    }
    onChange({ thumbnailUrl: url });
  }

  return (
    <div
      ref={panelRef}
      className="pointer-events-auto fixed right-6 top-24 z-40 w-[260px] max-h-[80vh] overflow-y-auto rounded-xl border border-white/15 bg-black/70 p-3 text-white shadow-2xl backdrop-blur-md"
      style={{ transform: `translate(${offset.x}px, ${offset.y}px)` }}
    >
      <div className="mb-2 flex items-center justify-between" {...dragHandleProps}>
        <p className="text-xs font-semibold">오브젝트 설정</p>
        <button type="button" onClick={onClose} className="text-white/50 hover:text-white">
          ✕
        </button>
      </div>
      <div className="space-y-2">
        <label className="block text-[10px] text-white/60">
          이름
          <input
            className="mt-1 w-full rounded border border-white/15 bg-black/30 px-1.5 py-1 text-[11px] text-white"
            value={object.label}
            onChange={(e) => onChange({ label: e.target.value })}
          />
        </label>
        <label className="block text-[10px] text-white/60">
          크기(스케일)
          <input
            type="range"
            min={0.05}
            max={12}
            step={0.05}
            className="mt-1 w-full"
            value={object.scale}
            onChange={(e) => onChange({ scale: Number(e.target.value) || 0.3 })}
          />
          <span className="text-white/50">{object.scale.toFixed(2)}</span>
          {/* EPIC-144(사용자 지시 — "먼곳에... 크기 설정할수 있게해"):
              최대값을 2→12로 넓혔다 — 우주 공간 오브젝트를 "먼 우주 배경"
              (UniverseSettingsPanel)으로 두면 행성에서 40~85 단위나
              떨어진 곳에 배치돼, 기존 최대값(2)으로는 은하수/네뷸러/
              블랙홀처럼 화면을 채우는 배경 이미지를 만들기엔 너무
              작았다. */}
        </label>
        <label className="block text-[10px] text-white/60">
          모션 효과
          <select
            className="mt-1 w-full rounded border border-white/15 bg-black/30 px-1.5 py-1 text-[11px] text-white"
            value={object.motion ?? "none"}
            onChange={(e) => onChange({ motion: e.target.value as ObjectMotion })}
          >
            {MOTION_OPTIONS.map((m) => (
              <option key={m.value} value={m.value}>
                {m.label}
              </option>
            ))}
          </select>
        </label>
        <label className="block text-[10px] text-white/60">
          클릭 시 줌인 거리(배율, 비우면 자동)
          <div className="mt-1 flex items-center gap-1.5">
            <input
              type="range"
              min={1}
              max={8}
              step={0.1}
              className="w-full"
              value={object.focusDistanceMultiplier ?? 2.4}
              onChange={(e) => onChange({ focusDistanceMultiplier: Number(e.target.value) })}
            />
            <span className="w-16 shrink-0 text-right text-white/50">
              {object.focusDistanceMultiplier === null ? "자동" : object.focusDistanceMultiplier.toFixed(1) + "배"}
            </span>
          </div>
          {object.focusDistanceMultiplier !== null && (
            <button
              type="button"
              onClick={() => onChange({ focusDistanceMultiplier: null })}
              className="mt-1 text-[10px] text-white/40 underline hover:text-white/70"
            >
              자동으로 되돌리기
            </button>
          )}
        </label>
        <div className="text-[10px] text-white/40">
          위치는 3D 화면에서 오브젝트를 직접 드래그해 옮기세요(파란 화살표 기즈모) — 행성 표면에 자동으로 붙습니다.
          {object.position && (
            <p className="mt-1">
              현재: x {object.position[0].toFixed(2)} / y {object.position[1].toFixed(2)} / z {object.position[2].toFixed(2)}
            </p>
          )}
        </div>

        <div className="border-t border-white/10 pt-2">
          <p className="mb-1 text-[10px] font-semibold text-white/60">클릭 시 보여줄 정보 카드</p>
          <label className="block text-[10px] text-white/60">
            연결된 게시판(선택 — 고르면 그 게시판 이름/설명/썸네일을 자동으로 보여줘요)
            <select
              className="mt-1 w-full rounded border border-white/15 bg-black/30 px-1.5 py-1 text-[11px] text-white"
              value={object.boardSlug}
              onChange={(e) => onChange({ boardSlug: e.target.value })}
            >
              <option value="">연결 안 함</option>
              {boards.map((b) => (
                <option key={b.slug} value={b.slug}>
                  {b.name}
                </option>
              ))}
            </select>
          </label>
          <label className="mt-1.5 block text-[10px] text-white/60">
            썸네일 오버라이드(비우면 게시판 썸네일 사용)
            <div className="mt-1 flex items-center gap-1.5">
              <input
                className="min-w-0 flex-1 rounded border border-white/15 bg-black/30 px-1.5 py-1 text-[11px] text-white"
                value={object.thumbnailUrl}
                placeholder="이미지 업로드 또는 URL"
                onChange={(e) => onChange({ thumbnailUrl: e.target.value })}
              />
            </div>
          </label>
          <label className="mt-1 block cursor-pointer rounded border border-white/20 bg-white/10 px-2 py-1 text-center text-[10px] text-white hover:bg-white/20">
            {uploadingThumb ? "업로드 중..." : "썸네일 파일 선택"}
            <input
              type="file"
              accept="image/*"
              className="hidden"
              disabled={uploadingThumb}
              onChange={(e) => handleThumbUpload(e.target.files?.[0] ?? null)}
            />
          </label>
          <label className="mt-1.5 block text-[10px] text-white/60">
            설명 오버라이드(비우면 게시판 설명 사용)
            <textarea
              className="mt-1 w-full resize-none rounded border border-white/15 bg-black/30 px-1.5 py-1 text-[11px] text-white"
              rows={3}
              value={object.summary}
              placeholder="이 오브젝트를 클릭하면 보여줄 짧은 설명"
              onChange={(e) => onChange({ summary: e.target.value })}
            />
          </label>
          <label className="mt-1.5 block text-[10px] text-white/60">
            링크 오버라이드(비우면 연결된 게시판 페이지로)
            <input
              className="mt-1 w-full rounded border border-white/15 bg-black/30 px-1.5 py-1 text-[11px] text-white"
              value={object.link}
              placeholder={object.boardSlug ? `/boards/${object.boardSlug}` : "/silo-store 또는 https://..."}
              onChange={(e) => onChange({ link: e.target.value })}
            />
          </label>
        </div>

        <button
          type="button"
          onClick={onSave}
          disabled={saving}
          className="w-full rounded border border-sky-400/40 bg-sky-500/10 py-1.5 text-[11px] text-sky-200 hover:bg-sky-500/20 disabled:opacity-40"
        >
          {saving ? "저장 중..." : "이 변경사항 저장"}
        </button>
        <button
          type="button"
          onClick={onDelete}
          className="w-full rounded border border-red-400/40 bg-red-500/10 py-1.5 text-[11px] text-red-200 hover:bg-red-500/20"
        >
          이 오브젝트 삭제
        </button>
      </div>
    </div>
  );
}
