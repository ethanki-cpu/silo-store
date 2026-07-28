import { NextRequest, NextResponse } from "next/server";
import { getRequestMember } from "@/lib/serverAuth";

// EPIC-053.1: image_cleanup_queue Cleanup Job — 관리자 세션으로 도는
// Route Handler를 통해서만 실제 Storage 삭제가 일어난다(이 앱은
// service-role 키를 쓰지 않음 — CLAUDE.md). /admin/payments와 동일하게
// is_admin 게이팅. 한 번 호출에 최대 50건만 처리해 오래 걸리는 요청을
// 피한다 — 남은 항목은 다시 호출하면 이어서 처리된다.
export async function POST(request: NextRequest) {
  const requester = await getRequestMember(request);
  if (!requester?.member.is_admin) {
    return NextResponse.json({ error: "관리자만 접근할 수 있어요." }, { status: 403 });
  }

  const { data: pending, error: fetchError } = await requester.scopedClient
    .from("image_cleanup_queue")
    .select("id, storage_bucket, storage_path")
    .is("deleted_at", null)
    .limit(50);

  if (fetchError) {
    return NextResponse.json(
      { error: "정리 대상을 불러오지 못했어요.", detail: fetchError.message },
      { status: 500 },
    );
  }

  if (!pending || pending.length === 0) {
    return NextResponse.json({ processed: 0, failed: 0 });
  }

  const byBucket = new Map<string, string[]>();
  for (const row of pending) {
    const list = byBucket.get(row.storage_bucket) ?? [];
    list.push(row.storage_path);
    byBucket.set(row.storage_bucket, list);
  }

  const failedIds = new Set<string>();
  for (const [bucket, paths] of byBucket) {
    const { error: removeError } = await requester.scopedClient.storage.from(bucket).remove(paths);
    if (removeError) {
      for (const row of pending) {
        if (row.storage_bucket === bucket) failedIds.add(row.id);
      }
    }
  }

  const succeededIds = pending.filter((row) => !failedIds.has(row.id)).map((row) => row.id);

  if (succeededIds.length > 0) {
    await requester.scopedClient
      .from("image_cleanup_queue")
      .update({ deleted_at: new Date().toISOString() })
      .in("id", succeededIds);
  }

  return NextResponse.json({ processed: succeededIds.length, failed: failedIds.size });
}
