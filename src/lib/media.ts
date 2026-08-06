// EPIC-082: Universal Media Library — 서버(Route Handler)와 클라이언트(향후
// 에디터/갤러리/히어로 위젯 통합, EPIC-083) 양쪽에서 공유하는 타입 정의.
// 이 파일은 이번 EPIC 범위(백엔드/타입만)에 맞춰 순수 타입/상수만 담고,
// 실제 Tiptap 노드 스키마(blockEditorCore.ts)나 에디터 UI는 건드리지
// 않는다 — 데이터 계약 상세는 docs/media-architecture.md 참고.

/** media_library 테이블 한 행(row)의 서버 사이드 형태. */
export type MediaAsset = {
  id: string;
  userId: string | null;
  fileUrl: string;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  width: number | null;
  height: number | null;
  /** 영상 길이(초). 이미지는 항상 null. */
  duration: number | null;
  altText: string | null;
  createdAt: string;
};

/** media_library.select("*") 원본 행(snake_case) → MediaAsset(camelCase) 변환. */
export type MediaLibraryRow = {
  id: string;
  user_id: string | null;
  file_url: string;
  file_name: string;
  mime_type: string;
  size_bytes: number;
  width: number | null;
  height: number | null;
  duration: number | null;
  alt_text: string | null;
  created_at: string;
};

export function mediaAssetFromRow(row: MediaLibraryRow): MediaAsset {
  return {
    id: row.id,
    userId: row.user_id,
    fileUrl: row.file_url,
    fileName: row.file_name,
    mimeType: row.mime_type,
    sizeBytes: row.size_bytes,
    width: row.width,
    height: row.height,
    duration: row.duration,
    altText: row.alt_text,
    createdAt: row.created_at,
  };
}

/** POST /api/media/presigned 요청 바디. */
export type PresignedUploadRequest = {
  fileName: string;
  fileType: string;
  fileSize: number;
};

/** POST /api/media/presigned 응답 바디. */
export type PresignedUploadResponse = {
  /** 브라우저가 PUT으로 R2에 직접 업로드할 pre-signed URL (5분 유효). */
  uploadUrl: string;
  /** 업로드 완료 후 실제 접근 가능한 R2 CDN URL — media_library.file_url에 저장. */
  publicUrl: string;
  /** R2 버킷 내부 객체 키. */
  fileKey: string;
};

/**
 * EPIC-082/083 경계: 이번 EPIC은 media_library 테이블 + 업로드 파이프라인만
 * 만든다. `UniversalMediaBlockAttrs`는 다음 EPIC(083, UI 연동)에서
 * blockEditorCore.ts의 FigureImage/Gallery 같은 Tiptap 노드가 media_id를
 * 참조하도록 확장할 때 쓸 목표 스펙을 미리 문서화해둔 것 — 아직 어떤
 * 실제 Tiptap 노드도 이 타입을 사용하지 않는다(하위 호환을 위해 기존
 * src/lib/blockEditorCore.ts의 FigureImageAttrs/GalleryImageAttrs는 이번
 * EPIC에서 변경하지 않았음, 상세는 docs/media-architecture.md 참고).
 */
export type UniversalMediaBlockAttrs = {
  /** media_library.id — 이 블록이 참조하는 미디어 자산. */
  mediaId: string;
  /** media_library 조회 실패/삭제 시 폴백으로 쓸 수 있는 마지막으로 알려진 URL(선택). */
  fallbackUrl?: string | null;
  caption: string;
  featured: boolean;
};
