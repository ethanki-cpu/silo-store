// EPIC-163: /membership 위젯(감성적 권한 표, 심연으로의 스크롤)의 기본 문구 — 위젯 설정에서 관리자가 고친다.
export type ExperienceRow = {
  label: string;
  sub: string;
  guest: string;
  angel: string;
  alice: string;
  gatsby: string;
  patron: string;
  lautrec: string;
};

export const DEFAULT_EXPERIENCE_ROWS: ExperienceRow[] = [
  { label: "광장의 대화", sub: "(커뮤니티 활동)", guest: "🔒 목록만 관람", angel: "자유로운 기록 ✍️", alice: "자유로운 기록 ✍️", gatsby: "자유로운 기록 ✍️", patron: "자유로운 기록 ✍️", lautrec: "살롱의 목소리 (칼럼) 🖋️" },
  { label: "시간 여행 도슨트", sub: "(온라인 도슨트)", guest: "🔒 썸네일 노출", angel: "첫인사 열람", alice: "첫인사 열람", gatsby: "하루 1개의 문 🔑", patron: "하루 2개의 문 🔑", lautrec: "프라이빗 도슨트 🍷" },
  { label: "영감의 서랍장", sub: "(큐레이션 칼럼)", guest: "🔒", angel: "🔒 굳게 닫힌 문", alice: "지식의 문 개방 📖", gatsby: "지식의 문 개방 📖", patron: "지식의 문 개방 📖", lautrec: "지식의 문 개방 📖" },
  { label: "나만의 아카이브", sub: "(기록 및 수집)", guest: "🔒", angel: "2D 행성 발급 🪐", alice: "2D 행성 발급 🪐", gatsby: "컬렉션 수집 🎟️", patron: "컬렉션 수집 🎟️", lautrec: "우주 모션/오브제 제안 🌌" },
  { label: "숨겨진 서사", sub: "(이전 주인의 사연)", guest: "🔒", angel: "🔒", alice: "🔒", gatsby: "🔒", patron: "은밀한 사연 열람 💌", lautrec: "은밀한 사연 열람 💌" },
  { label: "살롱데상 초대", sub: "(오프라인 혜택)", guest: "-", angel: "-", alice: "모임 10% 할인", gatsby: "파티 우선 예매권 🥂", patron: "상시 자유 출입 👑", lautrec: "전시/공연 기획 및 주최 🎭" },
  { label: "사일로의 명예", sub: "(플랫폼 특권)", guest: "-", angel: "-", alice: "-", gatsby: "-", patron: "3D 플래닛 에셋 💎", lautrec: "생태계 제안 및 추천권 🏅" },
];


export type DepthScene = { title: string; text: string };

export const DEFAULT_DEPTHS: DepthScene[] = [
  { title: "Depth 1 · 문 앞 광장", text: "사일로를 운명적으로 찾아와 준 첫눈 같은 사람들. 따뜻한 광장에서 당신의 취향을 기록해 보세요." },
  { title: "Depth 2 · 살롱의 서재", text: "호기심의 열쇠를 쥐고 토끼굴로 뛰어든 탐험가. 굳게 닫혀있던 시대의 지식과 영감의 서랍장이 열립니다." },
  { title: "Depth 3 · 살롱의 무도회장", text: "낭만과 열정을 수집하는 파티의 주인공. 당신만의 아카이브를 완성하고 찬란한 모임을 즐겨보세요." },
  { title: "Depth 4 · 비밀의 방", text: "예술과 문명을 지켜내는 수호자. 오래된 물건의 내밀한 사연과 가장 프라이빗한 살롱의 문이 열립니다." },
];

