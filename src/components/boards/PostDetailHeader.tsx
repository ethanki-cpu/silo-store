import Link from "next/link";
import type { CSSProperties, ReactNode } from "react";

// HOTFIX-093-B(요구사항 1.3): '게시물 출력방식' 설정에서 관리자가 고른
// 날짜/작성자 스타일 — boards.widget_settings.postMetaStyle(JSON)로
// 저장/전달된다(src/components/admin/BoardForm.tsx 참고).
export type PostMetaStyle = {
  dateSizePx?: number;
  dateColorHex?: string;
  fontWeight?: number;
  position?: "left" | "center" | "right";
  // 사용자 지시(2026-08-12): "수정 YYYY.MM.DD" 줄을 아예 숨길 수 있게.
  hideUpdatedDate?: boolean;
  // 사용자 지시(2026-08-12): 글번호/날짜/제목/작성자/좋아요·조회·댓글 각각
  // 폰트를 따로 지정할 수 있게 — CSS font-family 문자열을 그대로 받는다
  // (Navbar.tsx의 커스텀 폰트 입력과 동일한 자유 입력 방식, 이 프로젝트는
  // 폰트 선택 UI를 만들지 않고 항상 CSS 값을 직접 받는 관례).
  dateFontFamily?: string;
  // HOTFIX-099(사용자 지시): 글 번호("No. X")/작성자 이름을 날짜와 별도로
  // 크기/색상만 지정할 수 있게 한다(굵기/정렬은 날짜와 공유 — 셋 다 같은
  // 메타 정보 블록이라 서로 다른 정렬을 갖는 경우는 상정하지 않음).
  postNumberSizePx?: number;
  postNumberColorHex?: string;
  postNumberFontFamily?: string;
  authorNameSizePx?: number;
  authorNameColorHex?: string;
  authorNameFontFamily?: string;
  // 사용자 지시(2026-08-12): 제목은 지금까지 크기/색상 없이 폰트만 지정
  // 가능하게 한다(제목 자체 크기는 이미 반응형 h1 스타일로 고정돼 있어,
  // 여기서 갑자기 임의 크기를 허용하면 레이아웃이 깨지기 쉽다 — 폰트만).
  titleFontFamily?: string;
  // 사용자 지시(2026-08-12): "좋아요 · 조회 · 댓글" 통계 줄 — 지금까지
  // 전혀 스타일을 지정할 수 없었다. 세 값이 항상 한 줄에 나란히 붙어
  // 나오므로(statParts.join(" · ")) 하나로 묶어 크기/색상/폰트를 지정한다.
  statSizePx?: number;
  statColorHex?: string;
  statFontFamily?: string;
};

export function metaStyleToCss(metaStyle: PostMetaStyle | undefined | null): CSSProperties {
  if (!metaStyle) return {};
  return {
    ...(metaStyle.dateSizePx ? { fontSize: metaStyle.dateSizePx } : {}),
    ...(metaStyle.dateColorHex ? { color: metaStyle.dateColorHex } : {}),
    ...(metaStyle.dateFontFamily ? { fontFamily: metaStyle.dateFontFamily } : {}),
    ...(metaStyle.fontWeight ? { fontWeight: metaStyle.fontWeight } : {}),
    ...(metaStyle.position ? { textAlign: metaStyle.position } : {}),
  };
}

function postNumberStyleToCss(metaStyle: PostMetaStyle | undefined | null): CSSProperties {
  if (!metaStyle) return {};
  return {
    ...(metaStyle.postNumberSizePx ? { fontSize: metaStyle.postNumberSizePx } : {}),
    ...(metaStyle.postNumberColorHex ? { color: metaStyle.postNumberColorHex } : {}),
    ...(metaStyle.postNumberFontFamily ? { fontFamily: metaStyle.postNumberFontFamily } : {}),
    ...(metaStyle.fontWeight ? { fontWeight: metaStyle.fontWeight } : {}),
    ...(metaStyle.position ? { textAlign: metaStyle.position } : {}),
  };
}

function authorNameStyleToCss(metaStyle: PostMetaStyle | undefined | null): CSSProperties {
  if (!metaStyle) return {};
  return {
    ...(metaStyle.authorNameSizePx ? { fontSize: metaStyle.authorNameSizePx } : {}),
    ...(metaStyle.authorNameColorHex ? { color: metaStyle.authorNameColorHex } : {}),
    ...(metaStyle.authorNameFontFamily ? { fontFamily: metaStyle.authorNameFontFamily } : {}),
    ...(metaStyle.fontWeight ? { fontWeight: metaStyle.fontWeight } : {}),
    ...(metaStyle.position ? { textAlign: metaStyle.position } : {}),
  };
}

function titleStyleToCss(metaStyle: PostMetaStyle | undefined | null): CSSProperties {
  if (!metaStyle) return {};
  return {
    ...(metaStyle.titleFontFamily ? { fontFamily: metaStyle.titleFontFamily } : {}),
  };
}

