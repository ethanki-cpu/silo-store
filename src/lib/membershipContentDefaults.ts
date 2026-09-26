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


export type DepthEffect = "stars" | "feathers" | "fireflies" | "bubbles" | "embers" | "dust" | "petals";
export const DEPTH_EFFECT_LABELS: Record<DepthEffect, string> = {
  stars: "✦ 반짝이는 별",
  feathers: "🪶 휘날리는 깃털(이미지)",
  fireflies: "✨ 떠도는 반딧불",
  bubbles: "🥂 피어오르는 기포",
  embers: "🔥 불씨",
  dust: "🌫 금빛 먼지",
  petals: "🌸 흩날리는 꽃잎",
};
// HOTFIX-163.14(사용자 지시 — 화면 전체에 깔리는 효과도 직접 넣고 크기·모션·반짝임·glow를 각각 설정): 효과 한 겹의 세부 설정.
// 비운 값은 그 효과의 기본값을 쓴다.
export type EffectMotion = "default" | "fall" | "float" | "rise" | "wander" | "static";
export const EFFECT_MOTION_LABELS: Record<EffectMotion, string> = {
  default: "기본",
  fall: "위→아래로 떨어짐(빙글)",
  float: "위→아래로 살랑이며 내림",
  rise: "아래→위로 떠오름",
  wander: "제자리에서 떠돎",
  static: "고정(움직이지 않음)",
};
export type EffectConfig = {
  count?: number; // 개수(1~80)
  size?: number; // 크기 배율(%, 기본 100)
  speed?: number; // 속도 배율(%, 기본 100 — 클수록 빠름)
  motion?: EffectMotion;
  twinkle?: number; // 반짝임 세기(0~100)
  glow?: number; // 빛번짐 반경(px, 0~30)
  opacity?: number; // 불투명도(%, 기본 100)
};
// 운영자가 직접 올린 이미지로 만드는 효과 겹(여러 장을 섞어서 흩뿌림)
export type CustomEffect = EffectConfig & { id: string; name?: string; images: string[] };

// 깊이 안에 자유롭게 놓는 이미지(등장인물/장면). x,y = 화면 중심 좌표(%), w = 화면 너비 대비 크기(%).
export type DepthSprite = { id: string; url: string; x: number; y: number; w: number };
export type DepthScene = {
  title: string;
  text: string;
  /** 화면 전체를 덮는 배경 이미지와, 드래그로 정한 초점("50% 50%")·확대(100~250) */
  imageUrl?: string;
  imagePos?: string;
  imageZoom?: number;
  /** "contain"(기본) = 이미지 전체가 잘리지 않고 다 보임(남는 좌우/상하는 흐린 같은 이미지로 채움), "cover" = 화면을 꽉 채우되 잘림 */
  imageFit?: "pan" | "cover" | "contain" | "stretch";
  /** 아치문: 높이(화면 높이 %, 기본 82), 폭(문 높이 대비 %, 기본 60 = 3:5), 안쪽 블러(px, 기본 12), 안쪽 어둡기(%, 기본 42) */
  doorHeightPct?: number;
  doorWidthPct?: number;
  doorBlurPx?: number;
  doorDarkPct?: number;
  /** 깊이의 주요 색 두 가지(배경 그라데이션)와 강조색 */
  color1?: string;
  color2?: string;
  accent?: string;
  effects?: DepthEffect[];
  /** feathers 효과에 쓰는 이미지(깃털 5개 등) — 비우면 기본 깃털 */
  effectImages?: string[];
  /** 내장 효과별 세부 설정 */
  effectConfig?: Partial<Record<DepthEffect, EffectConfig>>;
  /** 직접 올린 이미지 효과들 */
  customEffects?: CustomEffect[];
  sprites?: DepthSprite[];
  /** EPIC-164: 등급별 하이엔드 VFX(깊이 순서대로 Angel~Artist). false로 끌 수 있고, 비우면 켜진다. */
  hyperVfx?: boolean;
  /** HOTFIX-164.3: 문 안 문구의 글꼴(DEPTH_FONTS 키, 비우면 명조)과 글자 크기(px, 0/비우면 문 크기에 맞춰 자동) */
  fontFamily?: string;
  fontSizePx?: number;
  /** HOTFIX-165.2: 제목 글자 크기(px, 0/비우면 본문 크기의 62%로 자동) */
  titleSizePx?: number;
  /** HOTFIX-165.2: 글자 크기 배율(%, 100 = 지금 보이는 크기 그대로, 작게/크게 자유롭게) — px 값이 있으면 그 위에 곱해진다 */
  fontScalePct?: number;
  titleScalePct?: number;
  /** HOTFIX-164.4: 문의 중심 위치(화면 대비 %, 기본 50/50 = 가운데). 편집기에서 드래그 앤 드롭으로 정한다. */
  doorX?: number;
  doorY?: number;
  /** HOTFIX-165.1: 깊이 위에 겹치는 영상(webm/mp4) — 영상마다 불투명도·혼합 방식 */
  videos?: DepthVideo[];
  /** HOTFIX-165.1: 끈 내장 효과의 id들(DepthVfx의 VFX_PARTS) — 끄고 영상/이미지 효과로 대체할 때 */
  vfxOff?: string[];
  /** HOTFIX-165.1: Alice 카드 앞면(이상한 나라 등장인물) 이미지 — 비우면 이모지 카드 */
  cardFaces?: string[];
};

