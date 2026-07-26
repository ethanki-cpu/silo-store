export type MyPageTabId =
  | "collections"
  | "wishlist"
  | "follow"
  | "salon"
  | "docent-certificate"
  | "space"
  | "exhibition"
  | "badges"
  | "comments"
  | "timeline"
  | "visitors";

export const MYPAGE_TABS: { id: MyPageTabId; label: string }[] = [
  { id: "collections", label: "나의 컬렉션" },
  { id: "wishlist", label: "나의 위시리스트" },
  { id: "follow", label: "팔로우" },
  { id: "salon", label: "나의 살롱" },
  { id: "docent-certificate", label: "나의 도슨트 수료증" },
  { id: "space", label: "나의 공간" },
  { id: "exhibition", label: "나의 전시회" },
  { id: "badges", label: "받은 배지" },
  { id: "comments", label: "내가 쓴 댓글" },
  { id: "timeline", label: "타임라인" },
  { id: "visitors", label: "방문자 기록" },
];

// "나의 컬렉션" 9개 서브메뉴. "treasure"는 orders 재사용, 나머지 8개는
// member_collections.category 값과 1:1 대응.
export type CollectionSubKey =
  | "treasure"
  | "book"
  | "movie"
  | "music"
  | "artist"
  | "place"
  | "scent"
  | "brand"
  | "era";

export const COLLECTION_SUBTABS: { key: CollectionSubKey; label: string }[] = [
  { key: "treasure", label: "나의 보물" },
  { key: "book", label: "나를 만든 책" },
  { key: "movie", label: "나를 만든 영화" },
  { key: "music", label: "나를 만든 음악" },
  { key: "artist", label: "좋아하는 예술가" },
  { key: "place", label: "좋아하는 장소" },
  { key: "scent", label: "좋아하는 향기" },
  { key: "brand", label: "좋아하는 브랜드" },
  { key: "era", label: "좋아하는 시대" },
];
