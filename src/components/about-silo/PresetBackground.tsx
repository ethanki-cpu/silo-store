"use client";

// EPIC-115: 유튜브 배경 대신 쓸 수 있는 "프리셋" 배경 3종 — 크림 백지 /
// 딥 블루 / 수채화 블루, 각각 은하수·별·멀리 있는 행성을 그림으로 표현한
// 텍스처가 필요한데, 이 저장소에는 그런 이미지 에셋이 없다. 외부 파일을
// 새로 받아오는 대신 순수 CSS(그라디언트 + 반복 radial-gradient로 만든
// 별 패턴 + 흐릿한 원 몇 개로 만든 "멀리 있는 행성")로 절차적으로
// 그린다 — YoutubeBackground.tsx와 동일한 레이어 규칙(fixed, 뷰포트
// 전체, pointer-events-none, z-index 최하단)을 공유한다.

export type BackgroundPreset = "cream" | "deepBlue" | "watercolor";

const PRESET_STYLES: Record<BackgroundPreset, { background: string; starOpacity: number; showFarPlanets: boolean }> = {
  cream: {
    background: "radial-gradient(ellipse at 30% 20%, #fbf3e2 0%, #f3e4c8 55%, #e8d3ab 100%)",
    starOpacity: 0.15,
    showFarPlanets: false,
  },
  deepBlue: {
    background: "radial-gradient(ellipse at 50% 30%, #1c2c52 0%, #10182f 55%, #05070f 100%)",
    starOpacity: 0.9,
    showFarPlanets: true,
  },
  watercolor: {
    background: "radial-gradient(ellipse at 40% 25%, #6f9fc9 0%, #3f6a96 45%, #1f3a5c 100%)",
    starOpacity: 0.6,
    showFarPlanets: true,
  },
};

// 별 패턴 — 서로 다른 크기의 radial-gradient 점을 반복 배치(4겹, 크기/간격
// 다르게)해 은하수처럼 흩뿌려진 느낌을 낸다.
function starLayerStyle(size: number, opacity: number, offset: number): React.CSSProperties {
  return {
    position: "absolute",
    inset: 0,
    opacity,
    backgroundImage: `radial-gradient(1.4px 1.4px at ${offset}px ${offset}px, #fff 100%, transparent 100%)`,
    backgroundSize: `${size}px ${size}px`,
  };
}

export function PresetBackground({ preset }: { preset: BackgroundPreset }) {
  const { background, starOpacity, showFarPlanets } = PRESET_STYLES[preset];
  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 z-[-2] h-full w-full overflow-hidden" style={{ background }}>
      <div style={starLayerStyle(120, starOpacity, 10)} />
      <div style={starLayerStyle(220, starOpacity * 0.7, 60)} />
      <div style={starLayerStyle(340, starOpacity * 0.5, 140)} />
      {showFarPlanets && (
        <>
          <div
            className="absolute rounded-full blur-md"
            style={{ top: "18%", left: "72%", width: 90, height: 90, background: "radial-gradient(circle at 35% 35%, #e7c9a0, #9a7350 70%)", opacity: 0.55 }}
          />
          <div
            className="absolute rounded-full blur-lg"
            style={{ top: "62%", left: "12%", width: 60, height: 60, background: "radial-gradient(circle at 35% 35%, #cbd9ec, #6f88a8 70%)", opacity: 0.4 }}
          />
        </>
      )}
      {/* 화면 전경(행성/텍스트)이 늘 읽히도록 아주 옅은 스크림. */}
      <div className="absolute inset-0 bg-black/10" />
    </div>
  );
}
