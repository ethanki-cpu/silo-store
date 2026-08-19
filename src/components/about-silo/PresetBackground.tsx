"use client";

// EPIC-115: 유튜브 배경 대신 쓸 수 있는 "프리셋" 배경 3종 — 크림 백지 /
// 딥 블루 / 수채화 블루, 각각 은하수·별·멀리 있는 행성을 그림으로 표현한
// 텍스처가 필요한데, 이 저장소에는 그런 이미지 에셋이 없다. 외부 파일을
// 새로 받아오는 대신 순수 CSS 그라디언트 + 흐릿한 원 몇 개로 만든
// "멀리 있는 행성"으로 절차적으로 그린다 — YoutubeBackground.tsx와
// 동일한 레이어 규칙(fixed, 뷰포트 전체, pointer-events-none, z-index
// 최하단)을 공유한다.
//
// HOTFIX-132.2(사용자 신고 — "점 그리드가 화면을 패닝할 때마다 계속
// 따라다닌다"): 예전엔 여기서 별을 CSS repeating background-image(SVG
// 점 하나를 타일링)로 직접 그렸다 — HOTFIX-134.4가 그 SVG의 확대 배율
// 버그(점이 15~40배 커져 얼룩 그리드로 보이던 것)는 고쳤지만, 근본
// 구조 자체가 여전히 "정확히 같은 간격으로 반복되는 단일 배경 타일"
// 이라 크기를 고쳐도 완벽하게 규칙적인 격자로 보일 수밖에 없었다. 더
// 결정적인 문제는 이 레이어가 <Canvas> 밖의 순수 2D DOM
// (`position: fixed`)이라 3D 카메라와 완전히 무관하다는 것 — 그래서
// 카메라를 아무리 돌리거나 패닝해도 이 점들은 화면에 그대로 붙박여
// 있어, "우주 공간의 별"이 아니라 "화면에 인쇄된 무늬"처럼 보이고
// 사용자 눈에는 "그리드가 화면을 따라다닌다"로 읽혔다. 진짜 별은 이미
// AboutSiloUniverse.tsx의 `UniverseParticles`(drei `<Stars>`/`<Sparkles>`
// /`<ShootingStars>`, `<Canvas>` 안에서 항상 렌더링되는 진짜 3D
// 오브젝트라 카메라 이동에 맞춰 정상적으로 시차(parallax)가 생김)가
// backgroundMode와 무관하게 이미 담당하고 있었으므로, 이 2D 점 레이어는
// 애초에 중복이자 버그의 근원이었다 — 완전히 제거하고 배경색 그라디언트
// +흐릿한 원거리 행성만 남긴다.
export type BackgroundPreset = "cream" | "deepBlue" | "watercolor";

const PRESET_STYLES: Record<BackgroundPreset, { background: string; showFarPlanets: boolean }> = {
  cream: {
    background: "radial-gradient(ellipse at 30% 20%, #fbf3e2 0%, #f3e4c8 55%, #e8d3ab 100%)",
    showFarPlanets: false,
  },
  deepBlue: {
    background: "radial-gradient(ellipse at 50% 30%, #1c2c52 0%, #10182f 55%, #05070f 100%)",
    showFarPlanets: true,
  },
  watercolor: {
    background: "radial-gradient(ellipse at 40% 25%, #6f9fc9 0%, #3f6a96 45%, #1f3a5c 100%)",
    showFarPlanets: true,
  },
};

export function PresetBackground({ preset }: { preset: BackgroundPreset }) {
  const { background, showFarPlanets } = PRESET_STYLES[preset];
  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 z-[-2] h-full w-full overflow-hidden" style={{ background }}>
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
