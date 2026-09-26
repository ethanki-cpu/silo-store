import { DEFAULT_DEPTHS, DEFAULT_EXPERIENCE_ROWS, DEFAULT_LOBBY_DOORS, DEFAULT_SKILL_BRANCHES } from "./membershipContentDefaults";
import { DEFAULT_GROUP_COPY } from "./tierContent";
// EPIC-065: Visual Widget Builder — 위젯 23종의 타입/라벨/아이콘/그룹/설정
// 필드 스키마를 한 곳에 모은다. 운영자는 이 파일이 선언한 체크박스/드롭다운/
// 텍스트/목록 필드로만 위젯을 설정하며, JSON을 직접 입력하지 않는다
// (settings는 여전히 page_modules.settings jsonb에 저장되지만, 그 값을
// 만들고 읽는 유일한 통로가 이 스키마 기반 Inspector 폼이다 — 관리자
// 개발모드의 원시 JSON 보기/수정은 예외적으로 남겨둔다, AdminPageEditorPage
// 참고).

export type PageModuleType =
  // 신규(EPIC-065 팔레트 23종)
  | "hero"
  | "breadcrumb"
  | "board"
  | "slide" // "Latest Posts Slider"
  | "gallery"
  | "timeline"
  | "calendar"
  | "application" // "Reservation"
  | "survey"
  | "button"
  | "cta"
  | "quote"
  | "image"
  | "video"
  | "audio"
  | "faq"
  | "search"
  | "filter"
  | "statistics"
  | "badge"
  | "divider"
  | "spacer"
  | "html"
  // EPIC-099(Phase 3): Craft.js 에디토리얼 빌더(EPIC-098)의 공용 블록 4종을
  // Native Page Builder 위젯으로도 노출 — 위젯 조합형 페이지 안에 Craft
  // 블록 하나를 섞어 쓸 수 있다. 지금까지 5개 허브 페이지가 재사용해온
  // 검증된 컴포넌트(EditorialHeroBlock/TextDirectoryBlock/NewsletterBlock/
  // MinimalFooterBlock)를 그대로 렌더링하며(PageBuilderRenderer.tsx의
  // CraftWidgetShell), 페이지 전용 블록(ShopHeroBlock 등 21종)은 범위 밖 —
  // 사용자 확인(2026-08-13): "공용 블록 4종만 위젯화".
  | "craft_hero"
  | "craft_directory"
  | "craft_newsletter"
  | "craft_footer"
  // HOTFIX-162.7(사용자 지시 — "/membership 페이지를 자유롭게 수정하게"): 멤버십 페이지의 두 핵심 섹션을
  // 코드에 고정하지 않고 위젯으로 뺐다 — 순서 변경/숨기기/다른 위젯 끼워넣기를 "페이지 수정"에서 자유롭게 한다.
  | "membership_carousel"
  | "membership_matrix"
  | "membership_depths"
  | "membership_doors"
  | "membership_skilltree"
  | "membership_experience"
  | "membership_plans"
  // 레거시(EPIC-060, 팔레트에는 없지만 기존 DB 행이 있으면 계속 렌더링)
  | "sort"
  | "text";

export const PAGE_MODULE_TYPES: PageModuleType[] = [
  "hero",
  "breadcrumb",
  "board",
  "slide",
  "gallery",
  "timeline",
  "calendar",
  "application",
  "survey",
  "button",
  "cta",
  "quote",
  "image",
  "video",
  "audio",
  "faq",
  "search",
  "filter",
  "statistics",
  "badge",
  "divider",
  "spacer",
  "html",
  "craft_hero",
  "craft_directory",
  "craft_newsletter",
  "craft_footer",
  "membership_carousel",
  "membership_matrix",
  "membership_depths",
  "membership_doors",
  "membership_skilltree",
  "membership_experience",
  "membership_plans",
];

