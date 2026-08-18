"use client";

// EPIC-118(사용자 지시): 기존 MobilePreviewFrame.tsx는 실제 Navbar를
// 그대로 쓰지 않고 로고+슬라이드만 손으로 흉내 낸 "가짜" 미리보기였다
// (주석에 명시돼 있었음: "정확한 픽셀 동기화보다 실시간으로 반영된다는
// 감각이 목적") — 그래서 이 화면에 새로 추가되는 설정(상단 탭 섹션
// 높이/1단·2단 위치 등)은 애초에 이 미리보기가 그릴 줄 모르는 요소라
// "설정해도 아무 변화 없다"는 신고로 이어졌다. 매번 새 설정마다 이 가짜
// 미리보기를 따라 그려주는 대신, 실제 배포되는 홈페이지("/")를 그대로
// iframe으로 띄우고 CSS transform: scale()로 축소해 PC/모바일 두 크기를
// 보여준다 — 100% 실제 렌더링이라 "미리보기에는 안 보이는데 실제로는
// 반영된 설정"이 구조적으로 생길 수 없다. 트레이드오프: DB에 저장된
// 값을 읽는 실제 페이지이므로 "저장하기"를 누르기 전 타이핑 중인 값은
// 반영되지 않는다 — 대신 저장 성공 시 refreshKey를 올려 iframe을 새로
// 불러오는 방식으로(각 섹션의 handleSave 참고) "저장할 때마다 바로
// 갱신"되는 정도의 실시간성은 유지한다.
// HOTFIX(사용자 지시 — "오른쪽에 데스크탑과 모바일 프리뷰가 더 크게
// 뜨게 해"): 기존 340/220px 상자는 새 3단 레이아웃(좌측 섹션 목록+가운데
// 편집 폼+우측 프리뷰)에서 남는 공간에 비해 너무 작았다 — boxWidth를
// 키워 실제로 내용을 알아볼 수 있는 크기로.
const DEVICE_PRESETS = {
  pc: { width: 1280, height: 900, boxWidth: 440 },
  mobile: { width: 390, height: 844, boxWidth: 240 },
} as const;

export function LivePreviewFrame({
  device,
  refreshKey,
  path = "/",
}: {
  device: keyof typeof DEVICE_PRESETS;
  refreshKey: number;
  path?: string;
}) {
  const preset = DEVICE_PRESETS[device];
  const scale = preset.boxWidth / preset.width;
  const boxHeight = Math.round(preset.height * scale);

  return (
    <div
      className="overflow-hidden rounded-md border border-gray-300 bg-white shadow-sm"
      style={{ width: preset.boxWidth, height: boxHeight }}
    >
      <iframe
        key={refreshKey}
        src={path}
        title={`${device} 미리보기`}
        style={{
          width: preset.width,
          height: preset.height,
          border: "none",
          transform: `scale(${scale})`,
          transformOrigin: "top left",
        }}
      />
    </div>
  );
}