export type DepthVideo = { id: string; url: string; opacity?: number; blend?: "normal" | "screen" | "lighten" | "overlay" | "multiply"; fit?: "cover" | "contain" };

// 글꼴은 웹폰트를 새로 받지 않고(트래픽 0) 기기에 있는 폰트 스택만 쓴다.
export const DEPTH_FONTS: Record<string, { label: string; stack: string }> = {
  myeongjo: { label: "명조(기본)", stack: '"Noto Serif KR","Nanum Myeongjo",Georgia,serif' },
  gothic: { label: "고딕", stack: '"Noto Sans KR","Malgun Gothic","Apple SD Gothic Neo",system-ui,sans-serif' },
  round: { label: "둥근 고딕", stack: '"Nanum Gothic","Nanum Barun Gothic","Malgun Gothic",system-ui,sans-serif' },
  handwriting: { label: "손글씨", stack: '"Nanum Pen Script","Gaegu","Comic Sans MS",cursive' },
  classic: { label: "영문 클래식(Georgia)", stack: 'Georgia,"Times New Roman","Noto Serif KR",serif' },
};

export const DEFAULT_DEPTHS: DepthScene[] = [
  { title: "Depth 1 · 문 앞 광장", text: "사일로를 운명적으로 찾아와 준 첫눈 같은 사람들. 따뜻한 광장에서 당신의 취향을 기록해 보세요.", color1: "#FBF6E6", color2: "#F4E58A", accent: "#E4C84B", effects: ["stars", "feathers"] },
  { title: "Depth 2 · 살롱의 서재", text: "호기심의 열쇠를 쥐고 토끼굴로 뛰어든 탐험가. 굳게 닫혀있던 시대의 지식과 영감의 서랍장이 열립니다.", color1: "#14532D", color2: "#2ECC8F", accent: "#9CF0C4", effects: ["fireflies", "dust"] },
  { title: "Depth 3 · 살롱의 무도회장", text: "낭만과 열정을 수집하는 파티의 주인공. 당신만의 아카이브를 완성하고 찬란한 모임을 즐겨보세요.", color1: "#0047AB", color2: "#0F52BA", accent: "#9FC1FF", effects: ["bubbles", "stars"] },
  { title: "Depth 4 · 비밀의 방", text: "예술과 문명을 지켜내는 수호자. 오래된 물건의 내밀한 사연과 가장 프라이빗한 살롱의 문이 열립니다.", color1: "#F6F1E7", color2: "#CFCBC2", accent: "#B9A77A", effects: ["dust"] },
  // Depth 5·6은 Lautrec/Artist의 원문(PROJECT_VISION.md)에서 뜻을 가져온 초안 — 운영자가 위젯 설정에서 고친다.
  { title: "Depth 5 · 몽마르트르의 밤", text: "가장 낮은 곳에서 세상을 바라봤지만 누구보다 삶을 애정했던 사람. 있는 그대로의 삶을 기록하며 본질을 아름답게 담아내는, 찬란하게 쓸모없는 존재들의 무대가 열립니다.", color1: "#E2412F", color2: "#1F2A5A", accent: "#F28C28", effects: ["embers", "stars"] },
  { title: "Depth 6 · 예술가의 살롱", text: "무대와 전시로 사일로를 채워 준 모든 예술가들께. 120여 년 전 파리, 자신들만의 작은 공간에서 독립전시회를 열었던 살롱데상의 문이 존경과 응원의 마음으로 활짝 열립니다.", color1: "#3B1A66", color2: "#8E5BD1", accent: "#E0B5FF", effects: ["petals", "fireflies"] },
];


// EPIC-165: 문 로비 — 플랫폼의 핵심 요소마다 앤틱 문 하나(관리자가 문 사진을 올린다). 문을 누르면 문이 열리고, 그 뒤편에 설명 캐러셀이 나타난다.
// extra = 추가 슬라이드(빈 줄로 구분). 이미지가 없으면 코드로 그린 나무문이 대신 보인다.
export type LobbyDoor = { imageUrl: string; title: string; tagline: string; description: string; extra: string; href: string; hrefLabel: string; accent: string };