export const PAGE_MODULE_LABELS: Record<PageModuleType, string> = {
  hero: "Hero",
  breadcrumb: "Breadcrumb",
  board: "Board",
  slide: "Latest Posts Slider",
  gallery: "Gallery",
  timeline: "Timeline",
  calendar: "Calendar",
  application: "Reservation",
  survey: "Survey",
  button: "Button",
  cta: "CTA",
  quote: "Quote",
  image: "Image",
  video: "Video",
  audio: "Audio",
  faq: "FAQ",
  search: "Search",
  filter: "Filter",
  statistics: "Statistics",
  badge: "Badge",
  divider: "Divider",
  spacer: "Spacer",
  html: "HTML",
  craft_hero: "Craft: Editorial Hero",
  craft_directory: "Craft: Text Directory",
  craft_newsletter: "Craft: Newsletter",
  craft_footer: "Craft: Minimal Footer",
  membership_carousel: "멤버십 캐러셀",
  membership_matrix: "멤버십 권한 비교표",
  membership_depths: "심연으로의 스크롤(패럴랙스)",
  membership_doors: "문 로비(앤틱 문 → 설명 캐러셀)",
  membership_skilltree: "스킬 트리(등급별 열리는 권한)",
  membership_experience: "감성적 권한 표",
  membership_plans: "멤버십 가입 카드",
  sort: "Sort (레거시)",
  text: "Text (레거시)",
};

export const PAGE_MODULE_ICONS: Record<PageModuleType, string> = {
  hero: "🏞️",
  breadcrumb: "🧭",
  board: "📋",
  slide: "🎞️",
  gallery: "🖼️",
  timeline: "🕒",
  calendar: "📅",
  application: "🗓️",
  survey: "🗳️",
  button: "🔘",
  cta: "📣",
  quote: "❝",
  image: "🖼",
  video: "🎬",
  audio: "🎵",
  faq: "❓",
  search: "🔍",
  filter: "🧰",
  statistics: "📊",
  badge: "🏷️",
  divider: "➖",
  spacer: "⬜",
  html: "🛠️",
  craft_hero: "🎞️",
  craft_directory: "🗂️",
  craft_newsletter: "✉️",
  craft_footer: "🦶",
  membership_carousel: "🎠",
  membership_matrix: "📊",
  membership_depths: "🌀",
  membership_doors: "🚪",
  membership_skilltree: "🌳",
  membership_experience: "🗝️",
  membership_plans: "💳",
  sort: "↕️",
  text: "📝",
};

// 팔레트(+ 위젯 추가)에서 위젯을 고를 때 보여줄 그룹 — 23종을 스캔하기 쉽게
// 5개 카테고리로 나눈다(레거시 sort/text는 팔레트에 노출하지 않음, 기존
// 행이 있으면 렌더링만 계속 지원).
export const WIDGET_GROUPS: { label: string; types: PageModuleType[] }[] = [
  { label: "콘텐츠", types: ["hero", "breadcrumb", "quote", "faq"] },
  {
    label: "게시판",
    types: ["board", "slide", "gallery", "timeline"],
  },
  { label: "미디어", types: ["image", "video", "audio"] },
  {
    label: "상호작용",
    types: ["calendar", "application", "survey", "button", "cta", "search", "filter"],
  },
  { label: "정보/레이아웃", types: ["statistics", "badge", "divider", "spacer"] },
  { label: "개발자 전용", types: ["html"] },
  // EPIC-099(Phase 3): Craft.js 공용 블록 4종 — 다른 위젯과 마찬가지로
  // WidgetInspectorForm의 필드 폼으로만 편집한다(더블클릭 인라인 편집이
  // 아님, Craft 페이지 자체를 편집할 때만 그 방식을 씀).
  { label: "Craft 블록", types: ["craft_hero", "craft_directory", "craft_newsletter", "craft_footer"] },
  { label: "멤버십", types: ["membership_carousel", "membership_doors", "membership_skilltree", "membership_depths", "membership_experience", "membership_matrix", "membership_plans"] },
];

