// HOTFIX-162.13(사용자 지시 — "carousel 안의 모든 걸 설정할 수 있게", "소개·편지를 이미지/영상 캐러셀·임베드까지 편집",
// "편지는 진짜 편지처럼 배경 이미지도"): 멤버십 등급 카드의 콘텐츠·표시 설정 타입과 기본값.
// 저장 위치는 전부 membership_tiers 컬럼(관리자만 쓰기 — RLS membership_tiers_admin_write).
export type MissionQuestion = { id: string; text: string; type: "text" | "photo" };

export type TierMediaSettings = {
  widthPx?: number;
  aspect?: string; // "4:5" | "1:1" | "3:4" | "16:9" | "9:16" | "auto"
  fit?: "contain" | "cover";
  radiusPx?: number;
};

export type LetterFont = "serif" | "sans" | "mono" | "custom";
export type LetterStyle = {
  frame?: "paper" | "plain" | "dark";
  paperColor?: string;
  textColor?: string;
  bgImageUrl?: string;
  bgOverlayPct?: number; // 배경 이미지 위 종이색 덮개 진하기(0~100, 클수록 글이 잘 보임)
  fontFamily?: LetterFont;
  customFont?: string;
  fontSizePx?: number;
  lineHeight?: number;
  align?: "left" | "center" | "right";
  paddingPx?: number;
  maxWidthPx?: number;
  signature?: string;
  seal?: boolean;
};

export type TierContent = {
  rank: number;
  name: string;
  price: number;
  is_lifetime: boolean;
  image_url: string | null;
  animation_url: string | null;
  intro_text: string | null;
  letter_text: string | null;
  intro_json: unknown | null;
  intro_html: string | null;
  letter_json: unknown | null;
  letter_html: string | null;
  letter_style: LetterStyle | null;
  media_settings: TierMediaSettings | null;
  mission_questions: MissionQuestion[] | null;
};

export const TIER_SELECT =
  "rank, name, price, is_lifetime, image_url, animation_url, intro_text, letter_text, intro_json, intro_html, letter_json, letter_html, letter_style, media_settings, mission_questions";

export const DEFAULT_LETTER_STYLE: Required<Omit<LetterStyle, "bgImageUrl" | "customFont" | "signature">> = {
  frame: "paper",
  paperColor: "#fbf6ea",
  textColor: "#3b2f24",
  bgOverlayPct: 70,
  fontFamily: "serif",
  fontSizePx: 15,
  lineHeight: 2,
  align: "left",
  paddingPx: 32,
  maxWidthPx: 640,
  seal: false,
};

export const LETTER_FONT_STACKS: Record<Exclude<LetterFont, "custom">, string> = {
  serif: '"Noto Serif KR", "Nanum Myeongjo", "Batang", Georgia, serif',
  sans: 'system-ui, -apple-system, "Segoe UI", "Malgun Gothic", sans-serif',
  mono: 'ui-monospace, "SFMono-Regular", Menlo, Consolas, monospace',
};

export const ASPECT_OPTIONS = ["4:5", "1:1", "3:4", "16:9", "9:16", "auto"] as const;

export function aspectCss(aspect: string | undefined): string | undefined {
  if (!aspect || aspect === "auto") return undefined;
  const [w, h] = aspect.split(":").map(Number);
  return w > 0 && h > 0 ? `${w} / ${h}` : undefined;
}

export const isVideoUrl = (url: string) => /\.(mp4|webm|mov|m4v)(\?|$)/i.test(url);

// 평문(예전 intro_text/letter_text)을 리치 에디터가 읽을 수 있는 HTML로 — 줄바꿈 유지.
export function plainToHtml(text: string | null | undefined): string {
  if (!text) return "";
  const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  return text
    .split(/\n{2,}/)
    .map((p) => `<p>${esc(p).replace(/\n/g, "<br>")}</p>`)
    .join("");
}

