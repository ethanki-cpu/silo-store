import Link from "next/link";

// EPIC-160: 무료(Silo Angel) → 유료 전환 장치. 등급 때문에 읽기/쓰기가 막혔다는 서버 메시지(등급·패트론·멤버십 언급)에는
// 그냥 오류만 보여주지 말고 멤버십 가입 안내로 바로 갈 수 있는 링크를 붙인다.
export function isTierBlockMessage(message: string | null | undefined): boolean {
  return !!message && /등급|패트론|멤버십|Alice|Great Gatsby|Patron|Lautrec/.test(message);
}

export function UpgradeHint({ message }: { message: string | null | undefined }) {
  if (!isTierBlockMessage(message)) return null;
  return (
    <Link href="/membership" className="mt-2 inline-block rounded-md border border-gray-800 px-3 py-1.5 text-sm text-gray-800 hover:bg-gray-800 hover:text-white">
      멤버십 가입 안내 보기 →
    </Link>
  );
}