// board_id 컬럼을 실제로 쓰는 위젯 — 관리자 UI가 이 목록으로 "게시판 선택"
// 드롭다운을 보여줄지 결정한다(EPIC-060부터 유지).
//
// EPIC-097(사용자 지시): timeline은 더 이상 게시판 글을 그대로 받아 그리는
// board_id 연동 위젯이 아니다 — 운영자가 직접 연/타이틀/이미지/카드
// 설명/링크를 입력하는 수동 항목 목록(settings.items, 아래 TimelineItemSettings)
// 으로 바뀌었다. 그래서 이 목록에서 제거한다(게시판 선택 드롭다운도, 기존
// 게시판 데이터 조회도 더 이상 없음) — 대신 전용 편집기(TimelineWidgetEditor)
// 가 settings를 직접 다룬다.
export const BOARD_LINKED_MODULE_TYPES: PageModuleType[] = [
  "board",
  "slide",
  "gallery",
];

// EPIC-097: 타임라인 위젯 항목 하나 — TimelineWidgetEditor(관리자)가 만들고
// AlternatingTimelineCanvas(미리보기/공개 렌더링 공용)가 읽는다. 카드
// 설명은 Block Editor와 동일하게 Tiptap JSON을 원본으로 저장하고, HTML은
// generateHTML로 뽑아낸 파생값을 함께 저장해(JSON만으로는 서버/클라 양쪽에서
// 매번 에디터를 마운트해야 렌더링할 수 있음) 공개 페이지가 에디터 없이도
// 바로 렌더링할 수 있게 한다.
export type TimelineItemSettings = {
  id: string;
  title: string;
  titleColorHex?: string;
  subtitle?: string;
  imageUrl?: string;
  cardTitle?: string;
  descriptionJson?: unknown;
  descriptionHtml?: string;
  linkUrl?: string;
  linkText?: string;
  linkTarget?: "_self" | "_blank";
  // EPIC-097 후속("게시글 연결"): "게시글에서 가져오기"로 기존 게시글의
  // 썸네일/제목/요약을 이 항목에 한 번 복사해 넣었을 때, 그 출처 게시글
  // id를 참고용으로 남긴다 — 실시간 동기화(게시글이 나중에 수정돼도 항목이
  // 따라 바뀜)는 아니다, 가져온 뒤에는 다른 필드처럼 자유롭게 수정 가능한
  // 독립된 사본. TimelineItemAccordion이 "🔗 연결됨" 배지를 보여주는 용도로만 쓴다.
  linkedPostId?: string;
};

// ---- Inspector 필드 스키마: 체크박스/드롭다운/텍스트/숫자/목록만 사용 ----

export type FieldOption = { label: string; value: string };

export type ListItemFieldDef = {
  key: string;
  label: string;
  kind: "text" | "textarea" | "image";
  placeholder?: string;
};

export type FieldDef =
  | { key: string; label: string; kind: "text"; placeholder?: string }
  | { key: string; label: string; kind: "textarea"; placeholder?: string }
  | { key: string; label: string; kind: "number"; min?: number; max?: number }
  | { key: string; label: string; kind: "checkbox" }
  | { key: string; label: string; kind: "select"; options: FieldOption[] }
  | {
      key: string;
      label: string;
      kind: "list";
      itemFields: ListItemFieldDef[];
      addLabel: string;
    };