function statStyleToCss(metaStyle: PostMetaStyle | undefined | null): CSSProperties {
  if (!metaStyle) return {};
  return {
    ...(metaStyle.statSizePx ? { fontSize: metaStyle.statSizePx } : {}),
    ...(metaStyle.statColorHex ? { color: metaStyle.statColorHex } : {}),
    ...(metaStyle.statFontFamily ? { fontFamily: metaStyle.statFontFamily } : {}),
  };
}

// EPIC-046/047: Editorial Magazine 게시글 헤더 — 좌측 글 번호/작성일, 가운데
// 큰 제목, 우측 Author/작성자(프로필 링크). 좋아요/조회/댓글 수는 Board
// Engine(EPIC-047) 공통 통계 라인으로 표시.
// EPIC-079-PHASE-5: 대표 이미지를 이 헤더 아래 Full Width 배너로 보여주던
// 동작을 제거했다 — 대표 이미지는 목록/카드 썸네일 전용이지 게시물 자체의
// 내용에 영향을 주면 안 된다는 신고(같은 사진이 배너+본문 두 번 보이는
// 것처럼 느껴짐)에 따라, 상세 화면에서는 본문(PostBody)에 사용자가 실제로
// 넣은 이미지만 보인다.
export function PostDetailHeader({
  postNumber,
  createdAt,
  updatedAt,
  title,
  authorId,
  authorName,
  likeCount,
  viewCount,
  commentCount,
  badges,
  showLikes = true,
  showComments = true,
  showViewCount = true,
  editHref,
  onDelete,
  deleting,
  metaStyle,
}: {
  postNumber: number | null;
  createdAt: string;
  updatedAt?: string;
  title: string;
  authorId: string;
  authorName: string;
  likeCount: number;
  viewCount: number | null;
  commentCount: number;
  badges?: ReactNode;
  // EPIC-066: 게시판 관리의 좋아요/댓글/조회수 사용 여부 토글.
  showLikes?: boolean;
  showComments?: boolean;
  showViewCount?: boolean;
  /** 작성자 본인(또는 관리자)에게만 전달 — 있으면 "수정" 링크를 보여준다. */
  editHref?: string;
  /** 작성자 본인(또는 관리자)에게만 전달 — 있으면 "삭제" 버튼을 보여준다. */
  onDelete?: () => void;
  deleting?: boolean;
  /** HOTFIX-093-B(요구사항 1.3): 게시판별 날짜/작성자 커스텀 스타일. */
  metaStyle?: PostMetaStyle | null;
}) {
  const statParts = [
    ...(showLikes ? [`좋아요 ${likeCount}`] : []),
    ...(showViewCount ? [`조회 ${viewCount ?? 0}`] : []),
    ...(showComments ? [`댓글 ${commentCount}`] : []),
  ];
  // 사용자 지시(2026-08-12): "수정 YYYY.MM.DD" 줄 자체를 숨길 수 있게.
  const wasEdited = updatedAt && updatedAt !== createdAt && !metaStyle?.hideUpdatedDate;
  const metaCss = metaStyleToCss(metaStyle);
  const postNumberCss = postNumberStyleToCss(metaStyle);
  const authorNameCss = authorNameStyleToCss(metaStyle);
  const titleCss = titleStyleToCss(metaStyle);
  const statCss = statStyleToCss(metaStyle);

  return (
    <div>
      <div className="grid grid-cols-1 md:grid-cols-[1fr_2fr_1fr] gap-4 md:gap-8 items-start">
        <div className="order-2 md:order-1">
          {postNumber !== null && (
            <p className="text-xs uppercase tracking-wide text-gray-400" style={postNumberCss}>
              No. {postNumber}
            </p>
          )}
          <p className="text-xs uppercase tracking-wide text-gray-400 mt-1" style={metaCss}>
            {new Date(createdAt).toLocaleDateString()}
          </p>
          {wasEdited && (
            <p className="text-xs uppercase tracking-wide text-gray-300 mt-1" style={metaCss}>
              수정 {new Date(updatedAt!).toLocaleDateString()}
            </p>
          )}
        </div>

        <div className="order-1 md:order-2 text-center">
          {badges && (
            <div className="flex items-center justify-center gap-2 mb-3">
              {badges}
            </div>
          )}
          <h1 className="font-serif text-2xl sm:text-3xl font-bold leading-snug text-gray-900" style={titleCss}>
            {title}
          </h1>
          {statParts.length > 0 && (
            <p className="text-xs uppercase tracking-wide text-gray-400 mt-3" style={statCss}>
              {statParts.join(" · ")}
            </p>
          )}
        </div>

        <div className="order-3 md:text-right">
          <p className="text-xs uppercase tracking-wide text-gray-400">
            Author
          </p>
          <Link
            href={`/u/${authorId}`}
            className="text-sm font-medium text-gray-800 mt-1 block hover:underline"
            style={authorNameCss}
          >
            {authorName}
          </Link>
          {editHref && (
            <Link href={editHref} className="text-xs text-gray-400 hover:underline hover:text-gray-600 mt-2 block">
              수정
            </Link>
          )}
          {onDelete && (
            <button
              type="button"
              onClick={onDelete}
              disabled={deleting}
              className="text-xs text-gray-400 hover:underline hover:text-red-600 mt-1 block ml-auto disabled:opacity-50"
            >
              {deleting ? "삭제 중..." : "삭제"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
