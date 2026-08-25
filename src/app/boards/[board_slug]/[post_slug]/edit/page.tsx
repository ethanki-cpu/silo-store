"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/lib/AuthProvider";
import { PostForm, type PostFormSubmitPayload } from "@/components/boards/PostForm";
import { CategoryBoardPicker } from "@/components/common/CategoryBoardPicker";
import { useBoardOptions, useSelectedBoardTypeAndCategory } from "@/lib/useBoardOptions";
import { buildAdminTree } from "@/lib/adminTreeGrouping";
import type { JSONContent } from "@/lib/blockEditorCore";
import { resolveBoardDefinition } from "@/lib/boardLayout";

// EPIC-053.1: 게시글 수정 — Board Engine의 모든 게시판이 write와 동일한
// PostForm/BlockEditor를 재사용한다(새 Editor 생성 금지). JSON Block이
// 정본이므로 body_json을 그대로 에디터에 복원한다.
// EPIC-079-PHASE-2: URL이 board slug / post slug 기반으로 바뀌었다 — slug는
// 수정해도 바뀌지 않으므로(URL 안정성), 저장 후에도 같은 postSlug로 돌아간다.
// EPIC-079-PHASE-4: "새 글 쓰기"에 있던 동적 "게시될 페이지 선택"
// 드롭다운이 수정 폼에는 없고, 대신 board_type별 고정 하위 "카테고리"
// 드롭다운(getPostCategories)만 남아있던 불일치를 해소 — write와 동일하게
// 전체 게시판 목록을 fetch해 바인딩하고(초기값=현재 글이 속한 게시판),
// 다른 게시판을 고르면 저장 시 실제로 그 게시판으로 옮긴다(PATCH API의
// targetBoardSlug).
export default function EditPostPage() {
  const { board_slug: boardSlug, post_slug: postSlug } = useParams<{
    board_slug: string;
    post_slug: string;
  }>();
  const { session, member, memberLoading } = useAuth();
  const router = useRouter();

  const [loadingPost, setLoadingPost] = useState(true);
  const [notAllowed, setNotAllowed] = useState(false);
  const [post, setPost] = useState<{
    id: string;
    title: string;
    body: string;
    body_json: JSONContent | null;
    tags: string[] | null;
    is_docent_post: boolean;
    author_id: string;
    author_name?: string;
    featured_image_url: string | null;
    featured_image_path: string | null;
    thumbnail_visible: boolean | null;
    category: string | null;
    created_at: string;
    additionalBoardSlugs?: string[];
    timeline_year?: number | null;
    timeline_end_year?: number | null;
    timeline_display_date?: string | null;
  } | null>(null);
  const [existingTags, setExistingTags] = useState<string[]>([]);
  // HOTFIX-093-B(요구사항 1.2): 주 게시판 외에 추가로 노출 중인 게시판 목록.
  const [additionalBoardSlugs, setAdditionalBoardSlugs] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // EPIC-079-PHASE-4: "게시될 페이지 선택" — write와 동일한 공용 훅. 초기값은
  // URL의 boardSlug(=지금 글이 속한 게시판)이고, 사용자가 다른 게시판을
  // 고르면 저장 시 그 게시판으로 옮겨진다(handleSubmit의 targetBoardSlug).
  const {
    boards: boardOptions,
    branches: boardBranches,
    boardBranchMap,
    loading: boardsLoading,
  } = useBoardOptions(session);
  const [selectedBoardSlug, setSelectedBoardSlug] = useState(boardSlug);
  const { boardType, boardCategory, renderType } = useSelectedBoardTypeAndCategory(selectedBoardSlug);
  const definition = boardType
    ? resolveBoardDefinition({ board_type: boardType, category: boardCategory })
    : null;

  useEffect(() => {
    setSelectedBoardSlug(boardSlug);
  }, [boardSlug]);

  useEffect(() => {
    if (memberLoading) return;

    fetch(`/api/boards/${boardSlug}/posts/${postSlug}`, {
      headers: session ? { Authorization: `Bearer ${session.access_token}` } : {},
    })
      .then((res) => res.json())
      .then((data) => {
        if (!data.post) {
          setLoadingPost(false);
          return;
        }
        // 관리자는 본인 글이 아니어도 수정할 수 있다(PATCH API도 동일하게
        // 허용) — 이전에는 client-side 게이트가 이 예외를 놓쳐 실제 admin도
        // 여기서 막혔었다.
        if (!member || (data.post.author_id !== member.id && !member.is_admin)) {
          setNotAllowed(true);
          setLoadingPost(false);
          return;
        }
        // AuthProvider의 session/member 로딩 타이밍에 따라 이 effect가
        // member=null인 상태로 먼저 한 번 돌아 notAllowed=true를 남겼다가,
        // member가 뒤늦게 채워져 다시 성공적으로 돌 수 있다(AuthProvider.tsx
        // 수정으로 이 레이스 자체는 줄였지만, 남아있는 재실행 케이스에서도
        // notAllowed가 true로 고정된 채 남지 않도록 성공 경로에서 명시적으로
        // 되돌린다 — render가 notAllowed를 post 유무보다 먼저 체크하므로.
        setNotAllowed(false);
        setPost(data.post);
        setAdditionalBoardSlugs(data.post.additionalBoardSlugs ?? []);
        // EPIC-079-PHASE-4: URL의 boardSlug가 실제로는 slug가 아니라
        // board.id인 낡은 링크가 일부 남아있다(slug 라우팅 전환 이전에
        // 만들어진 글 — fetchBoard.ts의 id 폴백으로 여전히 조회는 되지만,
        // "게시될 페이지 선택" 드롭다운의 옵션 value는 항상 slug 우선
        // (b.slug ?? b.id)이라 그 경우 초기 선택값이 어느 옵션과도 안
        // 맞는다). 응답으로 온 진짜 board.slug로 한 번 보정한다.
        setSelectedBoardSlug(data.board?.slug ?? boardSlug);
        setLoadingPost(false);
      });
  }, [boardSlug, postSlug, session, member, memberLoading]);

  useEffect(() => {
    fetch(`/api/boards/${selectedBoardSlug}/posts?pageSize=1`)
      .then((res) => res.json())
      .then((data) => setExistingTags(data.availableTags ?? []))
      .catch(() => {});
  }, [selectedBoardSlug]);

  async function handleSubmit(payload: PostFormSubmitPayload) {
    setError(null);
    setSubmitting(true);

    const res = await fetch(`/api/boards/${boardSlug}/posts/${postSlug}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        ...(session ? { Authorization: `Bearer ${session.access_token}` } : {}),
      },
      body: JSON.stringify({
        // HOTFIX-091: 이 글의 진짜 PK — 서버가 이걸로 우선 조회하면 그
        // 사이 board_id가 바뀌었어도(더블클릭/뒤로가기 재제출 등) 항상
        // 정확히 이 글을 찾는다(URL의 board_slug가 stale해도 무관).
        postId: post?.id,
        title: payload.title,
        bodyJson: payload.bodyJson,
        bodyHtml: payload.bodyHtml,
        featuredImageUrl: payload.featuredImageUrl,
        featuredImagePath: payload.featuredImagePath,
        thumbnailVisible: payload.thumbnailVisible,
        category: payload.category,
        isDocentPost: payload.isDocentPost,
        tags: payload.tags,
        targetBoardSlug: selectedBoardSlug,
        ...(payload.createdAt ? { createdAt: payload.createdAt } : {}),
        // HOTFIX-099(사용자 지시): 관리자가 작성자를 바꿨을 때만 실려온다.
        ...(payload.authorId ? { authorId: payload.authorId } : {}),
        ...(renderType === "timeline_ng"
          ? {
              timelineYear: payload.timelineYear,
              timelineEndYear: payload.timelineEndYear,
              timelineDisplayDate: payload.timelineDisplayDate,
            }
          : {}),
        additionalBoardSlugs,
      }),
    });

    const data = await res.json();
    setSubmitting(false);

    if (!res.ok) {
      // EPIC-092 후속: 서버는 detail(실제 DB 에러 메시지)도 함께 내려주는데
      // 지금까지 화면엔 안내 문구(data.error)만 보여줘 "왜" 실패했는지
      // 알 수 없었다 — 관리자가 원인을 바로 파악할 수 있도록 detail이 있으면
      // 이어 붙인다(사용자 요청, 예전에 실패 사유를 오류 메시지에 표시하라는
      // 지시가 있었음).
      setError(data.detail ? `${data.error} (${data.detail})` : data.error);
      return;
    }

    // EPIC-089: 다른 게시판으로 옮기면서 slug 충돌로 서버가 slug를 새로
    // 발급했을 수 있다(예: "-2" 접미사) — 그 경우 원래 postSlug로 이동하면
    // 404가 난다. 서버가 실제로 저장한 data.slug가 있으면 그걸 우선한다.
    const finalSlug = (data.slug as string | undefined) ?? postSlug;
    router.push(`/boards/${selectedBoardSlug}/${finalSlug}`);
  }

  async function handleDelete() {
    if (!window.confirm("이 글을 삭제할까요? 되돌릴 수 없어요.")) return;

    setDeleting(true);
    const res = await fetch(`/api/boards/${boardSlug}/posts/${postSlug}`, {
      method: "DELETE",
      headers: session ? { Authorization: `Bearer ${session.access_token}` } : {},
    });

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "삭제에 실패했어요.");
      setDeleting(false);
      return;
    }

    router.push(`/boards/${boardSlug}`);
  }

  if (loadingPost || memberLoading) {
    return <main className="flex-1 p-8 bg-white">불러오는 중...</main>;
  }

  if (notAllowed) {
    return (
      <main className="flex-1 bg-white p-8 max-w-2xl mx-auto w-full">
        <p className="text-red-600">본인이 작성한 글만 수정할 수 있어요.</p>
      </main>
    );
  }

  if (!post) {
    return (
      <main className="flex-1 bg-white p-8 max-w-2xl mx-auto w-full">
        <p className="text-red-600">게시글을 찾을 수 없어요.</p>
      </main>
    );
  }

  return (
    <main className="flex-1 bg-white p-8 max-w-2xl mx-auto w-full">
      <h1 className="font-serif text-2xl font-bold mb-6">글 수정</h1>

      <div className="mb-4">
        <label className="block text-sm mb-1">게시될 페이지 선택</label>
        <CategoryBoardPicker
          branches={boardBranches}
          boardBranchMap={boardBranchMap}
          boards={boardOptions}
          loading={boardsLoading}
          value={selectedBoardSlug}
          onChange={setSelectedBoardSlug}
        />
      </div>

      {/* HOTFIX-093-B(요구사항 1.2): 주 게시판 외에 추가로 노출할 게시판. */}
      {boardOptions.length > 0 && (
        <details className="mb-6 rounded-md border border-gray-200 p-3">
          <summary className="cursor-pointer text-sm font-medium text-gray-700">
            추가로 노출할 게시판 선택{additionalBoardSlugs.length > 0 ? ` (${additionalBoardSlugs.length})` : ""}
          </summary>
          <div className="mt-3 grid max-h-56 grid-cols-2 gap-x-4 gap-y-1 overflow-y-auto sm:grid-cols-3">
            {/* HOTFIX-101(사용자 지시): "사이트 구성 관리 → 사이트 메뉴"와
                동일한 순서로 정렬 — 카테고리 문자열 가나다순(HOTFIX-099)이
                아니라 실제 site_navigations 트리 순서/깊이를 그대로 쓴다. */}
            {buildAdminTree(
              boardOptions.filter((b) => b.slug && b.slug !== selectedBoardSlug),
              (b) => boardBranchMap.get(b.id) ?? null,
              boardBranches,
              "all",
            ).map((row) =>
              row.kind === "branch" ? (
                <p
                  key={`branch-${row.id}`}
                  className="col-span-full mt-2 text-xs font-medium text-gray-400 first:mt-0"
                  style={{ paddingLeft: row.depth * 8 }}
                >
                  {row.title}
                </p>
              ) : (
                <label key={row.item.id} className="flex items-center gap-1.5 text-sm text-gray-600">
                  <input
                    type="checkbox"
                    checked={additionalBoardSlugs.includes(row.item.slug as string)}
                    onChange={(e) => {
                      const slug = row.item.slug as string;
                      setAdditionalBoardSlugs((prev) =>
                        e.target.checked ? [...prev, slug] : prev.filter((s) => s !== slug),
                      );
                    }}
                  />
                  {row.item.name}
                </label>
              ),
            )}
          </div>
        </details>
      )}

      <PostForm
        mode="edit"
        boardId={selectedBoardSlug}
        boardType={boardType}
        showTags={Boolean(definition?.tags)}
        existingTags={existingTags}
        initialTitle={post.title}
        initialBodyJson={post.body_json}
        initialLegacyHtml={post.body_json ? undefined : post.body}
        initialTags={post.tags ?? []}
        initialIsDocentPost={post.is_docent_post}
        initialFeaturedImageUrl={post.featured_image_url}
        initialFeaturedImagePath={post.featured_image_path}
        initialThumbnailVisible={post.thumbnail_visible ?? true}
        initialCategory={post.category}
        initialCreatedAt={post.created_at}
        initialAuthorName={post.author_name}
        showTimelineDateFields={renderType === "timeline_ng"}
        initialTimelineYear={post.timeline_year}
        initialTimelineEndYear={post.timeline_end_year}
        initialTimelineDisplayDate={post.timeline_display_date}
        draftStorageKey={`draft-edit-${postSlug}`}
        submitLabel="수정 완료"
        onSubmit={handleSubmit}
        submitting={submitting}
        error={error}
      />

      <div className="mt-8 pt-6 border-t border-gray-100">
        <button
          type="button"
          onClick={handleDelete}
          disabled={deleting}
          className="text-sm text-red-600 hover:underline disabled:opacity-50"
        >
          {deleting ? "삭제 중..." : "글 삭제"}
        </button>
      </div>
    </main>
  );
}
