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
};

// ---- Inspector 필드 스키마: 체크박스/드롭다운/텍스트/숫자/목록만 사용 ----

export type FieldOption = { label: string; value: string };

export type ListItemFieldDef = {
  key: string;
  label: string;
  kind: "text" | "textarea";
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
  sort: {},
  text: { text: "" },
};
