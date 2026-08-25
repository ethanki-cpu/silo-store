import type { BoardDefinition, BoardPost, HubFeed, HubChildBoard } from "@/lib/boardLayout";
import type { PostMetaStyle } from "@/components/boards/PostDetailHeader";

// EPIC-066: Renderer Registry가 공유하는 단일 props 계약 — 모든 Renderer가
// 같은 모양을 받고, 자신에게 필요한 필드만 골라 쓴다(hub는 posts를 안 쓰고
// hubFeed/hubChildBoards를 쓰는 식). 이렇게 하면 BoardRendererRegistry가
// board_type을 몰라도 "이 props로 이 컴포넌트를 그린다"만 알면 되므로
// switch/case 없이 확장 가능하다 — 새 레이아웃을 추가할 때는 Renderer
// 컴포넌트 하나 + registry.ts에 한 줄만 추가하면 된다.
export type BoardRendererProps = {
  definition: BoardDefinition;
  boardId: string;
  posts: BoardPost[];
  isQna: boolean;
  hubFeed?: HubFeed;
  hubChildBoards?: HubChildBoard[];
  // EPIC-065: Board Widget "썸네일" 토글.
  showThumbnail?: boolean;
  // EPIC-066: 게시글이 아니라 게시판 단위 속성인 카테고리 — Story/
  // Community/Gallery Renderer가 태그 칩으로 함께 보여준다.
  boardCategory?: string | null;
  // EPIC-092 후속: 갤러리 레이아웃 설정(boards.widget_settings에서 옴) —
  // GalleryRenderer만 쓰고 나머지 Renderer는 무시한다(hubFeed/hubChildBoards와
  // 동일한 "필요한 것만 골라 쓰는" 관례).
  galleryLayout?: "masonry" | "grid";
  galleryColumns?: number;
  // 사용자 신고(2026-08-12): "게시판 수정"에서 썸네일 크기를 직접 지정할
  // 수 있게 — 없으면 galleryColumns 기반 자동 계산(EPIC-096) 그대로.
  galleryThumbnailMaxPx?: number;
  // EPIC-092 후속 2차: 호버 시 이미지 슬라이드 자동 전환 여부(기본 false —
  // 좌우 화살표로 직접 넘김). 영상은 이 값과 무관하게 항상 자동재생.
  galleryHoverAutoSlide?: boolean;
  // HOTFIX-097(사용자 지시): 타임라인 배치 방향(boards.widget_settings에서
  // 옴) — TimelineRenderer만 쓰고 나머지 Renderer는 무시한다.
  timelineOrientation?: "vertical" | "horizontal";
  // false면 hover 시 썸네일+본문 일부 미리보기 카드를 띄우지 않는다(기본 true).
  timelineShowPreview?: boolean;
  // HOTFIX-098(사용자 신고 — "정렬을 가운데로 했는데 아무것도 안 바뀌어"):
  // "게시물 출력방식"(날짜/작성자 스타일, HOTFIX-093-B)이 지금까지
  // 게시글 상세 페이지(PostDetailHeader)에만 적용되고 목록/위젯 쪽엔 전혀
  // 반영되지 않았다 — 같은 폼 안에 있어 게시판 전체에 적용되는 설정으로
  // 오해하기 쉽다. 일단 사용자가 실제로 신고한 TimelineRenderer에만
  // 적용한다(다른 Renderer는 무시, 범위 확장 시 별도 확인 필요).
  postMetaStyle?: PostMetaStyle | null;
  // HOTFIX-100(사용자 지시): 타임라인 선/마커 색상 — 게시판마다 다르게
  // 지정할 수 있다(기본은 회색). TimelineRenderer만 쓴다.
  timelineAccentColorHex?: string;
  // HOTFIX-103(사용자 지시 — "타임라인 아직도 구리다"): 선 굵기(px)/마커
  // 크기(px)/미리보기 카드 테마(라이트·다크). 전부 미지정이면 TimelineView의
  // 기본값(선 2px, 마커 14px, 라이트)을 쓴다.
  timelineLineWidthPx?: number;
  timelineMarkerSizePx?: number;
  timelineCardTheme?: "light" | "dark";
  // EPIC-147-후속(사용자 지시 — "타임라인의 윗부분... 위아래 폭이 너무
  // 좁아 설정할수 있게 해줘"): TimelineNgRenderer(클래식 TimelineJS3)의
  // 슬라이드(미디어+제목+설명) 영역 높이(px) — boards.widget_settings에서
  // 옴, TimelineNgRenderer만 쓴다.
  timelineNgStageHeightPx?: number;
};
