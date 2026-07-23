import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabaseClient";
import { getRequestMember } from "@/lib/serverAuth";

export async function GET() {
  const { data, error } = await supabase
    .from("downloads")
    .select("id, title, description, file_url, created_at")
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json(
      { error: "자료 목록을 불러오지 못했어요." },
      { status: 500 },
    );
  }

  return NextResponse.json(data ?? []);
}

export async function POST(request: NextRequest) {
  const requester = await getRequestMember(request);
  if (!requester) {
    return NextResponse.json({ error: "로그인이 필요해요." }, { status: 401 });
  }

  if (!requester.member.is_admin) {
    return NextResponse.json(
      { error: "관리자만 업로드할 수 있어요." },
      { status: 403 },
    );
  }

  const body = await request.json();
  const title = body?.title as string | undefined;
  const description = body?.description as string | undefined;
  const fileUrl = body?.fileUrl as string | undefined;

  if (!title || !fileUrl) {
    return NextResponse.json(
      { error: "제목과 파일 URL은 필수예요." },
      { status: 400 },
    );
  }

  const { data, error } = await requester.scopedClient
    .from("downloads")
    .insert({
      title,
      description: description || null,
      file_url: fileUrl,
      uploaded_by: requester.member.id,
    })
    .select()
    .single();

  if (error || !data) {
    return NextResponse.json(
      { error: "업로드에 실패했어요.", detail: error?.message },
      { status: 500 },
    );
  }

  return NextResponse.json(data);
}