// HOTFIX-162.14(사용자 지시 — 카테고리 묶음마다 "어떤 목적으로, 무엇을 즐길 수 있는지"를 문학적으로): 등급 카드/비교표에서
// 카테고리 묶음 아래에 보여줄 한두 문장. 위젯 설정(groupCopy)에서 "이름|문장" 한 줄씩 관리자가 고친다.
// 이름은 카드에 보이는 묶음 이름(부분 일치), "@이름"은 살롱데상 같은 큰 갈래 전체에 대한 소개.
export const DEFAULT_GROUP_COPY = [
  "@살롱데상|백 개의 취향이 모이는 밤. 서로의 이야기에 귀 기울이며, ‘살맛나는 커뮤니티’의 한 사람이 되어 가는 곳이에요.",
  "@온라인 도슨트|시대를 건너는 이야기 수업. 물건 뒤에 숨어 있던 시간의 결을 따라 천천히 걸어요.",
  "@마이 페이지|오직 나만을 위한 아카이브. 좋아하는 것과 살아온 이야기를 평생 기록해 두는 서재예요.",
  "About Silo|사일로가 왜 생겼는지, 누가 이 가게의 불을 켜 두는지. 운영자의 진심과 하루하루의 기록을 읽으며 이 공간과 가까워지는 방이에요.",
  "사일로의 취향|사일로가 아끼는 노래, 맛집, 전시, 책, 장소, 그리고 물건들. 취향이 닮은 사람이 남긴 발자국을 따라 걷는 방이에요.",
  "사일로의 원래 주인들|이 물건을 사랑했던 할머니, 할아버지의 이야기. 물건보다 먼저 있었던 삶을 만나는 가장 조용한 방이에요.",
  "사일로 상점|오래된 물건에는 ‘내가 살아 있었다는 증거’가 배어 있어요. 사일로의 보물, 뮤즈, 천사들을 만나고, 새 주인을 기다리는 사연에 귀 기울여 보세요.",
  "커뮤니티|오늘의 안부부터 맛집, 공연 소식, 소소한 질문까지. 사일로의 사람들이 서로의 하루를 나누는 거실이에요. 출석 도장을 찍고 ‘예술가의 달력’을 채워 보세요.",
  "주제별 클럽 게시판 A|예술, 심리, 문학, 세계사, 과학, 경제, 정치. 깊이 파고들고 싶은 마음이 모이는 방들 — 궁금함 하나로 밤새 이야기할 사람들을 만나요.",
  "주제별 클럽 게시판 B|영화와 시리즈, 스포츠, 건강, 코미디, 따뜻한 세상, 패션, 인간집사들. 가볍게 웃고 떠들며 취향을 나누는, 조금 더 말랑한 방들이에요.",
  "요일별 클럽 모임|월요일의 반란부터 일요일 연극이 끝난 뒤까지, 매일 다른 얼굴의 모임방. 만나서 나눈 온기를 후일담으로 남기고 다음 약속을 잡아요.",
  "멤버십|나의 보물 이야기, 마음일기, 나의 아티스트, 패트론의 살롱, 비밀의 방. 조금 더 안쪽에서 나를 꺼내 놓고 서로를 깊이 알아 가는 방들이에요.",
  "갤러리|연말 시상식, 공연, 파티, 그리고 운명처럼 스쳐 간 방문자들. 살롱데상의 찬란했던 밤들을 사진으로 다시 걷는 방이에요.",
  "아카이브|미디어에 실린 사일로, 소개지, 포스터. 지나간 시간을 평생 보존해 두는 서랍이에요.",
  "고대 문명|이집트, 바빌론, 그리스. 모든 이야기의 첫 장으로 돌아가, 시간을 거슬러 걷는 도슨트예요.",
  "제국 ~ 군주|로마에서 로코코까지. 권력과 아름다움이 서로를 빚어낸 시대를 함께 산책해요.",
  "혁명 ~ 식민지|신고전주의에서 인상파까지. 세상이 뒤집히는 소리 속에서 예술이 어떻게 숨 쉬었는지 들여다봐요.",
  "프로이트|아르누보부터 대중문화까지. 무의식과 욕망이 예술을 바꿔 놓은 20세기를 따라가요.",
  "온라인 도슨트|인터넷에서 스마트폰, 그리고 A.I.의 시대까지. 지금 우리가 살아가는 이야기가 다음 세대의 아카이브가 돼요.",
  "스튜디오|사일로의 빈티지한 공간을 빌려 나만의 장면을 찍고, 물건을 빌리고, 공간을 꾸며 보세요. ‘기억의 습작’에서는 흩어진 기억을 한 장의 작품으로 남겨요.",
  "나의 수집품들|책, 영화, 음악, 아티스트, 장소, 향기, 브랜드, 그리고 나의 보물. 좋아하는 것들을 한 권의 컬렉션으로 모아 평생 간직하는 나만의 서재예요.",
  "나의 이야기|전시회, 버킷리스트, 위시리스트, 나의 공간, 마음 일기장. 오직 나를 위해 쓰는 이야기가 차곡차곡 쌓이는 방이에요.",
  "나의 타임라인|뱃지, 좋아요, 내가 쓴 글과 댓글, 팔로우, 나를 다녀간 사람들. 사일로에서 보낸 시간이 발자국이 되어 남는 나의 연대기예요.",
  "사일로 플레닛|회원마다 하나씩 갖는 작은 행성. 내 행성을 가꾸고, 다른 사람의 행성을 여행하며 서로의 우주를 구경해요.",
].join("\n");

export type GroupCopy = Record<string, string>;
export function parseGroupCopy(text: string): GroupCopy {
  const map: GroupCopy = {};
  for (const line of text.split("\n")) {
    const i = line.indexOf("|");
    if (i > 0 && line.slice(i + 1).trim()) map[line.slice(0, i).trim()] = line.slice(i + 1).trim();
  }
  return map;
}

// 묶음 이름(title)에 키가 포함되면 그 소개를 쓴다(긴 키 우선). root 전체 소개는 "@이름".
export function copyForGroup(map: GroupCopy, title: string): string | undefined {
  const keys = Object.keys(map).filter((k) => !k.startsWith("@")).sort((a, b) => b.length - a.length);
  const k = keys.find((x) => title.includes(x));
  return k ? map[k] : undefined;
}
export const copyForRoot = (map: GroupCopy, root: string): string | undefined => map[`@${root}`];
