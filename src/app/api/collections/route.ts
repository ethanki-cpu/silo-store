import { NextRequest, NextResponse } from "next/server";
import { getRequestMember } from "@/lib/serverAuth";

// EPIC-095(요구사항 1.2): "내 컬렉션에 담기" 원클릭 버튼의 서버 파이프라인.
// member_collections(own-row RLS, docs/database-schema.sql)에 그대로
// insert할 뿐이지만, CollectionModal.tsx(마이페이지 수동 추가 폼)처럼
// 브라우저에서 직접 supabase.insert()하지 않고 API 라우트를 하나 두는 이유는
// 두 가지: (1) category 화이트리스트를 서버에서도 한 번 더 강제해 클라이언트
// 조작으로 8종 밖의 값이 들어가는 걸 막고, (2) Stage 2에서 JSON 블록 에디터가
// 들어오면 이 라우트 하나에 "특정 블록만 파싱해서 title/description/imageUrl을
// 추출" 같은 서버 쪽 로직을 얹을 자리를 미리 마련해둔다 — 지금은 클라이언트가
// 이미 골라낸 title/description/imageUrl을 그대로 신뢰해 저장하지만(블록 단위
// 스크랩이든 글 전체 스크랩이든 페이로드 모양이 동일하다), 나중에 body_json
// 특정 노드 id만 넘기는 방식으로 바뀌어도 이 계약(POST /api/collections)
// 자체는 그대로 유지된다.
const COLLECTION_CATEGORIES = [
  "book",
  "movie",
  "music",
  "artist",
  "place",
  "scent",
  "brand",
  "era",
] as const;
type CollectionCategory = (typeof COLLECTION_CATEGORIES)[number];

function isCollectionCategory(value: unknown): value is CollectionCategory {
  return (
    typeof value === "string" &&
    (COLLECTION_CATEGORIES as readonly string[]).includes(value)
  );
}

export async function POST(request: NextRequest) {
  const requester = await getRequestMember(request);
  if (!requester) {
    return NextResponse.json({ error: "로그인이 필요해요." }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const category = body?.category;
  const title = typeof body?.title === "string" ? body.title.trim() : "";
  // description/imageUrl은 글 전체 요약일 수도, 향후 블록 단위 스크랩의
  // 인용구 텍스트·단일 이미지 URL일 수도 있다 — 이 라우트는 어느 쪽이든
  // 구분하지 않고 그대로 저장한다(호출부가 "무엇을 담을지"를 이미 결정해서 보낸다).
  const description =
    typeof body?.description === "string" && body.description.trim()
      ? body.description.trim()
      : null;
  const imageUrl =
    typeof body?.imageUrl === "string" && body.imageUrl.trim()
      ? body.imageUrl.trim()
      : null;

  if (!isCollectionCategory(category)) {
    return NextResponse.json(
      { error: `category는 ${COLLECTION_CATEGORIES.join("/")} 중 하나여야 해요.` },
      { status: 400 },
    );
  }
  if (!title) {
    return NextResponse.json({ error: "제목이 비어 있어요." }, { status: 400 });
  }

  const { data, error } = await requester.scopedClient
    .from("member_collections")
    .insert({
      member_id: requester.member.id,
      category,
      title,
      description,
      image_url: imageUrl,
    })
    .select("id")
    .single();

  if (error) {
    return NextResponse.json({ error: "내 컬렉션에 담지 못했어요." }, { status: 500 });
  }

  return NextResponse.json({ id: data.id, category });
}