// 위젯별 Inspector 필드 목록. board_id는 여기 포함하지 않는다 — Board 계열
// 4종은 AdminPageEditorPage가 needsBoard(BOARD_LINKED_MODULE_TYPES)로 따로
// "게시판 선택" 드롭다운을 그린다(기존 EPIC-060 패턴 유지).
export const WIDGET_FIELDS: Record<PageModuleType, FieldDef[]> = {
  hero: [
    { key: "title", label: "제목", kind: "text" },
    { key: "subtitle", label: "부제목", kind: "text" },
    { key: "description", label: "설명", kind: "textarea" },
    {
      key: "breadcrumb",
      label: "Breadcrumb",
      kind: "list",
      addLabel: "+ Breadcrumb 항목 추가",
      itemFields: [
        { key: "label", label: "이름", kind: "text" },
        { key: "href", label: "링크(선택)", kind: "text", placeholder: "/community" },
      ],
    },
  ],
  breadcrumb: [
    {
      key: "items",
      label: "Breadcrumb 항목",
      kind: "list",
      addLabel: "+ 항목 추가",
      itemFields: [
        { key: "label", label: "이름", kind: "text" },
        { key: "href", label: "링크(선택)", kind: "text", placeholder: "/community" },
      ],
    },
  ],
  board: [
    { key: "searchEnabled", label: "검색 켜기", kind: "checkbox" },
    { key: "sortEnabled", label: "정렬 켜기", kind: "checkbox" },
    { key: "paginationEnabled", label: "페이지 넘김 켜기", kind: "checkbox" },
    { key: "pageSize", label: "페이지당 개수", kind: "number", min: 1, max: 100 },
    { key: "showThumbnail", label: "썸네일 보이기", kind: "checkbox" },
    { key: "showWriteButton", label: "글쓰기 버튼 보이기", kind: "checkbox" },
    { key: "includeChildBoards", label: "하위 게시판 카드 보이기", kind: "checkbox" },
  ],
  slide: [
    { key: "title", label: "제목(비우면 게시판 이름)", kind: "text" },
    {
      key: "sort",
      label: "정렬 기준",
      kind: "select",
      options: [
        { label: "최신 글", value: "latest" },
        { label: "인기 글", value: "popular" },
      ],
    },
  ],
  gallery: [],
  timeline: [],
  calendar: [
    { key: "year", label: "연도", kind: "number", min: 2000, max: 2100 },
    { key: "month", label: "월", kind: "number", min: 1, max: 12 },
  ],
  application: [
    {
      key: "actions",
      label: "버튼 목록",
      kind: "list",
      addLabel: "+ 버튼 추가",
      itemFields: [
        { key: "label", label: "버튼 이름", kind: "text", placeholder: "예약하기" },
        { key: "href", label: "링크", kind: "text", placeholder: "/rental" },
      ],
    },
  ],
  survey: [
    { key: "question", label: "질문", kind: "text" },
    {
      key: "options",
      label: "선택지",
      kind: "list",
      addLabel: "+ 선택지 추가",
      itemFields: [{ key: "label", label: "선택지 이름", kind: "text" }],
    },
  ],
  button: [
    { key: "label", label: "버튼 이름", kind: "text" },
    { key: "href", label: "링크", kind: "text", placeholder: "/shop" },
    {
      key: "style",
      label: "스타일",
      kind: "select",
      options: [
        { label: "강조(어두운 배경)", value: "primary" },
        { label: "보조(테두리만)", value: "secondary" },
      ],
    },
  ],
  cta: [
    {
      key: "ctas",
      label: "버튼 목록",
      kind: "list",
      addLabel: "+ 버튼 추가",
      itemFields: [
        { key: "label", label: "버튼 이름", kind: "text" },
        { key: "href", label: "링크", kind: "text" },
      ],
    },
  ],
  quote: [
    { key: "text", label: "인용문", kind: "textarea" },
    { key: "author", label: "출처/작성자(선택)", kind: "text" },
  ],
  image: [
    { key: "url", label: "이미지 URL", kind: "text", placeholder: "https://..." },
    { key: "alt", label: "대체 텍스트", kind: "text" },
    { key: "caption", label: "캡션(선택)", kind: "text" },
  ],
  video: [
    { key: "url", label: "영상 URL", kind: "text", placeholder: "https://..." },
    { key: "caption", label: "캡션(선택)", kind: "text" },
  ],
  audio: [
    { key: "url", label: "오디오 URL", kind: "text", placeholder: "https://..." },
    { key: "caption", label: "캡션(선택)", kind: "text" },
  ],
  faq: [
    {
      key: "items",
      label: "질문/답변",
      kind: "list",
      addLabel: "+ 질문 추가",
      itemFields: [
        { key: "question", label: "질문", kind: "text" },
        { key: "answer", label: "답변", kind: "textarea" },
      ],
    },
  ],
  search: [{ key: "placeholder", label: "안내 문구", kind: "text" }],
  filter: [
    {
      key: "options",
      label: "필터 옵션",
      kind: "list",
      addLabel: "+ 옵션 추가",
      itemFields: [
        { key: "label", label: "옵션 이름", kind: "text" },
        { key: "value", label: "옵션 값", kind: "text" },
      ],
    },
  ],
  statistics: [
    {
      key: "items",
      label: "통계 항목",
      kind: "list",
      addLabel: "+ 항목 추가",
      itemFields: [
        { key: "label", label: "이름", kind: "text", placeholder: "회원 수" },
        { key: "value", label: "값", kind: "text", placeholder: "1,204" },
      ],
    },
  ],
  badge: [
    {
      key: "items",
      label: "배지 목록",
      kind: "list",
      addLabel: "+ 배지 추가",
      itemFields: [{ key: "label", label: "배지 이름", kind: "text" }],
    },
  ],
  divider: [],
  spacer: [{ key: "heightPx", label: "높이(px)", kind: "number", min: 4, max: 400 }],
  html: [{ key: "html", label: "HTML 코드", kind: "textarea", placeholder: "<div>...</div>" }],
  craft_hero: [
    { key: "imageUrl", label: "이미지 URL(PC)", kind: "text", placeholder: "https://..." },
    { key: "imageUrlMobile", label: "이미지 URL(모바일, 선택)", kind: "text", placeholder: "https://..." },
    { key: "eyebrow", label: "작은 상단 문구", kind: "text" },
    { key: "title", label: "제목", kind: "text" },
    { key: "subtitle", label: "부제목", kind: "text" },
  ],
  craft_directory: [
    { key: "heading", label: "제목", kind: "text" },
    {
      key: "items",
      label: "링크 목록",
      kind: "list",
      addLabel: "+ 링크 추가",
      itemFields: [
        { key: "label", label: "이름", kind: "text" },
        { key: "href", label: "링크", kind: "text", placeholder: "/silo-store" },
      ],
    },
  ],
  craft_newsletter: [
    { key: "heading", label: "제목", kind: "text" },
    { key: "subtitle", label: "부제목", kind: "text" },
    { key: "buttonText", label: "버튼 문구", kind: "text" },
  ],
  membership_carousel: [
    { key: "heading", label: "제목", kind: "text", placeholder: "멤버십 혜택 한눈에 보기" },
    { key: "subtitle", label: "부제목", kind: "textarea" },
    {
      key: "layout",
      label: "카드 배치",
      kind: "select",
      options: [
        { label: "이미지 위·글 아래(가운데 정렬)", value: "stack" },
        { label: "이미지 왼쪽·글 오른쪽", value: "side" },
      ],
    },
    {
      key: "textAlign",
      label: "글 정렬(이미지 위 배치일 때)",
      kind: "select",
      options: [
        { label: "가운데", value: "center" },
        { label: "왼쪽", value: "left" },
      ],
    },
    { key: "cardMaxWidthPx", label: "카드 최대 너비(px)", kind: "number", min: 280, max: 1200 },
    { key: "cardBackground", label: "카드 배경색(비우면 흰색, 예: #fbf6ea)", kind: "text" },
    { key: "cardRadiusPx", label: "카드 모서리 둥글기(px)", kind: "number", min: 0, max: 48 },
    { key: "cardBorder", label: "카드 테두리 보이기", kind: "checkbox" },
    { key: "accentColor", label: "강조색(가입 버튼·선택된 등급 탭, 예: #7b1d14)", kind: "text" },
    { key: "nameSizePx", label: "등급 이름 글자 크기(px)", kind: "number", min: 14, max: 72 },
    { key: "mediaWidthPx", label: "이미지/영상 너비(px)", kind: "number", min: 60, max: 1000 },
    {
      key: "mediaAspect",
      label: "이미지/영상 비율",
      kind: "select",
      options: [
        { label: "4:5 (세로)", value: "4:5" },
        { label: "3:4 (세로)", value: "3:4" },
        { label: "1:1 (정사각)", value: "1:1" },
        { label: "16:9 (가로)", value: "16:9" },
        { label: "9:16 (세로 영상)", value: "9:16" },
        { label: "원본 비율", value: "auto" },
      ],
    },
    {
      key: "mediaFit",
      label: "이미지/영상 채우기",
      kind: "select",
      options: [
        { label: "전체 보이기(잘림 없음)", value: "contain" },
        { label: "꽉 채우기(잘릴 수 있음)", value: "cover" },
      ],
    },
    { key: "mediaRadiusPx", label: "이미지 모서리 둥글기(px)", kind: "number", min: 0, max: 200 },
    { key: "mediaBorder", label: "이미지 테두리 보이기", kind: "checkbox" },
    { key: "mediaBackground", label: "이미지 뒤 배경색(비우면 연회색)", kind: "text" },
    { key: "showTabs", label: "등급 이름 탭 보이기", kind: "checkbox" },
    { key: "showArrows", label: "하단 이전/다음 버튼 보이기", kind: "checkbox" },
    { key: "showPrice", label: "월 요금 보이기", kind: "checkbox" },
    { key: "showSummary", label: "'총 N곳 이용 가능' 요약 보이기", kind: "checkbox" },
    { key: "showCategories", label: "카테고리별 이용 가능 게시판·페이지 보이기", kind: "checkbox" },
    { key: "showFullList", label: "'이용 가능한 전체 보기' 펼침 보이기(높은 등급)", kind: "checkbox" },
    { key: "showNotes", label: "요금·이용 조건 안내 보이기", kind: "checkbox" },
    { key: "showJoin", label: "가입 버튼 보이기", kind: "checkbox" },
    { key: "showLetter", label: "'소개와 편지 보기' 버튼 보이기", kind: "checkbox" },
    { key: "excludeCategories", label: "카드에서 숨길 카테고리(쉼표로 구분)", kind: "text", placeholder: "예: 마이 페이지" },
    { key: "commonNotes", label: "모든 등급 공통 안내(한 줄에 하나)", kind: "textarea" },
    { key: "firstTitle", label: "문구: 첫 등급의 열리는 세계 제목", kind: "text" },
    { key: "newTitle", label: "문구: 새로 열리는 문 제목", kind: "text" },
    { key: "perksTitle", label: "문구: 특별한 대접 제목", kind: "text" },
    { key: "fullListLabel", label: "문구: 전체 펼치기({n}=개수)", kind: "text" },
    { key: "notesTitle", label: "문구: 요금·이용 방식 제목", kind: "text" },
    { key: "storyButton", label: "문구: 편지 버튼({name}=등급 이름)", kind: "text" },
    { key: "joinLabel", label: "문구: 가입(초대장) 버튼", kind: "text" },
    { key: "groupCopy", label: "카테고리 소개 문장(한 줄에 하나, '이름|문장' · '@이름'은 큰 갈래 소개)", kind: "textarea" },
  ],
  membership_depths: [
    { key: "heading", label: "제목(비우면 표시 안 함)", kind: "text" },
    { key: "sceneHeightVh", label: "깊이 하나당 스크롤 길이(화면 높이 %)", kind: "number", min: 60, max: 300 },
  ],
  membership_doors: [
    { key: "heading", label: "제목(비우면 표시 안 함)", kind: "text" },
    { key: "subtitle", label: "부제목", kind: "text" },
    {
      key: "doors",
      label: "문(플랫폼 요소마다 하나 — 문 사진을 올리면 그 사진이 문이 되고, 누르면 열리며 뒤편에 설명 캐러셀이 나와요)",
      kind: "list",
      addLabel: "+ 문 추가",
      itemFields: [
        { key: "imageUrl", label: "앤틱 문 사진(비우면 나무문)", kind: "image" },
        { key: "title", label: "문 이름", kind: "text" },
        { key: "tagline", label: "한 줄 설명(닫힌 문 아래)", kind: "text" },
        { key: "description", label: "문 뒤편 첫 설명(줄바꿈 가능)", kind: "textarea" },
        { key: "extra", label: "추가 슬라이드(빈 줄로 슬라이드를 구분)", kind: "textarea" },
        { key: "href", label: "들어가기 링크(예: /shop)", kind: "text" },
        { key: "hrefLabel", label: "링크 버튼 문구", kind: "text" },
        { key: "accent", label: "빛 색(#RRGGBB)", kind: "text" },
      ],
    },
  ],
  membership_skilltree: [
    { key: "heading", label: "제목", kind: "text" },
    { key: "subtitle", label: "부제목", kind: "text" },
    {
      key: "branches",
      label: "가지(등급이 오를 때 새로 열리는 권한) — 등급 번호: 0 Silo Angel · 1 Alice · 2 Great Gatsby · 3 Patron · 4 Lautrec · 99 Artist",
      kind: "list",
      addLabel: "+ 가지 추가",
      itemFields: [
        { key: "rank", label: "열리는 등급 번호", kind: "text" },
        { key: "icon", label: "아이콘(이모지)", kind: "text" },
        { key: "title", label: "이름", kind: "text" },
        { key: "desc", label: "한 줄 설명", kind: "text" },
      ],
    },
  ],
  membership_experience: [
    { key: "heading", label: "제목", kind: "text" },
    { key: "subtitle", label: "부제목", kind: "textarea" },
    {
      key: "rows",
      label: "경험 행(칸이 🔒로 시작하면 흐린 자물쇠 칸, '-'는 빈 칸)",
      kind: "list",
      addLabel: "+ 행 추가",
      itemFields: [
        { key: "label", label: "경험 이름", kind: "text" },
        { key: "sub", label: "괄호 설명", kind: "text" },
        { key: "guest", label: "비회원", kind: "text" },
        { key: "angel", label: "Silo Angel", kind: "text" },
        { key: "alice", label: "Alice", kind: "text" },
        { key: "gatsby", label: "Great Gatsby", kind: "text" },
        { key: "patron", label: "Patron", kind: "text" },
        { key: "lautrec", label: "Lautrec & Artist", kind: "text" },
      ],
    },
  ],
  membership_matrix: [
    { key: "heading", label: "제목", kind: "text", placeholder: "자리마다 열리는 문, 한눈에" },
    { key: "subtitle", label: "부제목", kind: "textarea" },
    { key: "showConditions", label: "요금·이용 조건 비교 보이기", kind: "checkbox" },
    { key: "expandAll", label: "카테고리를 처음부터 펼쳐서 보이기", kind: "checkbox" },
    { key: "excludeCategories", label: "표에서 숨길 카테고리(쉼표로 구분)", kind: "text" },
  ],
  membership_plans: [
    { key: "showPlanCards", label: "등급별 소개 카드도 함께 보이기(캐러셀 카드와 같은 내용이라 보통 끔)", kind: "checkbox" },
  ],
  craft_footer: [
    {
      key: "items",
      label: "링크 목록",
      kind: "list",
      addLabel: "+ 링크 추가",
      itemFields: [
        { key: "label", label: "이름", kind: "text" },
        { key: "href", label: "링크", kind: "text", placeholder: "/about-silo" },
      ],
    },
    { key: "copyright", label: "저작권 문구", kind: "text" },
  ],
  sort: [],
  text: [{ key: "text", label: "내용", kind: "textarea" }],
};

