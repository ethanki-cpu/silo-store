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
import type { UniverseObject } from "@/lib/aboutSiloUniverseConfig";
import { useEffect, useState } from "react";
import { useDraggablePanel } from "./useDraggablePanel";

type BoardOption = { slug: string; name: string };

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
  const { offset, dragHandleProps } = useDraggablePanel();

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
    if (!error && url) onChange({ thumbnailUrl: url });
  }

  return (
    <div
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
            max={2}
            step={0.05}
            className="mt-1 w-full"
            value={object.scale}
            onChange={(e) => onChange({ scale: Number(e.target.value) || 0.3 })}
          />
          <span className="text-white/50">{object.scale.toFixed(2)}</span>
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