export const DEFAULT_LOBBY_DOORS: LobbyDoor[] = [
  { imageUrl: "", title: "About Silo", tagline: "에단과 수미의 일상과 취향 로그", description: "사일로의 주인 '에단과 수미'의 일상과 취향 로그.\n오래 모아 온 것들과 그 이야기를 가장 먼저 만나는 문이에요.", extra: "사일로 타임라인 · 사일로의 하루 등\n게시판 3개가 이 문 안에 있어요.", href: "/about-silo", hrefLabel: "About Silo 들어가기", accent: "#E4C84B" },
  { imageUrl: "", title: "사일로 상점", tagline: "오래된 보물이 새 주인을 찾는 과정", description: "사일로의 오래된 보물이 새로운 주인을 찾아가는 모든 과정.\n고르고, 사연을 듣고, 집으로 데려가는 여정을 함께해요.", extra: "", href: "/shop", hrefLabel: "상점 둘러보기", accent: "#C9A46A" },
  { imageUrl: "", title: "살롱데상", tagline: "'백명의 전시회' — 영감·창작·공유", description: "'백명의 전시회'라는 이름처럼,\n영감, 창작, 공유하는 우리 이야기.", extra: "", href: "/clubs", hrefLabel: "살롱데상 만나기", accent: "#F28C28" },
  { imageUrl: "", title: "온라인 도슨트", tagline: "그 기록으로 오늘을 비춰보기", description: "과거를 바꿀 순 없지만,\n그 기록으로 영감을 얻어 오늘을 비춰보기.", extra: "", href: "/docent", hrefLabel: "도슨트 듣기", accent: "#2ECC8F" },
  { imageUrl: "", title: "스튜디오", tagline: "공간 대여 · 서로의 감성으로 찍은 사진", description: "사일로 & 살롱데상 공간 대여,\n서로의 감성으로 찍은 사진 공유.", extra: "", href: "/studio", hrefLabel: "스튜디오 보기", accent: "#9FC1FF" },
  { imageUrl: "", title: "Silo Planet", tagline: "어린왕자의 행성처럼, 나만의 행성", description: "'어린왕자'의 행성처럼,\n나만의 행성을 꾸미고 다른 행성과 연결하기.", extra: "", href: "/silo-planet", hrefLabel: "행성으로 떠나기", accent: "#8E5BD1" },
  { imageUrl: "", title: "마이페이지", tagline: "'내가 선택한 나'를 아카이빙", description: "'내가 선택한 나'를 아카이빙 하기.\n팔로우로 연결된 너와 나.", extra: "", href: "/mypage", hrefLabel: "내 공간으로", accent: "#E2412F" },
];

// EPIC-165: 스킬 트리 — 등급(rank)이 오를 때마다 새로 열리는 가지. rank는 membership_rank(0~4, 99=Artist). 문구는 위젯 설정에서 관리자가 고친다.
export type SkillBranch = { rank: number; icon: string; title: string; desc: string };
export const SKILL_TIERS: { rank: number; name: string; color: string }[] = [
  { rank: 0, name: "Silo Angel", color: "#E4C84B" },
  { rank: 1, name: "Alice", color: "#2ECC8F" },
  { rank: 2, name: "Great Gatsby", color: "#4F86F7" },
  { rank: 3, name: "Patron", color: "#D8D2C4" },
  { rank: 4, name: "Lautrec", color: "#E2412F" },
  { rank: 99, name: "Artist", color: "#B57BFF" },
];
export const DEFAULT_SKILL_BRANCHES: SkillBranch[] = [
  { rank: 0, icon: "🏠", title: "마이페이지", desc: "'내가 선택한 나'를 기록해요. 글은 총 5개까지." },
  { rank: 0, icon: "🪐", title: "사일로 플래닛", desc: "내 행성과 사일로 행성 두 곳을 둘러봐요." },
  { rank: 0, icon: "🍷", title: "온라인 도슨트 맛보기", desc: "첫인사 글을 열람해요." },
  { rank: 1, icon: "✍️", title: "글쓰기 제한 해제", desc: "5개 제한 없이 자유롭게 기록해요." },
  { rank: 1, icon: "🔭", title: "다른 회원의 행성", desc: "다른 회원의 행성을 구경하고 좋아요를 눌러요." },
  { rank: 1, icon: "🤝", title: "클럽 모임", desc: "모임에 참여하고 10% 할인을 받아요." },
  { rank: 2, icon: "🔑", title: "도슨트 하루 1편", desc: "온라인 도슨트를 하루 한 편 열어 봐요." },
  { rank: 2, icon: "🥂", title: "파티 우선 예매", desc: "살롱데상 파티를 먼저 예매해요." },
  { rank: 3, icon: "💎", title: "내 행성 꾸미기(3D)", desc: "나만의 3D 행성 에셋을 올려 꾸며요." },
  { rank: 3, icon: "💌", title: "은밀한 사연", desc: "물건의 이전 주인이 남긴 사연을 읽어요." },
  { rank: 3, icon: "👑", title: "살롱 상시 출입", desc: "살롱데상에 자유롭게 드나들어요." },
  { rank: 4, icon: "🖋️", title: "살롱의 목소리(칼럼)", desc: "칼럼을 쓰고 목소리를 남겨요." },
  { rank: 4, icon: "🎭", title: "전시·공연 기획", desc: "전시와 공연을 직접 기획하고 주최해요." },
  { rank: 4, icon: "🏅", title: "생태계 제안·추천권", desc: "행성과 사일로의 다음 모습을 제안해요." },
  { rank: 99, icon: "🎨", title: "초대받는 자리", desc: "무대와 전시로 사일로를 채워 준 예술가를 위한 자리예요." },
];
