import type { SupabaseClient } from "@supabase/supabase-js";
import { collectStoragePaths, type JSONContent, type StorageRef } from "./blockEditorCore";

// EPIC-053.1: 이미지 Garbage Collection — 게시글 수정/삭제로 더 이상
// 참조되지 않는 이미지를 "즉시 삭제"하지 않고 image_cleanup_queue에
// 적재만 한다. 실제 Storage 삭제는 관리자 전용 Cleanup Job
// (POST /api/admin/storage-cleanup)이 나중에 처리한다 — 이 앱은
// service-role 키를 쓰지 않으므로(CLAUDE.md) 삭제도 RLS를 통과해야 하고,
// 사용자 요청 처리 중 동기적으로 Storage를 지우면 트랜잭션 실패/경합 시
// "게시글엔 없는데 실제로는 안 지워진" 이미지가 남는 문제를 피할 수
// 있다.

/** 게시글 수정 시, 이전 본문에는 있었지만 새 본문에는 없는 이미지를 큐에 적재한다. */
export async function enqueueOrphanedImages(
  scopedClient: SupabaseClient,
  postId: string,
  oldJson: JSONContent | null | undefined,
  newJson: JSONContent | null | undefined,
) {
  const oldRefs = collectStoragePaths(oldJson);
  const newKeys = new Set(collectStoragePaths(newJson).map((r) => `${r.bucket}/${r.path}`));
  const orphaned = oldRefs.filter((r) => !newKeys.has(`${r.bucket}/${r.path}`));
  await enqueue(scopedClient, postId, orphaned, "post_edited_orphan");
}

/** 게시글 삭제 시, 본문에 포함된 모든 이미지를 큐에 적재한다. */
export async function enqueueAllImages(
  scopedClient: SupabaseClient,
  postId: string,
  json: JSONContent | null | undefined,
) {
  const refs = collectStoragePaths(json);
  await enqueue(scopedClient, postId, refs, "post_deleted");
}

async function enqueue(
  scopedClient: SupabaseClient,
  postId: string,
  refs: StorageRef[],
  reason: "post_deleted" | "post_edited_orphan",
) {
  if (refs.length === 0) return;
  // image_cleanup_queue가 라이브 DB에 아직 없을 수 있어(마이그레이션 전,
  // docs/sql/epic-053-1.sql 참고) 실패해도 조용히 무시한다 — GC는
  // 부가 기능이라 게시글 수정/삭제 자체를 막아서는 안 된다.
  await scopedClient
    .from("image_cleanup_queue")
    .insert(
      refs.map((r) => ({
        storage_bucket: r.bucket,
        storage_path: r.path,
        reason,
        related_post_id: postId,
      })),
    )
    .then(
      () => {},
      () => {},
    );
}
