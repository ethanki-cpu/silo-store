import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabaseClient";

export async function GET() {
  const { error } = await supabase
    .from("__connection_test__")
    .select("*")
    .limit(1);

  if (!error) {
    return NextResponse.json({
      status: "success",
      message: "Supabase에 연결됐고, 해당 테이블도 존재합니다.",
    });
  }

  const isMissingTable =
    error.code === "42P01" ||
    error.code === "PGRST205" ||
    error.message.includes("schema cache");

  if (isMissingTable) {
    return NextResponse.json({
      status: "success",
      message:
        "Supabase 연결 성공! (테이블이 없다는 정상적인 오류가 반환됐어요 — URL과 키가 올바르다는 뜻입니다.)",
    });
  }

  return NextResponse.json(
    {
      status: "error",
      message: "Supabase 연결 실패. URL/키를 다시 확인해주세요.",
      detail: error.message,
    },
    { status: 500 },
  );
}
