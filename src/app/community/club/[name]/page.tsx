import { UniversalBoard } from "@/components/shared/UniversalBoard";

export default async function ClubCommunityPage({
  params,
}: {
  params: Promise<{ name: string }>;
}) {
  const { name } = await params;
  const displayName = decodeURIComponent(name);

  return <UniversalBoard title={`${displayName} 게시판`} />;
}
