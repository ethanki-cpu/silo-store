// EPIC-096(요구사항 3.1): 게시글 상세를 이루는 재배치 가능한 5개 블록.
// widget_settings.postLayoutOrder에 저장되는 값의 shape이 곧 이 배열이라,
// 관리자 폼(BoardForm.tsx/PostLayoutOrderEditor.tsx)과 실제 렌더링
// (PostDetailClient.tsx) 양쪽이 이 파일 하나를 공유해 타입이 어긋나지 않게 한다.
export type PostLayoutBlock = "meta" | "tags" | "body" | "actions" | "comments";

export const DEFAULT_POST_LAYOUT_ORDER: PostLayoutBlock[] = ["meta", "tags", "body", "actions", "comments"];

export const POST_LAYOUT_BLOCK_LABELS: Record<PostLayoutBlock, { label: string; hint: string }> = {
  meta: { label: "메타데이터", hint: "글 번호 · 날짜 · 작성자 · 제목" },
  tags: { label: "태그", hint: "카테고리/도슨트/개념글 태그 칩" },
  body: { label: "본문", hint: "글 내용" },
  actions: { label: "좋아요 · 북마크", hint: "인라인 액션 버튼 행" },
  comments: { label: "댓글", hint: "댓글 목록 + 작성 폼" },
};

// widget_settings.postLayoutOrder는 관리자가 자유 형식 JSON을 만질 수 있는
// 필드는 아니지만(오직 이 드래그 UI로만 씀), DB에 남아있는 값이 예전 버전의
// 블록 이름을 담고 있거나 일부 블록이 누락된 경우를 대비해 항상 5개 블록을
// 정확히 한 번씩만 포함하도록 정규화한다 — 하나라도 어긋나면 기본 순서로
// 안전하게 되돌아간다(잘못된 값으로 게시글 화면 일부가 사라지는 사고 방지).
export function normalizePostLayoutOrder(raw: unknown): PostLayoutBlock[] {
  if (!Array.isArray(raw)) return DEFAULT_POST_LAYOUT_ORDER;
  const set = new Set(raw.filter((v): v is PostLayoutBlock => typeof v === "string" && v in POST_LAYOUT_BLOCK_LABELS));
  if (set.size !== DEFAULT_POST_LAYOUT_ORDER.length) return DEFAULT_POST_LAYOUT_ORDER;
  return raw as PostLayoutBlock[];
}
