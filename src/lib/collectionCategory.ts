// EPIC-095(요구사항 1.2): "내 컬렉션에 담기" 버튼이 보여줄 추천
// 카테고리(member_collections.category, 8종) 추정 — 정답을 강제하지 않고
// CollectButton.tsx의 팝오버에서 사용자가 최종 확정하므로, 여기서는
// "가장 그럴듯한 기본 선택지"만 고른다.
//
// - 도슨트 콘텐츠는 figure_name(특정 인물)이 있으면 'artist', era(시대
//   분류)가 있으면 그 요청서 예시 그대로 'era'.
// - 도슨트로 태그된 게시판 글(is_docent_post)도 같은 축(시대/예술사)이라
//   'era'로 맞춘다.
// - 그 외 일반 게시글은 8종 어디에도 깔끔히 대응하지 않는다 — "책"을
//   기본값으로 둔다(읽는 콘텐츠라는 가장 무난한 기본 프레임), 실제로는
//   팝오버에서 사용자가 거의 항상 재선택할 것을 전제로 한 최소한의 기본값.
export function guessDocentCollectionCategory(content: {
  era?: string | null;
  figure_name?: string | null;
}): string {
  if (content.figure_name) return "artist";
  if (content.era) return "era";
  return "era";
}

export function guessPostCollectionCategory(post: { is_docent_post?: boolean }): string {
  if (post.is_docent_post) return "era";
  return "book";
}
