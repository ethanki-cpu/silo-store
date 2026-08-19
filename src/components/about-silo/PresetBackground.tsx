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

// HOTFIX(사용자 신고 — "프리셋 배경(수채화 블루/딥 블루) 선택 시 화면에
// 이상한 점 그리드가 생긴다", 실제로 코드로 재현/확인 완료): 원인은 이
// 별 점을 SVG 이미지로 만들어 background-image로 쓸 때, SVG 자체의
// 고유 크기(가로/세로 attribute, 예: 8x8)와 실제 타일 간격으로 쓰는
// background-size(120~340px)가 서로 다르면 브라우저가 그 SVG 전체를
// background-size 크기까지 확대해서 채운다는 것 — 즉 SVG 안의 작은 점
// (r=1.5, 8x8 캔버스 기준)이 120~340px 타일 전체 크기로 15~40배
// 확대되어, "옅은 별 점"이 아니라 화면을 뒤덮는 커다란 원형 얼룩의
// 그리드로 렌더링된다(실제로 이 코드로 재현해 확인함 — cream 프리셋만
// 멀쩡해 보였던 것도 starOpacity가 0.15로 낮아 이 거대해진 원이 상대적으로
// 옅어 덜 도드라졌을 뿐, 실은 크림에도 같은 문제가 있었을 것). 고치는
// 방법: SVG의 viewBox/width/height를 타일 크기(size)와 정확히 똑같이
// 맞춰서 확대 배율이 항상 1:1이 되게 한다 — 그 안에서 점의 상대 위치
// (offset)만 조정하면 되므로 크기별로 별도 data URI를 만든다.
function starDotDataUrl(size: number, offset: number): string {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}"><circle cx="${offset}" cy="${offset}" r="1.4" fill="white"/></svg>`;
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

// 별 패턴 — 서로 다른 크기의 점 이미지를 반복 배치(4겹, 크기/간격
// 다르게)해 은하수처럼 흩뿌려진 느낌을 낸다.
function starLayerStyle(size: number, opacity: number, offset: number): React.CSSProperties {
  return {
    position: "absolute",
    inset: 0,
    opacity,
    backgroundImage: `url("${starDotDataUrl(size, offset)}")`,
    backgroundRepeat: "repeat",
    // SVG 고유 크기가 이미 size와 동일하므로 backgroundSize는 사실상
    // 그대로 유지(1:1)일 뿐 — 명시적으로 남겨 의도를 분명히 한다.
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