// 새 위젯을 추가할 때 settings에 채워 넣을 기본값 — 전부 "빈 화면"이 아니라
// 바로 눈에 보이는 placeholder 값으로 시작해 운영자가 빈 위젯을 보고
// 당황하지 않게 한다.
export const WIDGET_DEFAULT_SETTINGS: Record<PageModuleType, Record<string, unknown>> = {
  hero: {
    title: "제목을 입력하세요",
    subtitle: "",
    description: "설명을 입력하세요",
    breadcrumb: [{ label: "홈", href: "/" }, { label: "제목을 입력하세요" }],
  },
  breadcrumb: { items: [{ label: "홈", href: "/" }] },
  board: {
    searchEnabled: true,
    sortEnabled: true,
    paginationEnabled: true,
    pageSize: 10,
    showThumbnail: true,
    showWriteButton: true,
    includeChildBoards: true,
  },
  slide: { title: "", sort: "latest" },
  gallery: {},
  timeline: { items: [] },
  calendar: {},
  application: { actions: [{ label: "신청하기", href: "/" }] },
  survey: { question: "질문을 입력하세요", options: [{ label: "선택지 1" }, { label: "선택지 2" }] },
  button: { label: "버튼", href: "/", style: "primary" },
  cta: { ctas: [{ label: "버튼", href: "/" }] },
  quote: { text: "인용문을 입력하세요", author: "" },
  image: { url: "", alt: "", caption: "" },
  video: { url: "", caption: "" },
  audio: { url: "", caption: "" },
  faq: { items: [{ question: "질문을 입력하세요", answer: "답변을 입력하세요" }] },
  search: { placeholder: "검색" },
  filter: { options: [] },
  statistics: { items: [{ label: "항목", value: "0" }] },
  badge: { items: [{ label: "NEW" }] },
  divider: {},
  spacer: { heightPx: 32 },
  html: { html: "" },
  craft_hero: {
    imageUrl: "https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=1600&q=80&auto=format",
    eyebrow: "Silo Store — Issue No. 01",
    title: "제목을 입력하세요",
    subtitle: "부제목을 입력하세요",
  },
  craft_directory: {
    heading: "더 알아보기",
    items: [
      { label: "사일로 상점", href: "/silo-store" },
      { label: "온라인 도슨트", href: "/online-docent" },
    ],
  },
  craft_newsletter: {
    heading: "사일로의 소식을 받아보세요",
    subtitle: "새로운 컬렉션과 살롱 소식을 가장 먼저 전해드립니다.",
    buttonText: "구독하기",
  },
  membership_carousel: {
    heading: "당신은 어떤 ‘사일로의 사람’이 되고 싶으세요?",
    subtitle: "첫눈처럼 찾아온 사람부터 예술가의 곁을 지키는 후원자까지. 옆으로 넘기며 지금의 나에게 맞는 자리를 찾아보세요. 새로운 자리는 앞선 자리의 문을 모두 품고 있어요.",
    layout: "stack",
    textAlign: "center",
    cardMaxWidthPx: 672,
    cardBackground: "",
    cardRadiusPx: 12,
    cardBorder: true,
    accentColor: "",
    nameSizePx: 26,
    mediaWidthPx: 260,
    mediaAspect: "4:5",
    mediaFit: "contain",
    mediaRadiusPx: 10,
    mediaBorder: true,
    mediaBackground: "",
    showTabs: true,
    showArrows: true,
    showPrice: true,
    showSummary: true,
    showCategories: true,
    showFullList: true,
    showNotes: true,
    showJoin: true,
    showLetter: true,
    excludeCategories: "",
    commonNotes: "사일로 상점에서 물건을 만날 때마다 포인트가 쌓여요",
    firstTitle: "이 자리에서 열리는 세계",
    newTitle: "이 자리에서 새롭게 열리는 문",
    perksTitle: "이 자리에서만 받는 특별한 대접",
    fullListLabel: "지금까지 열린 {n}개의 문 모두 펼쳐보기",
    notesTitle: "마음 편히 알아두세요 · 요금과 이용 방식",
    storyButton: "✉ {name}의 이야기와 편지 읽기",
    joinLabel: "초대장 열어보기",
    groupCopy: DEFAULT_GROUP_COPY,
  },
  membership_depths: { heading: "", sceneHeightVh: 130, depths: DEFAULT_DEPTHS },
  membership_doors: { heading: "사일로의 문을 열어보세요", subtitle: "문을 눌러 안으로 들어가 보세요", doors: DEFAULT_LOBBY_DOORS },
  membership_skilltree: { heading: "등급이 오를수록 열리는 문", subtitle: "Silo Angel에서 시작해 한 걸음씩, 새 가지가 열려요", branches: DEFAULT_SKILL_BRANCHES },
  membership_experience: {
    heading: "사일로에서의 경험, 한눈에",
    subtitle: "자리마다 열리는 세계를 은유로 담았어요. 흐리게 잠긴 곳은 다음 자리에서 열려요.",
    rows: DEFAULT_EXPERIENCE_ROWS,
  },
  membership_matrix: {
    heading: "자리마다 열리는 문, 한눈에",
    subtitle: "🗝️ 열려 있어요 · 🔒 아직 잠겨 있어요. 방 이름을 눌러 그곳에서 어떤 이야기가 기다리는지 펼쳐보세요.",
    showConditions: true,
    expandAll: false,
    excludeCategories: "",
  },
  membership_plans: { showPlanCards: false },
  craft_footer: {
    items: [{ label: "About Silo", href: "/about-silo" }],
    copyright: "© Silo Store. All rights reserved.",
  },
  sort: {},
  text: { text: "" },
};
